export async function insertar(fila, conexion) {
	const { rows } = await conexion.query(
		`INSERT INTO comision ("cierreMensualId", "distribuidorId", "monto", "porcentajeAplicado", "período")
		VALUES ($1, $2, $3, $4, $5::date)
		RETURNING "id"`,
		[fila.cierreMensualId, fila.distribuidorId, fila.monto, fila.porcentajeAplicado, `${fila.período}-01`],
	);
	return rows[0].id;
}
