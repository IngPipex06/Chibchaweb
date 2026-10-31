import { pool } from '../../config/baseDeDatos.js';

export async function insertar(fila, conexion = pool) {
	const { rows } = await conexion.query(
		'INSERT INTO dominio ("nombre", "clienteId") VALUES ($1, $2) RETURNING "id"',
		[fila.nombre, fila.clienteId],
	);
	return rows[0].id;
}

export async function listarPorTitular(titularId) {
	const { rows } = await pool.query(
		'SELECT "id", "nombre" FROM dominio WHERE "clienteId" = $1 OR "distribuidorId" = $1 ORDER BY "nombre"',
		[titularId],
	);
	return rows;
}

export async function pertenece(id, titularId) {
	const { rowCount } = await pool.query(
		'SELECT 1 FROM dominio WHERE "id" = $1 AND ("clienteId" = $2 OR "distribuidorId" = $2)',
		[id, titularId],
	);
	return rowCount > 0;
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
