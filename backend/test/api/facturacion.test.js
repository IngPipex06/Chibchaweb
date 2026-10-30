import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/baseDeDatos.js';
import { crearAdministrador } from '../../src/servicios/usuarios/ServicioDeUsuarios.js';

const CLAVE = 'clave-segura';
const TARJETA = { franquicia: 'Visa', numero: '4111111111111111', fechaExpiración: '2099-12-31' };
const DIRECCION = { calle: 'Calle 1', ciudad: 'Bogotá', departamentoOPaís: 'Colombia', códigoPostal: '110111' };

let servidor;
let base;
let tokenAdministrador;
let tokenDistribuidor;
const correos = [];
const ids = [];

function correoNuevo() {
	const correo = `${randomUUID()}@prueba.com`;
	correos.push(correo);
	return correo;
}

const unico = () => randomUUID().slice(0, 30);

async function pedir(metodo, ruta, token, cuerpo) {
	const respuesta = await fetch(`${base}/api${ruta}`, {
		method: metodo,
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
	});
	const texto = await respuesta.text();
	return { estado: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

async function iniciarSesion(correo) {
	const { cuerpo } = await pedir('POST', '/usuarios/sesion', '', { correo, contraseña: CLAVE });
	return cuerpo.token;
}

async function crearAdmin(rol) {
	const correo = correoNuevo();
	await crearAdministrador({ correo, contraseña: CLAVE, nombreCompleto: rol, documento: unico(), rol });
	return iniciarSesion(correo);
}

async function crearCliente(tokenClientes, paqueteHosting, planDePago) {
	const { cuerpo } = await pedir('POST', '/perfiles/clientes', tokenClientes, {
		correo: correoNuevo(),
		contraseña: CLAVE,
		nombreCompleto: 'Cliente de Prueba',
		tipoDocumento: 'CC',
		numeroDocumento: unico(),
		paqueteHosting,
		planDePago,
		dirección: DIRECCION,
		tarjeta: TARJETA,
	});
	ids.push(cuerpo.id);
	return cuerpo.id;
}

async function crearDominio(clienteId, distribuidorId = null) {
	await pool.query('INSERT INTO dominio ("nombre", "clienteId", "distribuidorId") VALUES ($1, $2, $3)', [
		`${randomUUID()}.com`,
		clienteId,
		distribuidorId,
	]);
}

before(async () => {
	await new Promise((resolver) => {
		servidor = app.listen(0, resolver);
	});
	base = `http://127.0.0.1:${servidor.address().port}`;
	tokenAdministrador = await crearAdmin('Administrador de Clientes');
	tokenDistribuidor = await crearAdmin('Administrador de Canales');
});

after(async () => {
	await pool.query('DELETE FROM factura WHERE "usuarioPagadorId" = ANY($1)', [ids]);
	await pool.query('DELETE FROM dominio WHERE "clienteId" = ANY($1)', [ids]);
	const { rows } = await pool.query('SELECT "id" FROM usuario WHERE "correo" = ANY($1)', [correos]);
	const usuarios = rows.map((fila) => fila.id);
	for (const tabla of ['cliente', 'distribuidor', 'administrador', 'tecnico_de_soporte', 'empleado', 'usuario']) {
		await pool.query(`DELETE FROM ${tabla} WHERE "id" = ANY($1)`, [usuarios]);
	}
	await pool.end();
	await new Promise((resolver) => servidor.close(resolver));
});

test('UC11: al cliente se le cobra el paquete por los meses del plan más sus dominios', async () => {
	const clienteId = await crearCliente(tokenAdministrador, 'Chibcha-Oro', 'Trimestral');
	await crearDominio(clienteId);
	await crearDominio(clienteId);

	const { estado, cuerpo } = await pedir('POST', '/facturacion/facturas', tokenAdministrador, {
		titularId: clienteId,
		período: '2026-09',
	});
	assert.equal(estado, 201);
	assert.equal(cuerpo.monto, 135000);
	assert.deepEqual(cuerpo.cargos, { hosting: 105000, dominios: 30000, servicios: 0 });
	assert.equal(cuerpo.estado, 'Pendiente');
	assert.match(cuerpo.número, /^FAC-\d{6,}$/);

	const { rows } = await pool.query('SELECT * FROM factura WHERE "id" = $1', [cuerpo.id]);
	assert.equal(rows[0].monto, '135000.00');
	assert.equal(rows[0].período, '2026-09');
});

test('UC11: al distribuidor se le cobran sus dominios gestionados', async () => {
	const clienteId = await crearCliente(tokenAdministrador, 'Chibcha-Plata', 'Mensual');
	const { cuerpo: distribuidor } = await pedir('POST', '/perfiles/distribuidores', tokenDistribuidor, {
		correo: correoNuevo(),
		contraseña: CLAVE,
		razónSocial: 'Distribuidora de Prueba',
		nit: unico(),
		tarjeta: TARJETA,
	});
	ids.push(distribuidor.id);
	await crearDominio(clienteId, distribuidor.id);

	const { estado, cuerpo } = await pedir('POST', '/facturacion/facturas', tokenAdministrador, {
		titularId: distribuidor.id,
		período: '2026-09',
	});
	assert.equal(estado, 201);
	assert.equal(cuerpo.monto, 15000);
	assert.deepEqual(cuerpo.cargos, { hosting: 0, dominios: 15000, servicios: 0 });
});

test('UC11: rechaza periodo inválido y titular inexistente', async () => {
	const clienteId = await crearCliente(tokenAdministrador, 'Chibcha-Plata', 'Mensual');
	const malPeriodo = await pedir('POST', '/facturacion/facturas', tokenAdministrador, {
		titularId: clienteId,
		período: '2026-13',
	});
	assert.equal(malPeriodo.estado, 400);
	assert.equal(malPeriodo.cuerpo.campo, 'período');

	const sinTitular = await pedir('POST', '/facturacion/facturas', tokenAdministrador, {
		titularId: randomUUID(),
		período: '2026-09',
	});
	assert.equal(sinTitular.estado, 404);
});

test('UC11: solo un administrador con el permiso puede emitir', async () => {
	const clienteId = await crearCliente(tokenAdministrador, 'Chibcha-Plata', 'Mensual');
	const datos = { titularId: clienteId, período: '2026-09' };
	assert.equal((await pedir('POST', '/facturacion/facturas', 'falso', datos)).estado, 401);

	const { rows } = await pool.query('SELECT "correo" FROM usuario WHERE "id" = $1', [clienteId]);
	const tokenCliente = await iniciarSesion(rows[0].correo);
	assert.equal((await pedir('POST', '/facturacion/facturas', tokenCliente, datos)).estado, 403);
});
