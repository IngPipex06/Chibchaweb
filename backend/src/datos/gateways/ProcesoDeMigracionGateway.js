import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM proceso_de_migracion WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function buscarReporte(id) {
	const { rows } = await pool.query(
		`SELECT p."id", p."fechaEjecución", p."nombreArchivo", p."estado", e."nombreCompleto" AS administrador
		FROM proceso_de_migracion p
		JOIN empleado e ON e."id" = p."administradorId"
		WHERE p."id" = $1`,
		[id],
	);
	return rows[0] ?? null;
}

export async function insertar(fila) {
	const { rows } = await pool.query(
		`INSERT INTO proceso_de_migracion ("fechaEjecución", "nombreArchivo", "administradorId", "estado")
		VALUES ($1, $2, $3, $4) RETURNING "id"`,
		[fila.fechaEjecución, fila.nombreArchivo, fila.administradorId, fila.estado],
	);
	return rows[0].id;
}

export async function actualizarEstado(id, estado) {
	await pool.query('UPDATE proceso_de_migracion SET "estado" = $2 WHERE "id" = $1', [id, estado]);
}

/** Solo pausa lo que sigue en curso: el avance lo escribe el bloque, no la pausa. */
export async function pausarSiSigueEnProgreso(id) {
	const { rowCount } = await pool.query(
		`UPDATE proceso_de_migracion SET "estado" = 'Pausado' WHERE "id" = $1 AND "estado" = 'EnProgreso'`,
		[id],
	);
	return rowCount > 0;
}

/** El Memento vive en columnas del proceso: se guarda con la transacción de su bloque. */
export async function guardarPunto(id, punto, conexion = pool) {
	await conexion.query(
		'UPDATE proceso_de_migracion SET "ultimoPuntoControlPosicion" = $2, "ultimoPuntoControlFecha" = $3 WHERE "id" = $1',
		[id, punto.posición, punto.fecha],
	);
}
