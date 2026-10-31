import { pool } from '../../config/baseDeDatos.js';

const COLUMNAS_DEL_TITULAR = `t."id", t."dominioId", d."nombre" AS "dominio", t."descripción", t."prioridad", t."estado",
	t."fechaCreación", t."nivelActual", t."fechaInicioSLA", t."tecnicoAsignadoId", t."solución"`;
const COLUMNAS = `${COLUMNAS_DEL_TITULAR}, t."fechaToma", t."motivoEscalamiento", t."notaDeAvance"`;
const DE_TICKETS = 'FROM ticket t JOIN dominio d ON d."id" = t."dominioId"';

export async function insertar(fila) {
	const { rows } = await pool.query(
		`INSERT INTO ticket ("solicitanteId", "dominioId", "descripción", "prioridad", "fechaCreación", "fechaInicioSLA")
		VALUES ($1, $2, $3, $4, $5, $5) RETURNING "id"`,
		[fila.solicitanteId, fila.dominioId, fila.descripción, fila.prioridad, fila.fechaCreación],
	);
	return rows[0].id;
}

export async function obtener(id) {
	const { rows } = await pool.query(`SELECT ${COLUMNAS} ${DE_TICKETS} WHERE t."id" = $1`, [id]);
	return rows[0] ?? null;
}

export async function listarPorSolicitante(solicitanteId) {
	const { rows } = await pool.query(
		`SELECT ${COLUMNAS_DEL_TITULAR} ${DE_TICKETS} WHERE t."solicitanteId" = $1 ORDER BY t."fechaCreación" DESC`,
		[solicitanteId],
	);
	return rows;
}

/** UC23: los rezagados tienen precedencia; dentro de cada prioridad va primero el SLA más antiguo. */
export async function listarPorNivel(nivel, filtros) {
	const { rows } = await pool.query(
		`SELECT ${COLUMNAS} ${DE_TICKETS}
		WHERE t."nivelActual" = $1 AND t."estado" <> 'Resuelto'
			AND ($2::estado_ticket IS NULL OR t."estado" = $2)
			AND ($3::prioridad IS NULL OR t."prioridad" = $3)
		ORDER BY t."estado" = 'Rezagado-SLAVencido' DESC, t."prioridad", t."fechaInicioSLA"`,
		[nivel, filtros.estado ?? null, filtros.prioridad ?? null],
	);
	return rows;
}

/** Bloquea el ticket: el técnico y el temporizador no pueden actuar a la vez sobre él. */
export async function bloquear(id, conexion) {
	const { rows } = await conexion.query('SELECT * FROM ticket WHERE "id" = $1 FOR UPDATE', [id]);
	return rows[0] ?? null;
}

/** UC25: lo que un técnico esté atendiendo se revisa en la siguiente pasada. */
export async function bloquearSinResolver(conexion) {
	const { rows } = await conexion.query(
		`SELECT * FROM ticket WHERE "estado" <> 'Resuelto' FOR UPDATE SKIP LOCKED`,
	);
	return rows;
}

export async function actualizar(id, fila, conexion) {
	await conexion.query(
		`UPDATE ticket SET "estado" = $2, "nivelActual" = $3, "tecnicoAsignadoId" = $4, "fechaInicioSLA" = $5,
			"solución" = $6, "fechaToma" = $7, "motivoEscalamiento" = $8, "notaDeAvance" = $9
		WHERE "id" = $1`,
		[
			id,
			fila.estado,
			fila.nivelActual,
			fila.tecnicoAsignadoId,
			fila.fechaInicioSLA,
			fila.solución,
			fila.fechaToma,
			fila.motivoEscalamiento,
			fila.notaDeAvance,
		],
	);
}
