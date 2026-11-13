import { pool } from '../../config/baseDeDatos.js';

export async function listarPorRol(rolId) {
	const { rows } = await pool.query('SELECT * FROM permiso WHERE "rolId" = $1', [rolId]);
	return rows;
}
