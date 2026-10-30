import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM usuario WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function buscarPorCorreo(correo) {
	const { rows } = await pool.query('SELECT * FROM usuario WHERE "correo" = $1', [correo]);
	return rows[0] ?? null;
}

/** Serializa las operaciones que dependen de las tarjetas activas del titular. */
export async function bloquear(id, conexion) {
	await conexion.query('SELECT 1 FROM usuario WHERE "id" = $1 FOR UPDATE', [id]);
}

export async function insertar(fila, conexion = pool) {
	const { rows } = await conexion.query(
		`INSERT INTO usuario ("correo", "contraseña", "preguntaSeguridad", "respuestaSeguridad")
		VALUES ($1, $2, $3, $4) RETURNING "id"`,
		[fila.correo, fila.contraseña, fila.preguntaSeguridad ?? null, fila.respuestaSeguridad ?? null],
	);
	return rows[0].id;
}

export async function actualizarCorreo(id, correo, conexion = pool) {
	await conexion.query('UPDATE usuario SET "correo" = $2 WHERE "id" = $1', [id, correo]);
}

export async function actualizarEstado(id, estado) {
	await pool.query('UPDATE usuario SET "estado" = $2 WHERE "id" = $1', [id, estado]);
}

export async function actualizarContraseña(id, contraseña) {
	await pool.query('UPDATE usuario SET "contraseña" = $2 WHERE "id" = $1', [id, contraseña]);
}
