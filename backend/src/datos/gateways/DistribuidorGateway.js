import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM distribuidor WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function insertar(fila, conexion = pool) {
	await conexion.query(
		`INSERT INTO distribuidor ("id", "razónSocial", "nit", "categoría", "comisiónAplicable", "datosDeContacto")
		VALUES ($1, $2, $3, $4, $5, $6)`,
		[fila.id, fila.razónSocial, fila.nit, fila.categoría, fila.comisiónAplicable, fila.datosDeContacto],
	);
}

export async function actualizar(fila, conexion = pool) {
	await conexion.query(
		'UPDATE distribuidor SET "razónSocial" = $2, "nit" = $3, "datosDeContacto" = $4 WHERE "id" = $1',
		[fila.id, fila.razónSocial, fila.nit, fila.datosDeContacto],
	);
}

const CONSULTA_FICHA = `SELECT d.*, u."correo", u."estado" FROM distribuidor d JOIN usuario u ON u."id" = d."id"`;

export async function listar(busqueda) {
	const patron = `%${busqueda ?? ''}%`;
	const { rows } = await pool.query(
		`${CONSULTA_FICHA}
		WHERE d."razónSocial" ILIKE $1 OR d."nit" ILIKE $1 OR u."correo" ILIKE $1
		ORDER BY d."razónSocial"`,
		[patron],
	);
	return rows;
}

export async function obtenerFicha(id) {
	const { rows } = await pool.query(`${CONSULTA_FICHA} WHERE d."id" = $1`, [id]);
	return rows[0] ?? null;
}
