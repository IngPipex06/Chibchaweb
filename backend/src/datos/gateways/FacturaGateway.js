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

/** UC14: cualquier estado, por mes de emisión. */
export async function sumarMontoDelMes(pagadorId, período) {
	const { rows } = await pool.query(
		`SELECT COALESCE(SUM("monto"), 0) AS total FROM factura
		WHERE "usuarioPagadorId" = $1 AND to_char("fechaEmisión", 'YYYY-MM') = $2`,
		[pagadorId, período],
	);
	return Number(rows[0].total);
}
