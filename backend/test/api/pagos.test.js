import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, mock, test } from 'node:test';

const carpeta = await mkdtemp(join(tmpdir(), 'chibchaweb-'));
process.env.RUTA_RESPALDO = join(carpeta, 'contingencia.jsonl');

const { app } = await import('../../src/app.js');
const { pool } = await import('../../src/config/baseDeDatos.js');
const { PasarelaDePagoSimulada } = await import('../../src/dominio/pagos/PasarelaDePagoSimulada.js');
const { aplicadoresDeRespaldoDePagos } = await import('../../src/servicios/pagos/ServicioDePagos.js');
const { cargarAlgoritmoVigente, reconciliar } = await import('../../src/servicios/respaldo/ServicioDeContingencia.js');
const { crearAdministrador } = await import('../../src/servicios/usuarios/ServicioDeUsuarios.js');

const CLAVE = 'clave-segura';
const TARJETA = { franquicia: 'Visa', numero: '4111111111111111', fechaExpiración: '2099-12-31' };
const OTRA_TARJETA = { franquicia: 'Mastercard', numero: '5555555555554444', fechaExpiración: '2098-06-30' };
const DIRECCION = { calle: 'Calle 1', ciudad: 'Bogotá', departamentoOPaís: 'Colombia', códigoPostal: '110111' };

let servidor;
let base;
let tokenClientes;
let tokenCanales;
let tokenPersonal;
const correos = [];
const titulares = [];

function correoNuevo() {
	const correo = `${randomUUID()}@prueba.com`;
	correos.push(correo);
	return correo;
}

const unico = () => randomUUID().slice(0, 30);

function pedir(metodo, ruta, token, cuerpo) {
	return fetch(`${base}/api${ruta}`, {
		method: metodo,
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
	});
}

async function pedirJson(metodo, ruta, token, cuerpo) {
	const respuesta = await pedir(metodo, ruta, token, cuerpo);
	const texto = await respuesta.text();
	return { estado: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

async function abrirSesion(correo) {
	const { cuerpo } = await pedirJson('POST', '/usuarios/sesion', '', { correo, contraseña: CLAVE });
	return cuerpo.token;
}

async function crearAdmin(rol) {
	const correo = correoNuevo();
	await crearAdministrador({ correo, contraseña: CLAVE, nombreCompleto: rol, documento: unico(), rol });
	return abrirSesion(correo);
}

async function crearCliente() {
	const correo = correoNuevo();
	const { cuerpo } = await pedirJson('POST', '/perfiles/clientes', tokenClientes, {
		correo,
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
	return { id: cuerpo.id, token: await abrirSesion(correo) };
}

async function crearDistribuidor() {
	const correo = correoNuevo();
	const { cuerpo } = await pedirJson('POST', '/perfiles/distribuidores', tokenCanales, {
		correo,
		contraseña: CLAVE,
		razónSocial: `Distribuidora ${unico()}`,
		nit: unico(),
		tarjeta: TARJETA,
	});
	titulares.push(cuerpo.id);
	return { id: cuerpo.id, token: await abrirSesion(correo) };
}

async function crearFactura(pagadorId, fechaVencimiento = '2099-01-01') {
	const { rows } = await pool.query(
		`INSERT INTO factura ("usuarioPagadorId", "número", "fechaEmisión", "fechaVencimiento", "período", "monto")
		VALUES ($1, $2, '2020-01-01', $3, left(gen_random_uuid()::text, 20), 100) RETURNING "id"`,
		[pagadorId, unico(), fechaVencimiento],
	);
	return rows[0].id;
}

async function estadoFactura(id) {
	const { rows } = await pool.query('SELECT "estado" FROM factura WHERE "id" = $1', [id]);
	return rows[0].estado;
}

const cobrar = () => pedirJson('POST', '/pagos/cobros', tokenPersonal);

/** pool.query también pasa por connect, con callback: solo se corta la transacción. */
function simularCaida() {
	const original = pool.connect;
	return mock.method(pool, 'connect', function (...argumentos) {
		if (argumentos.length > 0) return original.apply(this, argumentos);
		return Promise.reject(Object.assign(new Error('caída simulada'), { code: 'ECONNREFUSED' }));
	});
}

before(async () => {
	await new Promise((resolver) => {
		servidor = app.listen(0, resolver);
	});
	base = `http://127.0.0.1:${servidor.address().port}`;
	tokenClientes = await crearAdmin('Administrador de Clientes');
	tokenCanales = await crearAdmin('Administrador de Canales');
	tokenPersonal = await crearAdmin('Administrador de Personal');
	await cargarAlgoritmoVigente();
});

after(async () => {
	await pool.query(
		`DELETE FROM comprobante_de_pago WHERE "facturaId" IN
			(SELECT "id" FROM factura WHERE "usuarioPagadorId" = ANY($1))`,
		[titulares],
	);
	await pool.query('DELETE FROM factura WHERE "usuarioPagadorId" = ANY($1)', [titulares]);
	await pool.query('DELETE FROM dominio WHERE "distribuidorId" = ANY($1)', [titulares]);
	await pool.query('DELETE FROM medio_de_pago WHERE "titularId" = ANY($1)', [titulares]);
	const { rows } = await pool.query('SELECT "id" FROM usuario WHERE "correo" = ANY($1)', [correos]);
	const ids = rows.map((fila) => fila.id);
	for (const tabla of ['cliente', 'distribuidor', 'administrador', 'tecnico_de_soporte', 'empleado', 'usuario']) {
		await pool.query(`DELETE FROM ${tabla} WHERE "id" = ANY($1)`, [ids]);
	}
	await pool.end();
	await new Promise((resolver) => servidor.close(resolver));
	await rm(carpeta, { recursive: true, force: true });
});

test('UC16: solo los titulares entran y ven las dos opciones', async () => {
	const cliente = await crearCliente();
	const { estado, cuerpo } = await pedirJson('GET', '/pagos', cliente.token);
	assert.equal(estado, 200);
	assert.deepEqual(cuerpo, ['Métodos de pago', 'Comprobantes']);

	assert.equal((await pedirJson('GET', '/pagos', tokenPersonal)).estado, 403);
	assert.equal((await pedirJson('GET', '/pagos', 'falso')).estado, 401);
});

test('UC17: agrega por UC8, rechaza la repetida y la inválida', async () => {
	const cliente = await crearCliente();
	const alta = await pedirJson('POST', '/pagos/medios', cliente.token, OTRA_TARJETA);
	assert.equal(alta.estado, 201);
	assert.equal(alta.cuerpo.tipoTarjeta, 'Mastercard');
	assert.ok(!JSON.stringify(alta.cuerpo).includes(OTRA_TARJETA.numero));

	const repetida = await pedirJson('POST', '/pagos/medios', cliente.token, OTRA_TARJETA);
	assert.equal(repetida.estado, 409);
	const invalida = await pedirJson('POST', '/pagos/medios', cliente.token, { ...OTRA_TARJETA, numero: '123' });
	assert.equal(invalida.estado, 400);

	assert.equal((await pedirJson('GET', '/pagos/medios', cliente.token)).cuerpo.length, 2);
});

test('UC17: modificar deja la tarjeta anterior inactiva y el comprobante intacto', async () => {
	const cliente = await crearCliente();
	const factura = await crearFactura(cliente.id);
	await cobrar();
	const [{ cuerpo: [comprobante] }, { cuerpo: [medio] }] = await Promise.all([
		pedirJson('GET', '/pagos/comprobantes', cliente.token),
		pedirJson('GET', '/pagos/medios', cliente.token),
	]);

	const cambio = await pedirJson('PUT', `/pagos/medios/${medio.id}`, cliente.token, OTRA_TARJETA);
	assert.equal(cambio.estado, 200);
	assert.notEqual(cambio.cuerpo.id, medio.id);
	const medios = await pedirJson('GET', '/pagos/medios', cliente.token);
	assert.deepEqual(medios.cuerpo.map((fila) => fila.tipoTarjeta), ['Mastercard']);

	const detalle = await pedirJson('GET', `/pagos/comprobantes/${comprobante.id}`, cliente.token);
	assert.equal(detalle.cuerpo.tipoTarjeta, 'Visa');
	assert.equal(await estadoFactura(factura), 'Pagada');
});

test('UC17 E3: el titular con servicios vigentes conserva una tarjeta', async () => {
	const cliente = await crearCliente();
	const [medio] = (await pedirJson('GET', '/pagos/medios', cliente.token)).cuerpo;
	const unicaTarjeta = await pedirJson('DELETE', `/pagos/medios/${medio.id}`, cliente.token);
	assert.equal(unicaTarjeta.estado, 409);

	await pedirJson('POST', '/pagos/medios', cliente.token, OTRA_TARJETA);
	assert.equal((await pedirJson('DELETE', `/pagos/medios/${medio.id}`, cliente.token)).estado, 204);
	const { rows } = await pool.query('SELECT "estado" FROM medio_de_pago WHERE "id" = $1', [medio.id]);
	assert.equal(rows[0].estado, 'Inactiva');
});

test('UC17: el distribuidor sin dominios puede quedar sin tarjeta y una inactiva no cuenta como repetida', async () => {
	const distribuidor = await crearDistribuidor();
	const { cuerpo: medio } = await pedirJson('POST', '/pagos/medios', distribuidor.token, TARJETA);
	assert.equal((await pedirJson('DELETE', `/pagos/medios/${medio.id}`, distribuidor.token)).estado, 204);
	assert.equal((await pedirJson('POST', '/pagos/medios', distribuidor.token, TARJETA)).estado, 201);
});

test('UC17 E3: el distribuidor con dominios conserva una tarjeta', async () => {
	const distribuidor = await crearDistribuidor();
	const cliente = await crearCliente();
	const { cuerpo: medio } = await pedirJson('POST', '/pagos/medios', distribuidor.token, TARJETA);
	await pool.query(`INSERT INTO dominio ("nombre", "clienteId", "distribuidorId") VALUES ($1, $2, $3)`, [
		`${randomUUID()}.com`,
		cliente.id,
		distribuidor.id,
	]);
	assert.equal((await pedirJson('DELETE', `/pagos/medios/${medio.id}`, distribuidor.token)).estado, 409);
});

test('UC17: no toca tarjetas ajenas', async () => {
	const dueño = await crearCliente();
	const otro = await crearCliente();
	const [medio] = (await pedirJson('GET', '/pagos/medios', dueño.token)).cuerpo;
	assert.equal((await pedirJson('PUT', `/pagos/medios/${medio.id}`, otro.token, OTRA_TARJETA)).estado, 404);
	assert.equal((await pedirJson('DELETE', `/pagos/medios/${medio.id}`, otro.token)).estado, 404);
	assert.equal((await pedirJson('DELETE', '/pagos/medios/no-es-uuid', otro.token)).estado, 404);
});

test('UC17 E2: con la base caída queda pendiente y reconciliar lo aplica una vez', async () => {
	const cliente = await crearCliente();
	const caida = simularCaida();
	const pendiente = await pedirJson('POST', '/pagos/medios', cliente.token, OTRA_TARJETA);
	caida.mock.restore();
	assert.equal(pendiente.estado, 202);
	assert.equal(pendiente.cuerpo.pendienteDeReconciliacion, true);
	assert.equal((await pedirJson('GET', '/pagos/medios', cliente.token)).cuerpo.length, 1);

	const { aplicados, pendientes } = await reconciliar(aplicadoresDeRespaldoDePagos);
	assert.deepEqual({ aplicados, pendientes }, { aplicados: 1, pendientes: 0 });
	assert.equal((await pedirJson('GET', '/pagos/medios', cliente.token)).cuerpo.length, 2);
});

test('UC17 E2: el aplicador es idempotente y no revive una tarjeta eliminada', async () => {
	const cliente = await crearCliente();
	const [medio] = (await pedirJson('GET', '/pagos/medios', cliente.token)).cuerpo;
	const aplicar = aplicadoresDeRespaldoDePagos.MedioDePago;
	const fila = {
		titularId: cliente.id,
		tipoTarjeta: 'Mastercard',
		numeroEnmascarado: '**** **** **** 4444',
		fechaExpiración: '2098-06-30',
	};
	await aplicar({ fila });
	await aplicar({ fila });
	assert.equal((await pedirJson('GET', '/pagos/medios', cliente.token)).cuerpo.length, 2);

	await pedirJson('DELETE', `/pagos/medios/${medio.id}`, cliente.token);
	await aplicar({ id: medio.id, fila: { ...fila, tipoTarjeta: 'Diners' } });
	const medios = await pedirJson('GET', '/pagos/medios', cliente.token);
	assert.deepEqual(medios.cuerpo.map((fila) => fila.tipoTarjeta), ['Mastercard']);
});

test('cobro: exige permiso, paga una sola vez y deja el comprobante', async () => {
	const cliente = await crearCliente();
	const factura = await crearFactura(cliente.id);
	assert.equal((await pedirJson('POST', '/pagos/cobros', cliente.token)).estado, 403);

	const { estado, cuerpo } = await cobrar();
	assert.equal(estado, 201);
	assert.ok(cuerpo.exitosos >= 1);
	assert.equal(await estadoFactura(factura), 'Pagada');

	await cobrar();
	const comprobantes = await pedirJson('GET', '/pagos/comprobantes', cliente.token);
	assert.equal(comprobantes.cuerpo.length, 1);
	assert.equal(comprobantes.cuerpo[0].estado, 'Exitoso');
	assert.equal(comprobantes.cuerpo[0].monto, 100);
});

test('cobro: dos ejecuciones simultáneas no cobran dos veces', async () => {
	const cliente = await crearCliente();
	await crearFactura(cliente.id);
	await Promise.all([cobrar(), cobrar()]);
	assert.equal((await pedirJson('GET', '/pagos/comprobantes', cliente.token)).cuerpo.length, 1);
});

test('cobro: la pasarela rechaza, queda Fallido y la factura vencida pasa a Vencida', async () => {
	const cliente = await crearCliente();
	const vigente = await crearFactura(cliente.id);
	const vencida = await crearFactura(cliente.id, '2020-02-01');
	const rechazo = mock.method(PasarelaDePagoSimulada.prototype, 'cobrar', () => false);
	await cobrar();
	rechazo.mock.restore();

	assert.equal(await estadoFactura(vigente), 'Pendiente');
	assert.equal(await estadoFactura(vencida), 'Vencida');
	const comprobantes = await pedirJson('GET', '/pagos/comprobantes', cliente.token);
	assert.deepEqual(comprobantes.cuerpo.map((fila) => fila.estado), ['Fallido', 'Fallido']);

	await cobrar();
	assert.equal(await estadoFactura(vencida), 'Pagada');
});

test('cobro: sin tarjeta activa no crea comprobante', async () => {
	const distribuidor = await crearDistribuidor();
	const factura = await crearFactura(distribuidor.id, '2020-02-01');

	const { cuerpo } = await cobrar();
	assert.ok(cuerpo.sinMedioDePago >= 1);
	assert.equal(await estadoFactura(factura), 'Vencida');
	assert.deepEqual((await pedirJson('GET', '/pagos/comprobantes', distribuidor.token)).cuerpo, []);
});

test('UC18: el recibo PDF es del dueño y solo de cobros aprobados', async () => {
	const cliente = await crearCliente();
	await crearFactura(cliente.id);
	await cobrar();
	const [comprobante] = (await pedirJson('GET', '/pagos/comprobantes', cliente.token)).cuerpo;

	const recibo = await pedir('GET', `/pagos/comprobantes/${comprobante.id}/recibo`, cliente.token);
	assert.equal(recibo.status, 200);
	assert.equal(recibo.headers.get('content-type'), 'application/pdf');
	assert.equal(Buffer.from(await recibo.arrayBuffer()).subarray(0, 4).toString(), '%PDF');

	const otro = await crearCliente();
	assert.equal((await pedirJson('GET', `/pagos/comprobantes/${comprobante.id}`, otro.token)).estado, 404);
	assert.equal((await pedir('GET', `/pagos/comprobantes/${comprobante.id}/recibo`, otro.token)).status, 404);

	await crearFactura(cliente.id);
	const rechazo = mock.method(PasarelaDePagoSimulada.prototype, 'cobrar', () => false);
	await cobrar();
	rechazo.mock.restore();
	const comprobantes = (await pedirJson('GET', '/pagos/comprobantes', cliente.token)).cuerpo;
	const fallido = comprobantes.find((fila) => fila.estado === 'Fallido');
	assert.equal((await pedir('GET', `/pagos/comprobantes/${fallido.id}/recibo`, cliente.token)).status, 409);
});
