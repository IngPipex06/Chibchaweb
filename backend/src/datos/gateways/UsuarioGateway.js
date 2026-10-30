import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM usuario WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function buscarPorCorreo(correo) {
	const { rows } = await pool.query('SELECT * FROM usuario WHERE "correo" = $1', [correo]);
	return rows[0] ?? null;
}

export async function insertar(fila, conexion = pool) {
	const { rows } = await conexion.query(
		`INSERT INTO usuario ("correo", "contraseña", "preguntaSeguridad", "respuestaSeguridad")
		VALUES ($1, $2, $3, $4) RETURNING "id"`,
		[fila.correo, fila.contraseña, fila.preguntaSeguridad ?? null, fila.respuestaSeguridad ?? null],
	);
	return rows[0].id;
}

export async function actualizarContraseña(id, contraseña) {
	await pool.query('UPDATE usuario SET "contraseña" = $2 WHERE "id" = $1', [id, contraseña]);
}
