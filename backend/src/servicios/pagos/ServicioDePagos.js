import PDFDocument from 'pdfkit';
import { enTransaccion } from '../../config/baseDeDatos.js';
import * as ComprobanteDePagoGateway from '../../datos/gateways/ComprobanteDePagoGateway.js';
import * as DominioGateway from '../../datos/gateways/DominioGateway.js';
import * as FacturaGateway from '../../datos/gateways/FacturaGateway.js';
import * as MedioDePagoGateway from '../../datos/gateways/MedioDePagoGateway.js';
import * as UsuarioGateway from '../../datos/gateways/UsuarioGateway.js';
import { EstadoFactura } from '../../dominio/facturacion/EstadoFactura.js';
import { Factura, formatearFecha } from '../../dominio/facturacion/Factura.js';
import { ComprobanteDePago } from '../../dominio/pagos/ComprobanteDePago.js';
import { EstadoComprobante } from '../../dominio/pagos/EstadoComprobante.js';
import { OrigenRespaldo } from '../../dominio/respaldo/OrigenRespaldo.js';
import { Distribuidor } from '../../dominio/usuarios/Distribuidor.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { crearTarjeta, validarTarjeta } from '../perfiles/ServicioDeMediosDePago.js';
import { persistir } from '../perfiles/ServicioDePerfiles.js';

/** UC16: la fachada solo ofrece las dos vías. */
const OPCIONES = Object.freeze(['Métodos de pago', 'Comprobantes']);

export function listarOpciones() {
	return OPCIONES;
}

function exigirMedio(medio) {
	if (!medio) throw new ErrorDeServicio(404, 'La tarjeta no existe');
	return medio;
}

/** UC17 paso 6. */
async function exigirNoRegistrada(fila, conexion, idPropio = null) {
	const activas = await MedioDePagoGateway.listarPorTitular(fila.titularId, conexion);
	const repetida = activas.some(
		(medio) =>
			medio.id !== idPropio &&
			medio.tipoTarjeta === fila.tipoTarjeta &&
			medio.numeroEnmascarado === fila.numeroEnmascarado &&
			medio.fechaExpiración === fila.fechaExpiración,
	);
	if (repetida) throw new ErrorDeServicio(409, 'La tarjeta ya está registrada en la cuenta', 'tarjeta');
}

/** El bloqueo del titular evita duplicados y que dos eliminaciones dejen la cuenta sin tarjeta. */
function guardarAlta({ fila }) {
	return enTransaccion(async (conexion) => {
		await UsuarioGateway.bloquear(fila.titularId, conexion);
		await exigirNoRegistrada(fila, conexion);
		return MedioDePagoGateway.insertar(fila, conexion);
	});
}

/** La fila anterior se conserva inactiva: los comprobantes ya emitidos no cambian de tarjeta. */
function guardarModificación({ id, fila }) {
	return enTransaccion(async (conexion) => {
		await UsuarioGateway.bloquear(fila.titularId, conexion);
		exigirMedio(await MedioDePagoGateway.obtenerActiva(id, fila.titularId, conexion));
		await exigirNoRegistrada(fila, conexion, id);
		await MedioDePagoGateway.inactivar(id, conexion);
		return MedioDePagoGateway.insertar(fila, conexion);
	});
}

function persistirMedio(guardar, datos) {
	return persistir({
		guardar,
		datos,
		origen: OrigenRespaldo.MedioDePago,
		campos: [],
		obtener: (id) => MedioDePagoGateway.obtenerActiva(id, datos.fila.titularId),
	});
}

export const listarMedios = (titularId) => MedioDePagoGateway.listarPorTitular(titularId);

export function agregarMedio(titularId, datos) {
	return persistirMedio(guardarAlta, { fila: { ...validarTarjeta(datos), titularId } });
}

export function modificarMedio(titularId, id, datos) {
	return persistirMedio(guardarModificación, { id, fila: { ...validarTarjeta(datos), titularId } });
}

/** El Cliente siempre tiene paquete contratado; el Distribuidor, si gestiona dominios. */
async function tieneServiciosVigentes(titular) {
	if (!(titular instanceof Distribuidor)) return true;
	return (await DominioGateway.contarPorDistribuidor(titular.id)) > 0;
}

/** UC17 A3: borrado lógico. */
export async function eliminarMedio(titular, id) {
	await enTransaccion(async (conexion) => {
		await UsuarioGateway.bloquear(titular.id, conexion);
		exigirMedio(await MedioDePagoGateway.obtenerActiva(id, titular.id, conexion));
		const activas = await MedioDePagoGateway.listarPorTitular(titular.id, conexion);
		if (activas.length === 1 && (await tieneServiciosVigentes(titular))) {
			throw new ErrorDeServicio(409, 'Debe registrar otro medio de pago antes de eliminar este', 'tarjeta');
		}
		await MedioDePagoGateway.inactivar(id, conexion);
	});
}

/** RT4: UC17 E2. Idempotente: reintentar la línea no duplica la tarjeta ni revive una eliminada. */
function aplicarMedio({ id, fila }) {
	return enTransaccion(async (conexion) => {
		await UsuarioGateway.bloquear(fila.titularId, conexion);
		if (id) {
			if (!(await MedioDePagoGateway.obtenerActiva(id, fila.titularId, conexion))) return;
			await MedioDePagoGateway.inactivar(id, conexion);
		}
		await MedioDePagoGateway.insertarSiNoExiste(fila, conexion);
	});
}

/** Se combinan en scripts/reconciliar.js: pagos depende de perfiles, no al revés. */
export const aplicadoresDeRespaldoDePagos = Object.freeze({
	[OrigenRespaldo.MedioDePago]: aplicarMedio,
});

async function cobrarFactura(id) {
	return enTransaccion(async (conexion) => {
		const fila = await FacturaGateway.bloquearPorCobrar(id, conexion);
		if (!fila) return null;
		const [medio] = await MedioDePagoGateway.listarPorTitular(fila.usuarioPagadorId, conexion);
		let resultado = 'sinMedioDePago';
		if (medio) {
			const comprobante = new ComprobanteDePago().procesarCobro(new Factura(fila), crearTarjeta(medio));
			await ComprobanteDePagoGateway.insertar(
				{
					facturaId: id,
					medioDePagoId: medio.id,
					monto: comprobante.monto,
					fecha: comprobante.fecha,
					estado: comprobante.estado,
				},
				conexion,
			);
			if (comprobante.estado === EstadoComprobante.Exitoso) {
				await FacturaGateway.actualizarEstado(id, EstadoFactura.Pagada, conexion);
				return 'exitosos';
			}
			resultado = 'fallidos';
		}
		const venció = fila.estado === EstadoFactura.Pendiente && fila.fechaVencimiento < formatearFecha(new Date());
		if (venció) await FacturaGateway.actualizarEstado(id, EstadoFactura.Vencida, conexion);
		return resultado;
	});
}

/** RF4: lo dispara el Administrador, como el cierre de UC12; el sistema recorre lo pendiente. */
export async function ejecutarCobros() {
	const resumen = { exitosos: 0, fallidos: 0, sinMedioDePago: 0 };
	for (const { id } of await FacturaGateway.listarPorCobrar()) {
		const resultado = await cobrarFactura(id);
		if (resultado) resumen[resultado] += 1;
	}
	return resumen;
}

export const listarComprobantes = (titularId) => ComprobanteDePagoGateway.listarPorTitular(titularId);

export async function obtenerComprobante(titularId, id) {
	const comprobante = await ComprobanteDePagoGateway.obtener(id, titularId);
	if (!comprobante) throw new ErrorDeServicio(404, 'El comprobante no existe');
	return comprobante;
}

function generarRecibo(comprobante) {
	return new Promise((resolver, rechazar) => {
		const documento = new PDFDocument();
		const partes = [];
		documento.on('data', (parte) => partes.push(parte));
		documento.on('end', () => resolver(Buffer.concat(partes)));
		documento.on('error', rechazar);

		documento.fontSize(18).text('ChibchaWeb: comprobante de pago');
		documento.moveDown().fontSize(12);
		documento.text(`Factura: ${comprobante.factura}`);
		documento.text(`Periodo: ${comprobante.período}`);
		documento.text(`Monto: ${comprobante.monto}`);
		documento.text(`Fecha: ${comprobante.fecha}`);
		documento.text(`Tarjeta: ${comprobante.tipoTarjeta} ${comprobante.numeroEnmascarado}`);
		documento.end();
	});
}

/** UC18: solo las transacciones aprobadas tienen recibo. */
export async function exportarComprobante(titularId, id) {
	const comprobante = await obtenerComprobante(titularId, id);
	if (comprobante.estado !== EstadoComprobante.Exitoso) {
		throw new ErrorDeServicio(409, 'Solo los cobros aprobados tienen comprobante');
	}
	return { factura: comprobante.factura, contenido: await generarRecibo(comprobante) };
}
