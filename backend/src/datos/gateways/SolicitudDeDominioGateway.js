import { pool } from '../../config/baseDeDatos.js';

const COLUMNAS = `"id", "nombreDominioSolicitado", "estado", to_char("fechaSolicitud", 'YYYY-MM-DD') AS "fechaSolicitud",
	"formatoVersionXml", "dominioId"`;

export async function insertar(fila, conexion = pool) {
	const { rows } = await conexion.query(
		`INSERT INTO solicitud_de_dominio ("clienteId", "nombreDominioSolicitado", "fechaSolicitud")
		VALUES ($1, $2, $3) RETURNING "id"`,
		[fila.clienteId, fila.nombreDominioSolicitado, fila.fechaSolicitud],
	);
	return rows[0].id;
}

export async function guardarXML(id, archivo, conexion = pool) {
	await conexion.query(
		'UPDATE solicitud_de_dominio SET "contenidoXml" = $2, "formatoVersionXml" = $3 WHERE "id" = $1',
		[id, archivo.contenido, archivo.formatoVersión],
	);
}

export async function listarPorCliente(clienteId) {
	const { rows } = await pool.query(
		`SELECT ${COLUMNAS} FROM solicitud_de_dominio WHERE "clienteId" = $1 ORDER BY "fechaSolicitud" DESC, "id"`,
		[clienteId],
	);
	return rows;
}

export async function obtener(id, clienteId) {
	const { rows } = await pool.query(
		`SELECT ${COLUMNAS} FROM solicitud_de_dominio WHERE "id" = $1 AND "clienteId" = $2`,
		[id, clienteId],
	);
	return rows[0] ?? null;
}

export async function obtenerXML(id, clienteId) {
	const { rows } = await pool.query(
		`SELECT "nombreDominioSolicitado", "contenidoXml" FROM solicitud_de_dominio
		WHERE "id" = $1 AND "clienteId" = $2`,
		[id, clienteId],
	);
	return rows[0] ?? null;
}

/** Bloquea la solicitud: dos envíos simultáneos no pueden registrarla dos veces. */
export async function bloquear(id, clienteId, conexion) {
	const { rows } = await conexion.query(
		`SELECT "nombreDominioSolicitado", "estado", "contenidoXml", "formatoVersionXml" FROM solicitud_de_dominio
		WHERE "id" = $1 AND "clienteId" = $2
		FOR UPDATE`,
		[id, clienteId],
	);
	return rows[0] ?? null;
}

export async function marcarEnviada(id, estado, dominioId, conexion) {
	await conexion.query('UPDATE solicitud_de_dominio SET "estado" = $2, "dominioId" = $3 WHERE "id" = $1', [
		id,
		estado,
		dominioId,
	]);
}
