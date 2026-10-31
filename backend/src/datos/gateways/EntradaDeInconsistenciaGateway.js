import { pool } from '../../config/baseDeDatos.js';

export async function insertar(fila, conexion = pool) {
	await conexion.query(
		`INSERT INTO entrada_de_inconsistencia ("procesoMigracionId", "registroOriginal", "motivo", "fecha")
		VALUES ($1, $2, $3, $4)`,
		[fila.procesoMigracionId, fila.registroOriginal, fila.motivo, fila.fecha],
	);
}

export async function listarPorProceso(procesoMigracionId) {
	const { rows } = await pool.query(
		`SELECT "id", "registroOriginal", "motivo", "fecha" FROM entrada_de_inconsistencia
		WHERE "procesoMigracionId" = $1 ORDER BY "fecha", "id"`,
		[procesoMigracionId],
	);
	return rows;
}
