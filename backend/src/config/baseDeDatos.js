import pg from 'pg';
import { entorno } from './entorno.js';

export const pool = new pg.Pool({ connectionString: entorno.urlBaseDeDatos });

const CODIGOS_DE_CAIDA = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE', '57P01', '57P02', '57P03']);

/** RT4: distingue una base caída de un error de datos. La clase 08 de PostgreSQL es de conexión. */
export function esCaidaDeBase(error) {
	const codigo = String(error?.code ?? '');
	return (
		CODIGOS_DE_CAIDA.has(codigo) ||
		codigo.startsWith('08') ||
		/Connection terminated|not queryable/i.test(error?.message ?? '')
	);
}

// Sin estos oyentes, perder la conexión con la base tumbaría el proceso.
pool.on('error', (error) => console.error('Conexión inactiva perdida:', error.message));

export async function enTransaccion(trabajo) {
	const conexion = await pool.connect();
	const ignorarErrorDeConexion = () => {};
	conexion.on('error', ignorarErrorDeConexion);
	try {
		await conexion.query('BEGIN');
		const resultado = await trabajo(conexion);
		await conexion.query('COMMIT');
		return resultado;
	} catch (error) {
		await conexion.query('ROLLBACK').catch(() => {});
		throw error;
	} finally {
		conexion.removeListener('error', ignorarErrorDeConexion);
		conexion.release();
	}
}
