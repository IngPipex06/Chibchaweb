import { pool } from '../../config/baseDeDatos.js';

export async function insertar(fila, conexion) {
	const { rows } = await conexion.query(
		`INSERT INTO cheque ("comisionId", "número", "monto", "fechaGeneración") VALUES ($1, $2, $3, $4) RETURNING "id"`,
		[fila.comisionId, fila.número, fila.monto, fila.fechaGeneración],
	);
	return rows[0].id;
}

export async function obtenerParaExportar(id) {
	const { rows } = await pool.query(
		`SELECT ch."número", ch."monto", to_char(ch."fechaGeneración", 'YYYY-MM-DD') AS "fechaGeneración",
			to_char(co."período", 'YYYY-MM') AS "período", d."razónSocial"
		FROM cheque ch
		JOIN comision co ON co."id" = ch."comisionId"
		JOIN distribuidor d ON d."id" = co."distribuidorId"
		WHERE ch."id" = $1`,
		[id],
	);
	return rows[0] ?? null;
}
