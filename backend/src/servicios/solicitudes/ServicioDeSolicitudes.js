import { enTransaccion } from '../../config/baseDeDatos.js';
import * as DominioGateway from '../../datos/gateways/DominioGateway.js';
import * as SolicitudDeDominioGateway from '../../datos/gateways/SolicitudDeDominioGateway.js';
import { formatearFecha } from '../../dominio/facturacion/Factura.js';
import { ArchivoXML } from '../../dominio/solicitudes/ArchivoXML.js';
import { EstadoSolicitudDominio } from '../../dominio/solicitudes/EstadoSolicitudDominio.js';
import { SolicitudDeDominio } from '../../dominio/solicitudes/SolicitudDeDominio.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { traducirDuplicado } from '../usuarios/ServicioDeUsuarios.js';
import { exigirTexto } from '../usuarios/validacion.js';

const CAMPO_DOMINIO = 'nombreDominioSolicitado';
const FORMATO_DOMINIO = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const DECLARACIÓN_XML = '<?xml version="1.0" encoding="UTF-8"?>\n';

function exigirDominio(valor) {
	const nombre = exigirTexto(valor, CAMPO_DOMINIO).toLowerCase();
	if (!FORMATO_DOMINIO.test(nombre)) {
		throw new ErrorDeServicio(400, 'El dominio no tiene un formato válido', CAMPO_DOMINIO);
	}
	return nombre;
}

export const listarSolicitudes = (clienteId) => SolicitudDeDominioGateway.listarPorCliente(clienteId);

export async function obtenerSolicitud(clienteId, id) {
	const solicitud = await SolicitudDeDominioGateway.obtener(id, clienteId);
	if (!solicitud) throw new ErrorDeServicio(404, 'La solicitud no existe');
	return solicitud;
}

/** UC19 con UC20 incluido: el XML lleva el id, así que se genera sobre la solicitud ya guardada. */
export async function solicitarDominio(cliente, datos) {
	const nombreDominioSolicitado = exigirDominio(datos.nombreDominioSolicitado);
	const fechaSolicitud = formatearFecha(new Date());
	const id = await enTransaccion(async (conexion) => {
		const id = await SolicitudDeDominioGateway.insertar(
			{ clienteId: cliente.id, nombreDominioSolicitado, fechaSolicitud },
			conexion,
		);
		const solicitud = new SolicitudDeDominio({ id, cliente, nombreDominioSolicitado, fechaSolicitud });
		await SolicitudDeDominioGateway.guardarXML(id, solicitud.generarXML(), conexion);
		return id;
	});
	return obtenerSolicitud(cliente.id, id);
}

/** UC20: PostgreSQL no conserva la declaración al guardar en una columna XML. */
export async function exportarXML(clienteId, id) {
	const fila = await SolicitudDeDominioGateway.obtenerXML(id, clienteId);
	if (!fila) throw new ErrorDeServicio(404, 'La solicitud no existe');
	const { contenidoXml } = fila;
	return {
		nombre: fila.nombreDominioSolicitado,
		contenido: contenidoXml.startsWith('<?xml') ? contenidoXml : DECLARACIÓN_XML + contenidoXml,
	};
}

async function registrarEnvío(clienteId, id) {
	return enTransaccion(async (conexion) => {
		const fila = await SolicitudDeDominioGateway.bloquear(id, clienteId, conexion);
		if (!fila) throw new ErrorDeServicio(404, 'La solicitud no existe');
		if (fila.estado !== EstadoSolicitudDominio.Generada) {
			throw new ErrorDeServicio(409, 'La solicitud ya fue enviada');
		}
		const solicitud = new SolicitudDeDominio({
			estado: fila.estado,
			archivoXML: new ArchivoXML({ contenido: fila.contenidoXml, formatoVersión: fila.formatoVersionXml }),
		});
		solicitud.simularEnvío();
		if (solicitud.estado !== EstadoSolicitudDominio.Enviada) {
			throw new ErrorDeServicio(502, 'El registrador no confirmó la solicitud');
		}
		const dominioId = await DominioGateway.insertar({ nombre: fila.nombreDominioSolicitado, clienteId }, conexion);
		await SolicitudDeDominioGateway.marcarEnviada(id, solicitud.estado, dominioId, conexion);
	});
}

/** UC21: al confirmar el registrador nace el Dominio, a nombre del cliente. */
export async function enviarSolicitud(clienteId, id) {
	try {
		await registrarEnvío(clienteId, id);
	} catch (error) {
		throw traducirDuplicado(error, ['nombre']);
	}
	return { ...(await obtenerSolicitud(clienteId, id)), mensaje: 'Registrador simulado: solicitud recibida' };
}
