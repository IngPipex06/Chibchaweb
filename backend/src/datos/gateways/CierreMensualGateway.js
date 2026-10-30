import { pool } from '../../config/baseDeDatos.js';

/** La fila existe antes del bucle porque `comision.cierreMensualId` es obligatoria. */
export async function obtenerOCrear(período) {
	const { rows } = await pool.query(
		`WITH nuevo AS (
			INSERT INTO cierre_mensual ("período") VALUES ($1::date) ON CONFLICT ("período") DO NOTHING RETURNING *
		)
		SELECT * FROM nuevo UNION ALL SELECT * FROM cierre_mensual WHERE "período" = $1::date`,
		[`${período}-01`],
	);
	return rows[0];
}

export async function marcarCompletado(id, fechaEjecución) {
	await pool.query('UPDATE cierre_mensual SET "fechaEjecución" = $2 WHERE "id" = $1', [id, fechaEjecución]);
}
