import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM cliente WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function insertar(fila, conexion = pool) {
	await conexion.query(
		`INSERT INTO cliente ("id", "nombreCompleto", "tipoDocumento", "numeroDocumento", "teléfono",
			"fechaNacimiento", "paqueteHosting", "planDePago")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		[
			fila.id,
			fila.nombreCompleto,
			fila.tipoDocumento,
			fila.numeroDocumento,
			fila.teléfono ?? null,
			fila.fechaNacimiento ?? null,
			fila.paqueteHosting,
			fila.planDePago,
		],
	);
}
