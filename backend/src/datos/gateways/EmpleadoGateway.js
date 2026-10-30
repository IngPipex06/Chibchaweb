import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM empleado WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function insertar(fila, conexion = pool) {
	await conexion.query(
		`INSERT INTO empleado ("id", "nombreCompleto", "documento", "cargo", "teléfono")
		VALUES ($1, $2, $3, $4, $5)`,
		[fila.id, fila.nombreCompleto, fila.documento, fila.cargo ?? null, fila.teléfono ?? null],
	);
}

export async function actualizar(fila, conexion = pool) {
	await conexion.query(
		`UPDATE empleado SET "nombreCompleto" = $2, "documento" = $3, "cargo" = $4, "teléfono" = $5
		WHERE "id" = $1`,
		[fila.id, fila.nombreCompleto, fila.documento, fila.cargo, fila.teléfono],
	);
}

const CONSULTA_FICHA = `SELECT e.*, u."correo", u."estado", a."rolId", r."nombre" AS "rol", t."nivelDeServicio"
	FROM empleado e
	JOIN usuario u ON u."id" = e."id"
	LEFT JOIN administrador a ON a."id" = e."id"
	LEFT JOIN rol r ON r."id" = a."rolId"
	LEFT JOIN tecnico_de_soporte t ON t."id" = e."id"`;

export async function listar(busqueda) {
	const patron = `%${busqueda ?? ''}%`;
	const { rows } = await pool.query(
		`${CONSULTA_FICHA}
		WHERE e."nombreCompleto" ILIKE $1 OR e."documento" ILIKE $1 OR u."correo" ILIKE $1
		ORDER BY e."nombreCompleto"`,
		[patron],
	);
	return rows;
}

export async function obtenerFicha(id) {
	const { rows } = await pool.query(`${CONSULTA_FICHA} WHERE e."id" = $1`, [id]);
	return rows[0] ?? null;
}
