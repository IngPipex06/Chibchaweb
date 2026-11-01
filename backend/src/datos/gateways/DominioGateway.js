import { pool } from '../../config/baseDeDatos.js';

export async function insertar(fila, conexion = pool) {
	const { rows } = await conexion.query(
		'INSERT INTO dominio ("nombre", "clienteId") VALUES ($1, $2) RETURNING "id"',
		[fila.nombre, fila.clienteId],
	);
	return rows[0].id;
}

export async function buscarPorNombre(nombre) {
	const { rows } = await pool.query('SELECT "id", "nombre" FROM dominio WHERE "nombre" = $1', [nombre]);
	return rows[0] ?? null;
}

export async function asignarDistribuidor(id, distribuidorId) {
	const { rowCount } = await pool.query(
		'UPDATE dominio SET "distribuidorId" = $2, "fechaAsignación" = CURRENT_DATE WHERE "id" = $1 AND "distribuidorId" IS NULL',
		[id, distribuidorId],
	);
	return rowCount > 0;
}

export async function quitarDistribuidor(nombre, distribuidorId) {
	await pool.query(
		'UPDATE dominio SET "distribuidorId" = NULL, "fechaAsignación" = NULL WHERE "nombre" = $1 AND "distribuidorId" = $2',
		[nombre, distribuidorId],
	);
}

export async function listarNombresRegistrados(nombres) {
	const { rows } = await pool.query('SELECT "nombre" FROM dominio WHERE "nombre" = ANY($1)', [nombres]);
	return rows.map((fila) => fila.nombre);
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

/** UC11: dominios del cliente registrados hasta el fin del periodo `AAAA-MM`. */
export async function contarPorClienteAlPeríodo(clienteId, período) {
	const { rows } = await pool.query(
		`SELECT COUNT(*)::int AS total FROM dominio
		WHERE "clienteId" = $1 AND "fechaRegistro" < to_date($2, 'YYYY-MM') + INTERVAL '1 month'`,
		[clienteId, período],
	);
	return rows[0].total;
}

/** UC11: dominios asignados al distribuidor hasta el fin del periodo `AAAA-MM`. */
export async function contarPorDistribuidorAlPeríodo(distribuidorId, período) {
	const { rows } = await pool.query(
		`SELECT COUNT(*)::int AS total FROM dominio
		WHERE "distribuidorId" = $1 AND "fechaAsignación" < to_date($2, 'YYYY-MM') + INTERVAL '1 month'`,
		[distribuidorId, período],
	);
	return rows[0].total;
}

export async function contarPorDistribuidor(distribuidorId) {
	const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM dominio WHERE "distribuidorId" = $1', [
		distribuidorId,
	]);
	return rows[0].total;
}
