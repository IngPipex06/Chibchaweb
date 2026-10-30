import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM tecnico_de_soporte WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}
