import { pool } from '../../config/baseDeDatos.js';

export async function contarPorCliente(clienteId) {
	const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM dominio WHERE "clienteId" = $1', [clienteId]);
	return rows[0].total;
}

export async function contarPorDistribuidor(distribuidorId) {
	const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM dominio WHERE "distribuidorId" = $1', [
		distribuidorId,
	]);
	return rows[0].total;
}
