import { enTransaccion } from '../../config/baseDeDatos.js';
import * as ChequeGateway from '../../datos/gateways/ChequeGateway.js';
import * as CierreMensualGateway from '../../datos/gateways/CierreMensualGateway.js';
import * as ComisionGateway from '../../datos/gateways/ComisionGateway.js';
import * as DistribuidorGateway from '../../datos/gateways/DistribuidorGateway.js';
import * as DominioGateway from '../../datos/gateways/DominioGateway.js';
import * as FacturaGateway from '../../datos/gateways/FacturaGateway.js';
import { Cheque } from '../../dominio/facturacion/Cheque.js';
import { CierreMensual } from '../../dominio/facturacion/CierreMensual.js';
import { Comisión } from '../../dominio/facturacion/Comision.js';
import { formatearFecha } from '../../dominio/facturacion/Factura.js';
import { Distribuidor } from '../../dominio/usuarios/Distribuidor.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { exigirPeríodo, FORMATO_UUID } from './ServicioDeFacturacion.js';

const VIOLACION_DE_UNICIDAD = '23505';

/** UC12, pasos 2 y 3: un mes solo se cierra cuando ya terminó. */
function exigirMesTerminado(período) {
	if (período >= formatearFecha(new Date()).slice(0, 7)) {
		throw new ErrorDeServicio(400, 'El periodo aún no ha terminado', 'período');
	}
}

/** Cada distribuidor va en su transacción: lo ya procesado se conserva si el lote se interrumpe (UC12 A2). */
async function procesarDistribuidor(fila, cierreId, período) {
	const distribuidor = new Distribuidor({
		...fila,
		numeroDominiosGestionados: await DominioGateway.contarPorDistribuidor(fila.id),
	});
	const montoFacturado = await FacturaGateway.sumarMontoDelMes(fila.id, período);
	const cierre = new CierreMensual({ período, pendientes: [{ distribuidor, montoFacturado }] });
	cierre.ejecutar();
	const [comisión] = cierre.comisiones;
	const { cheque } = comisión;

	const chequeId = await enTransaccion(async (conexion) => {
		await DistribuidorGateway.actualizarCategoria(
			{ id: fila.id, categoría: distribuidor.categoría, comisiónAplicable: distribuidor.comisiónAplicable },
			conexion,
		);
		const comisionId = await ComisionGateway.insertar(
			{
				cierreMensualId: cierreId,
				distribuidorId: fila.id,
				monto: comisión.monto,
				porcentajeAplicado: comisión.porcentajeAplicado,
				período,
			},
			conexion,
		);
		return ChequeGateway.insertar(
			{ comisionId, número: cheque.número, monto: cheque.monto, fechaGeneración: cheque.fechaGeneración },
			conexion,
		);
	});

	return {
		distribuidorId: fila.id,
		razónSocial: fila.razónSocial,
		categoría: distribuidor.categoría,
		comisión: comisión.monto,
		chequeId,
		aviso: distribuidor.avisoDeCategoría,
		sinFacturación: montoFacturado === 0,
	};
}

/** UC12. */
export async function ejecutarCierre(datos) {
	const período = exigirPeríodo(datos.período);
	exigirMesTerminado(período);

	const cierre = await CierreMensualGateway.obtenerOCrear(período);
	if (cierre.fechaEjecución) throw new ErrorDeServicio(409, 'El mes ya está cerrado', 'período');

	const resultados = [];
	for (const fila of await DistribuidorGateway.listarActivosSinComision(período)) {
		try {
			resultados.push(await procesarDistribuidor(fila, cierre.id, período));
		} catch (error) {
			if (error.code !== VIOLACION_DE_UNICIDAD) throw error;
			throw new ErrorDeServicio(409, 'El cierre de este mes ya está en curso', 'período');
		}
	}
	await CierreMensualGateway.marcarCompletado(cierre.id, formatearFecha(new Date()));

	return {
		período,
		distribuidoresProcesados: resultados.length,
		chequesGenerados: resultados.length,
		cambiosDeCategoría: resultados.filter((resultado) => resultado.aviso !== null).length,
		resultados,
	};
}

/** UC15, paso 5. */
export async function exportarCheque(id) {
	const fila = FORMATO_UUID.test(id) ? await ChequeGateway.obtenerParaExportar(id) : null;
	if (!fila) throw new ErrorDeServicio(404, 'El cheque no existe');
	const comisión = new Comisión({
		distribuidor: new Distribuidor({ razónSocial: fila.razónSocial }),
		período: fila.período,
	});
	const cheque = new Cheque({ ...fila, comisión });
	return { número: cheque.número, contenido: await cheque.exportarPDF() };
}
