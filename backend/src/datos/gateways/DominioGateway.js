import { pool } from '../../config/baseDeDatos.js';

export async function insertar(fila, conexion = pool) {
	const { rows } = await conexion.query(
		'INSERT INTO dominio ("nombre", "clienteId") VALUES ($1, $2) RETURNING "id"',
		[fila.nombre, fila.clienteId],
	);
	return rows[0].id;
}

export async function contarPorCliente(clienteId) {
	const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM dominio WHERE "clienteId" = $1', [clienteId]);
	return rows[0].total;
}

export async function contarPorDistribuidor(distribuidorId) {
	const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM dominio WHERE "distribuidorId" = $1', [
		distribuidorId,
	]);
	return rows[0].total;
}
