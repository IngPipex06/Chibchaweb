import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM tecnico_de_soporte WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function insertar(fila, conexion = pool) {
	await conexion.query('INSERT INTO tecnico_de_soporte ("id", "nivelDeServicio") VALUES ($1, $2)', [
		fila.id,
		fila.nivelDeServicio,
	]);
}

export async function actualizarNivel(id, nivelDeServicio, conexion = pool) {
	await conexion.query('UPDATE tecnico_de_soporte SET "nivelDeServicio" = $2 WHERE "id" = $1', [
		id,
		nivelDeServicio,
	]);
}
