import { MESES_POR_PLAN, TARIFAS } from '../../config/tarifas.js';
import * as ClienteGateway from '../../datos/gateways/ClienteGateway.js';
import * as DistribuidorGateway from '../../datos/gateways/DistribuidorGateway.js';
import * as DominioGateway from '../../datos/gateways/DominioGateway.js';
import * as FacturaGateway from '../../datos/gateways/FacturaGateway.js';
import { Factura } from '../../dominio/facturacion/Factura.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';

export const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMATO_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

export function exigirPeríodo(valor) {
	if (typeof valor !== 'string' || !FORMATO_PERIODO.test(valor)) {
		throw new ErrorDeServicio(400, 'El periodo debe tener el formato AAAA-MM', 'período');
	}
	return valor;
}

/** UC11, pasos 3 y 4. El distribuidor no tiene plan: se le cobran sus dominios gestionados de un mes. */
async function recuperarCargos(titularId) {
	const cliente = await ClienteGateway.buscarPorId(titularId);
	if (cliente) {
		const dominios = await DominioGateway.contarPorCliente(titularId);
		return {
			hosting: TARIFAS.paqueteMensual[cliente.paqueteHosting] * MESES_POR_PLAN[cliente.planDePago],
			dominios: dominios * TARIFAS.dominio,
			servicios: TARIFAS.servicios,
		};
	}
	if (await DistribuidorGateway.buscarPorId(titularId)) {
		const dominios = await DominioGateway.contarPorDistribuidor(titularId);
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
	const cargos = await recuperarCargos(datos.titularId);
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
	const id = await FacturaGateway.insertar(fila);
	return { id, ...fila, cargos };
}
