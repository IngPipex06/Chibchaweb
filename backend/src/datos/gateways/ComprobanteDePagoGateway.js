import { pool } from '../../config/baseDeDatos.js';

const COLUMNAS = `c."id", c."monto"::float8 AS "monto", to_char(c."fecha", 'YYYY-MM-DD') AS "fecha", c."estado",
	f."número" AS "factura", f."período", m."tipoTarjeta", m."numeroEnmascarado"`;
const ORIGEN = `comprobante_de_pago c
	JOIN factura f ON f."id" = c."facturaId"
	JOIN medio_de_pago m ON m."id" = c."medioDePagoId"`;

export async function insertar(fila, conexion = pool) {
	await conexion.query(
		`INSERT INTO comprobante_de_pago ("facturaId", "medioDePagoId", "monto", "fecha", "estado")
		VALUES ($1, $2, $3, $4, $5)`,
		[fila.facturaId, fila.medioDePagoId, fila.monto, fila.fecha, fila.estado],
	);
}

export async function listarPorTitular(titularId) {
	const { rows } = await pool.query(
		`SELECT ${COLUMNAS} FROM ${ORIGEN}
		WHERE f."usuarioPagadorId" = $1
		ORDER BY c."fecha" DESC, c."id"`,
		[titularId],
	);
	return rows;
}

export async function obtener(id, titularId) {
	const { rows } = await pool.query(
		`SELECT ${COLUMNAS} FROM ${ORIGEN}
		WHERE c."id" = $1 AND f."usuarioPagadorId" = $2`,
		[id, titularId],
	);
	return rows[0] ?? null;
}
