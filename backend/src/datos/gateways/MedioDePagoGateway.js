import { pool } from '../../config/baseDeDatos.js';

export async function insertar(fila, conexion = pool) {
	await conexion.query(
		`INSERT INTO medio_de_pago ("titularId", "tipoTarjeta", "numeroEnmascarado", "fechaExpiración")
		VALUES ($1, $2, $3, $4)`,
		[fila.titularId, fila.tipoTarjeta, fila.numeroEnmascarado, fila.fechaExpiración],
	);
}

/** UC6: editar reingresa la tarjeta; si es la misma no se duplica la fila. */
export async function insertarSiNoExiste(fila, conexion = pool) {
	await conexion.query(
		`INSERT INTO medio_de_pago ("titularId", "tipoTarjeta", "numeroEnmascarado", "fechaExpiración")
		SELECT $1::uuid, $2::tipo_tarjeta, $3::varchar, $4::date
		WHERE NOT EXISTS (
			SELECT 1 FROM medio_de_pago
			WHERE "titularId" = $1 AND "tipoTarjeta" = $2 AND "numeroEnmascarado" = $3 AND "fechaExpiración" = $4
		)`,
		[fila.titularId, fila.tipoTarjeta, fila.numeroEnmascarado, fila.fechaExpiración],
	);
}

export async function listarPorTitular(titularId) {
	const { rows } = await pool.query(
		`SELECT "id", "tipoTarjeta", "numeroEnmascarado", to_char("fechaExpiración", 'YYYY-MM-DD') AS "fechaExpiración"
		FROM medio_de_pago WHERE "titularId" = $1`,
		[titularId],
	);
	return rows;
}
