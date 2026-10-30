import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM empleado WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function insertar(fila, conexion = pool) {
	await conexion.query(
		'INSERT INTO empleado ("id", "nombreCompleto", "documento") VALUES ($1, $2, $3)',
		[fila.id, fila.nombreCompleto, fila.documento],
	);
}
