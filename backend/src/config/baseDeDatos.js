import pg from 'pg';
import { entorno } from './entorno.js';

export const pool = new pg.Pool({ connectionString: entorno.urlBaseDeDatos });

export async function enTransaccion(trabajo) {
	const conexion = await pool.connect();
	try {
		await conexion.query('BEGIN');
		const resultado = await trabajo(conexion);
		await conexion.query('COMMIT');
		return resultado;
	} catch (error) {
		await conexion.query('ROLLBACK');
		throw error;
	} finally {
		conexion.release();
	}
}
