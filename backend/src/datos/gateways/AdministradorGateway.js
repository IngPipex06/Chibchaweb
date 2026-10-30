import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM administrador WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function insertar(fila, conexion = pool) {
	await conexion.query('INSERT INTO administrador ("id", "rolId") VALUES ($1, $2)', [fila.id, fila.rolId]);
}
