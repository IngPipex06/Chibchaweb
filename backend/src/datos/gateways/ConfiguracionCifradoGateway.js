import { pool } from '../../config/baseDeDatos.js';

export async function obtenerAlgoritmoActivo() {
	const { rows } = await pool.query('SELECT "algoritmoActivo" FROM configuracion_cifrado');
	return rows[0]?.algoritmoActivo ?? null;
}
