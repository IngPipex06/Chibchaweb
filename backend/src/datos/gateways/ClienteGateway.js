import { pool } from '../../config/baseDeDatos.js';

export async function buscarPorId(id) {
	const { rows } = await pool.query('SELECT * FROM cliente WHERE "id" = $1', [id]);
	return rows[0] ?? null;
}

export async function buscarPorNumeroDocumento(numeroDocumento) {
	const { rows } = await pool.query('SELECT "id" FROM cliente WHERE "numeroDocumento" = $1', [numeroDocumento]);
	return rows[0] ?? null;
}

export async function insertar(fila, conexion = pool) {
	await conexion.query(
		`INSERT INTO cliente ("id", "nombreCompleto", "tipoDocumento", "numeroDocumento", "teléfono",
			"fechaNacimiento", "paqueteHosting", "planDePago", "direccionCalle", "direccionCiudad",
			"direccionDepartamentoOPais", "direccionCodigoPostal")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		[
			fila.id,
			fila.nombreCompleto,
			fila.tipoDocumento,
			fila.numeroDocumento,
			fila.teléfono ?? null,
			fila.fechaNacimiento ?? null,
			fila.paqueteHosting,
			fila.planDePago,
			fila.direccionCalle ?? null,
			fila.direccionCiudad ?? null,
			fila.direccionDepartamentoOPais ?? null,
			fila.direccionCodigoPostal ?? null,
		],
	);
}

export async function actualizar(fila, conexion = pool) {
	await conexion.query(
		`UPDATE cliente SET "nombreCompleto" = $2, "tipoDocumento" = $3, "numeroDocumento" = $4, "teléfono" = $5,
			"fechaNacimiento" = $6, "paqueteHosting" = $7, "planDePago" = $8, "direccionCalle" = $9,
			"direccionCiudad" = $10, "direccionDepartamentoOPais" = $11, "direccionCodigoPostal" = $12
		WHERE "id" = $1`,
		[
			fila.id,
			fila.nombreCompleto,
			fila.tipoDocumento,
			fila.numeroDocumento,
			fila.teléfono,
			fila.fechaNacimiento,
			fila.paqueteHosting,
			fila.planDePago,
			fila.direccionCalle,
			fila.direccionCiudad,
			fila.direccionDepartamentoOPais,
			fila.direccionCodigoPostal,
		],
	);
}

const CONSULTA_FICHA = `SELECT c.*, u."correo", u."estado" FROM cliente c JOIN usuario u ON u."id" = c."id"`;

export async function listar(busqueda) {
	const patron = `%${busqueda ?? ''}%`;
	const { rows } = await pool.query(
		`${CONSULTA_FICHA}
		WHERE c."nombreCompleto" ILIKE $1 OR c."numeroDocumento" ILIKE $1 OR u."correo" ILIKE $1
		ORDER BY c."nombreCompleto"`,
		[patron],
	);
	return rows;
}

export async function obtenerFicha(id) {
	const { rows } = await pool.query(`${CONSULTA_FICHA} WHERE c."id" = $1`, [id]);
	return rows[0] ?? null;
}
