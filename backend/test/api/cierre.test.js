import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/baseDeDatos.js';
import { crearAdministrador } from '../../src/servicios/usuarios/ServicioDeUsuarios.js';

const CLAVE = 'clave-segura';
const TARJETA = { franquicia: 'Visa', numero: '4111111111111111', fechaExpiración: '2099-12-31' };
const DIRECCION = { calle: 'Calle 1', ciudad: 'Bogotá', departamentoOPaís: 'Colombia', códigoPostal: '110111' };
const PERIODOS_DE_PRUEBA = ['2020-03-01', '2020-05-01', '2020-06-01', '2020-07-01'];

let servidor;
let base;
let tokenClientes;
let tokenCanales;
const correos = [];
const titulares = [];

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
	return respuesta;
}

async function pedirJson(metodo, ruta, token, cuerpo) {
	const respuesta = await pedir(metodo, ruta, token, cuerpo);
	const texto = await respuesta.text();
	return { estado: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

async function crearAdmin(rol) {
	const correo = correoNuevo();
	await crearAdministrador({ correo, contraseña: CLAVE, nombreCompleto: rol, documento: unico(), rol });
	const { cuerpo } = await pedirJson('POST', '/usuarios/sesion', '', { correo, contraseña: CLAVE });
	return cuerpo.token;
}

async function crearDistribuidor() {
	const { cuerpo } = await pedirJson('POST', '/perfiles/distribuidores', tokenCanales, {
		correo: correoNuevo(),
		contraseña: CLAVE,
		razónSocial: `Distribuidora ${unico()}`,
		nit: unico(),
		tarjeta: TARJETA,
	});
	titulares.push(cuerpo.id);
	return cuerpo.id;
}

async function crearCliente() {
	const { cuerpo } = await pedirJson('POST', '/perfiles/clientes', tokenClientes, {
		correo: correoNuevo(),
		contraseña: CLAVE,
		nombreCompleto: 'Cliente de Prueba',
		tipoDocumento: 'CC',
		numeroDocumento: unico(),
		paqueteHosting: 'Chibcha-Plata',
		planDePago: 'Mensual',
		dirección: DIRECCION,
		tarjeta: TARJETA,
	});
	titulares.push(cuerpo.id);
	return cuerpo.id;
}

async function crearFactura(pagadorId, fechaEmisión, monto) {
	await pool.query(
		`INSERT INTO factura ("usuarioPagadorId", "número", "fechaEmisión", "fechaVencimiento", "período", "monto")
		VALUES ($1, $2, $3, $3, '2000-01', $4)`,
		[pagadorId, unico(), fechaEmisión, monto],
	);
}

async function crearDominios(clienteId, distribuidorId, cantidad) {
	await pool.query(
		`INSERT INTO dominio ("nombre", "clienteId", "distribuidorId")
		SELECT gen_random_uuid()::text || '.com', $1, $2 FROM generate_series(1, $3)`,
		[clienteId, distribuidorId, cantidad],
	);
}

const delDistribuidor = (cuerpo, id) => cuerpo.resultados.find((resultado) => resultado.distribuidorId === id);

before(async () => {
	await new Promise((resolver) => {
		servidor = app.listen(0, resolver);
	});
	base = `http://127.0.0.1:${servidor.address().port}`;
	tokenClientes = await crearAdmin('Administrador de Clientes');
	tokenCanales = await crearAdmin('Administrador de Canales');
});

after(async () => {
	await pool.query(
		`DELETE FROM cheque WHERE "comisionId" IN (SELECT "id" FROM comision WHERE "período" = ANY($1::date[]))`,
		[PERIODOS_DE_PRUEBA],
	);
	await pool.query('DELETE FROM comision WHERE "período" = ANY($1::date[])', [PERIODOS_DE_PRUEBA]);
	await pool.query('DELETE FROM cierre_mensual WHERE "período" = ANY($1::date[])', [PERIODOS_DE_PRUEBA]);
	await pool.query('DELETE FROM factura WHERE "usuarioPagadorId" = ANY($1)', [titulares]);
	await pool.query('DELETE FROM dominio WHERE "clienteId" = ANY($1)', [titulares]);
	const { rows } = await pool.query('SELECT "id" FROM usuario WHERE "correo" = ANY($1)', [correos]);
	const usuarios = rows.map((fila) => fila.id);
	for (const tabla of ['cliente', 'distribuidor', 'administrador', 'tecnico_de_soporte', 'empleado', 'usuario']) {
		await pool.query(`DELETE FROM ${tabla} WHERE "id" = ANY($1)`, [usuarios]);
	}
	await pool.end();
	await new Promise((resolver) => servidor.close(resolver));
});

test('UC12: procesa al distribuidor, persiste todo y E1 impide repetir el mes', async () => {
	const clienteId = await crearCliente();
	const premium = await crearDistribuidor();
	const sinFacturas = await crearDistribuidor();
	await crearDominios(clienteId, premium, 101);
	await crearFactura(premium, '2020-03-10', 1000);
	await crearFactura(premium, '2020-03-31', 500);
	await crearFactura(premium, '2020-04-01', 9000);

	const { estado, cuerpo } = await pedirJson('POST', '/facturacion/cierres', tokenCanales, { período: '2020-03' });
	assert.equal(estado, 201);

	const resultado = delDistribuidor(cuerpo, premium);
	assert.equal(resultado.categoría, 'Premium');
	assert.equal(resultado.comisión, 225);
	assert.match(resultado.aviso, /Premium/);
	assert.equal(cuerpo.cambiosDeCategoría >= 1, true);

	const cero = delDistribuidor(cuerpo, sinFacturas);
	assert.equal(cero.comisión, 0);
	assert.equal(cero.sinFacturación, true);

	const { rows: distribuidor } = await pool.query('SELECT * FROM distribuidor WHERE "id" = $1', [premium]);
	assert.equal(distribuidor[0].categoría, 'Premium');
	assert.equal(distribuidor[0].comisiónAplicable, '15.00');
	const { rows: cheques } = await pool.query(
		`SELECT ch."monto", co."porcentajeAplicado" FROM cheque ch JOIN comision co ON co."id" = ch."comisionId"
		WHERE co."distribuidorId" = $1`,
		[premium],
	);
	assert.deepEqual(cheques, [{ monto: '225.00', porcentajeAplicado: '15.00' }]);
	const { rows: cierres } = await pool.query(
		`SELECT "fechaEjecución" FROM cierre_mensual WHERE "período" = '2020-03-01'`,
	);
	assert.notEqual(cierres[0].fechaEjecución, null);

	const repetido = await pedirJson('POST', '/facturacion/cierres', tokenCanales, { período: '2020-03' });
	assert.equal(repetido.estado, 409);
});

test('UC12 A2: un cierre interrumpido retoma solo a los que faltaban', async () => {
	const hecho = await crearDistribuidor();
	const faltante = await crearDistribuidor();
	const { rows } = await pool.query(`INSERT INTO cierre_mensual ("período") VALUES ('2020-05-01') RETURNING "id"`);
	await pool.query(
		`INSERT INTO comision ("cierreMensualId", "distribuidorId", "monto", "porcentajeAplicado", "período")
		VALUES ($1, $2, 0, 10, '2020-05-01')`,
		[rows[0].id, hecho],
	);

	const { estado, cuerpo } = await pedirJson('POST', '/facturacion/cierres', tokenCanales, { período: '2020-05' });
	assert.equal(estado, 201);
	assert.equal(delDistribuidor(cuerpo, hecho), undefined);
	assert.notEqual(delDistribuidor(cuerpo, faltante), undefined);

	const { rows: comisiones } = await pool.query(
		`SELECT "id" FROM comision WHERE "distribuidorId" = $1 AND "período" = '2020-05-01'`,
		[hecho],
	);
	assert.equal(comisiones.length, 1);
});

test('UC12: el inhabilitado no entra al cierre', async () => {
	const inhabilitado = await crearDistribuidor();
	await pool.query(`UPDATE usuario SET "estado" = 'Inhabilitado' WHERE "id" = $1`, [inhabilitado]);
	const { cuerpo } = await pedirJson('POST', '/facturacion/cierres', tokenCanales, { período: '2020-06' });
	assert.equal(delDistribuidor(cuerpo, inhabilitado), undefined);
});

test('UC12 E1: rechaza formato inválido y mes sin terminar', async () => {
	const invalido = await pedirJson('POST', '/facturacion/cierres', tokenCanales, { período: 'marzo' });
	assert.equal(invalido.estado, 400);
	const hoy = new Date();
	const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
	const enCurso = await pedirJson('POST', '/facturacion/cierres', tokenCanales, { período: mes });
	assert.equal(enCurso.estado, 400);
	assert.equal(enCurso.cuerpo.error, 'El periodo aún no ha terminado');
});

test('UC15: el cheque se descarga en PDF y exige permiso', async () => {
	await crearDistribuidor();
	const { cuerpo } = await pedirJson('POST', '/facturacion/cierres', tokenCanales, { período: '2020-07' });
	const { chequeId } = cuerpo.resultados[0];

	const respuesta = await pedir('GET', `/facturacion/cheques/${chequeId}/pdf`, tokenCanales);
	assert.equal(respuesta.status, 200);
	assert.equal(respuesta.headers.get('content-type'), 'application/pdf');
	assert.equal(Buffer.from(await respuesta.arrayBuffer()).subarray(0, 4).toString(), '%PDF');

	assert.equal((await pedir('GET', `/facturacion/cheques/${randomUUID()}/pdf`, tokenCanales)).status, 404);
	assert.equal((await pedir('GET', `/facturacion/cheques/${chequeId}/pdf`, 'falso')).status, 401);
});
