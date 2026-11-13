import { MESES_POR_PLAN, TARIFAS } from '../../config/tarifas.js';
import * as ClienteGateway from '../../datos/gateways/ClienteGateway.js';
import * as DistribuidorGateway from '../../datos/gateways/DistribuidorGateway.js';
import * as DominioGateway from '../../datos/gateways/DominioGateway.js';
import * as FacturaGateway from '../../datos/gateways/FacturaGateway.js';
import * as UsuarioGateway from '../../datos/gateways/UsuarioGateway.js';
import { Factura } from '../../dominio/facturacion/Factura.js';
import { EstadoUsuario } from '../../dominio/usuarios/EstadoUsuario.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { traducirDuplicado } from '../usuarios/ServicioDeUsuarios.js';
import { FORMATO_UUID } from '../usuarios/validacion.js';

const FORMATO_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

export function exigirPeríodo(valor) {
	if (typeof valor !== 'string' || !FORMATO_PERIODO.test(valor)) {
		throw new ErrorDeServicio(400, 'El periodo debe tener el formato AAAA-MM', 'período');
	}
	return valor;
}

/** UC11, pasos 3 y 4. El distribuidor no tiene plan: se le cobran sus dominios gestionados de un mes. */
async function recuperarCargos(titularId, período) {
	const cliente = await ClienteGateway.buscarPorId(titularId);
	if (cliente) {
		const dominios = await DominioGateway.contarPorClienteAlPeríodo(titularId, período);
		return {
			hosting: TARIFAS.paqueteMensual[cliente.paqueteHosting] * MESES_POR_PLAN[cliente.planDePago],
			dominios: dominios * TARIFAS.dominio,
			servicios: TARIFAS.servicios,
		};
	}
	if (await DistribuidorGateway.buscarPorId(titularId)) {
		const dominios = await DominioGateway.contarPorDistribuidorAlPeríodo(titularId, período);
		return { hosting: 0, dominios: dominios * TARIFAS.dominio, servicios: TARIFAS.servicios };
	}
	throw new ErrorDeServicio(404, 'El titular no existe');
}

/** UC11. */
export async function generarFactura(datos) {
	if (typeof datos.titularId !== 'string' || !FORMATO_UUID.test(datos.titularId)) {
		throw new ErrorDeServicio(404, 'El titular no existe');
	}
	const período = exigirPeríodo(datos.período);
	const cargos = await recuperarCargos(datos.titularId, período);
	const usuario = await UsuarioGateway.buscarPorId(datos.titularId);
	if (usuario.estado !== EstadoUsuario.Activo) {
		throw new ErrorDeServicio(409, 'El titular está inhabilitado', 'titularId');
	}
	if (await FacturaGateway.existeDelPeríodo(datos.titularId, período)) {
		throw new ErrorDeServicio(409, 'El titular ya tiene una factura de ese periodo', 'período');
	}
	const factura = new Factura({
		número: await FacturaGateway.siguienteNumero(),
		pagador: datos.titularId,
		período,
		monto: cargos.hosting + cargos.dominios + cargos.servicios,
	});
	factura.emitir();

	const fila = {
		usuarioPagadorId: factura.pagador,
		número: factura.número,
		fechaEmisión: factura.fechaEmisión,
		fechaVencimiento: factura.fechaVencimiento,
		período: factura.período,
		monto: factura.monto,
		estado: factura.estado,
	};
	try {
		const id = await FacturaGateway.insertar(fila);
		return { id, ...fila, cargos };
	} catch (error) {
		throw traducirDuplicado(error, ['período']);
	}
}
