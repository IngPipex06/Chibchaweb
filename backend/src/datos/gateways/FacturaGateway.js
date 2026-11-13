import { pool } from '../../config/baseDeDatos.js';

export async function siguienteNumero() {
	const { rows } = await pool.query(`SELECT nextval('factura_numero_seq') AS valor`);
	return `FAC-${rows[0].valor.padStart(6, '0')}`;
}

export async function insertar(fila, conexion = pool) {
	const { rows } = await conexion.query(
		`INSERT INTO factura ("usuarioPagadorId", "número", "fechaEmisión", "fechaVencimiento", "período", "monto", "estado")
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING "id"`,
		[fila.usuarioPagadorId, fila.número, fila.fechaEmisión, fila.fechaVencimiento, fila.período, fila.monto, fila.estado],
	);
	return rows[0].id;
}

export async function existeDelPeríodo(pagadorId, período) {
	const { rows } = await pool.query('SELECT 1 FROM factura WHERE "usuarioPagadorId" = $1 AND "período" = $2', [
		pagadorId,
		período,
	]);
	return rows.length > 0;
}

export async function listarPorCobrar() {
	const { rows } = await pool.query(
		`SELECT "id" FROM factura WHERE "estado" IN ('Pendiente', 'Vencida') ORDER BY "fechaEmisión", "id"`,
	);
	return rows;
}

/** Bloquea la factura: dos cobros simultáneos no pueden cobrarla dos veces. */
export async function bloquearPorCobrar(id, conexion) {
	const { rows } = await conexion.query(
		`SELECT "id", "usuarioPagadorId", "monto"::float8 AS "monto", "estado",
			to_char("fechaVencimiento", 'YYYY-MM-DD') AS "fechaVencimiento"
		FROM factura WHERE "id" = $1 AND "estado" IN ('Pendiente', 'Vencida')
		FOR UPDATE`,
		[id],
	);
	return rows[0] ?? null;
}

export async function actualizarEstado(id, estado, conexion = pool) {
	await conexion.query('UPDATE factura SET "estado" = $2 WHERE "id" = $1', [id, estado]);
}

/** UC14: cualquier estado, por mes de emisión. */
export async function sumarMontoDelMes(pagadorId, período) {
	const { rows } = await pool.query(
		`SELECT COALESCE(SUM("monto"), 0) AS total FROM factura
		WHERE "usuarioPagadorId" = $1 AND to_char("fechaEmisión", 'YYYY-MM') = $2`,
		[pagadorId, período],
	);
	return Number(rows[0].total);
}
