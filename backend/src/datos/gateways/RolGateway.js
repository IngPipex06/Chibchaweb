import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM rol WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function buscarPorNombre(nombre) {
	const { rows } = await pool.query('SELECT * FROM rol WHERE "nombre" = $1', [nombre]);
	return rows[0] ?? null;
}
