import { pool } from '../../config/baseDeDatos.js';

export async function insertar(fila, conexion = pool) {
	const { rows } = await conexion.query(
		`INSERT INTO medio_de_pago ("titularId", "tipoTarjeta", "numeroEnmascarado", "fechaExpiración")
		VALUES ($1, $2, $3, $4)
		RETURNING "id"`,
		[fila.titularId, fila.tipoTarjeta, fila.numeroEnmascarado, fila.fechaExpiración],
	);
	return rows[0].id;
}

/** UC6: editar reingresa la tarjeta; si es la misma no se duplica la fila. */
export async function insertarSiNoExiste(fila, conexion = pool) {
	await conexion.query(
		`INSERT INTO medio_de_pago ("titularId", "tipoTarjeta", "numeroEnmascarado", "fechaExpiración")
		SELECT $1::uuid, $2::tipo_tarjeta, $3::varchar, $4::date
		WHERE NOT EXISTS (
			SELECT 1 FROM medio_de_pago
			WHERE "titularId" = $1 AND "tipoTarjeta" = $2 AND "numeroEnmascarado" = $3 AND "fechaExpiración" = $4
				AND "estado" = 'Activa'
		)`,
		[fila.titularId, fila.tipoTarjeta, fila.numeroEnmascarado, fila.fechaExpiración],
	);
}

const COLUMNAS = `"id", "tipoTarjeta", "numeroEnmascarado", to_char("fechaExpiración", 'YYYY-MM-DD') AS "fechaExpiración"`;

/** Solo las activas: las inactivas se conservan para los comprobantes. */
export async function listarPorTitular(titularId, conexion = pool) {
	const { rows } = await conexion.query(
		`SELECT ${COLUMNAS} FROM medio_de_pago
		WHERE "titularId" = $1 AND "estado" = 'Activa'
		ORDER BY "fechaExpiración" DESC, "id"`,
		[titularId],
	);
	return rows;
}

export async function obtenerActiva(id, titularId, conexion = pool) {
	const { rows } = await conexion.query(
		`SELECT ${COLUMNAS} FROM medio_de_pago
		WHERE "id" = $1 AND "titularId" = $2 AND "estado" = 'Activa'`,
		[id, titularId],
	);
	return rows[0] ?? null;
}

export async function inactivar(id, conexion = pool) {
	await conexion.query(`UPDATE medio_de_pago SET "estado" = 'Inactiva' WHERE "id" = $1`, [id]);
}
