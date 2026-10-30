import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, mock, test } from 'node:test';

const carpeta = await mkdtemp(join(tmpdir(), 'chibchaweb-'));
process.env.RUTA_RESPALDO = join(carpeta, 'contingencia.jsonl');
process.env.ALGORITMO_RESPALDO = 'ChaCha20';

const { app } = await import('../../src/app.js');
const { enTransaccion, esCaidaDeBase, pool } = await import('../../src/config/baseDeDatos.js');
const { aplicadoresDeRespaldo } = await import('../../src/servicios/perfiles/ServicioDePerfiles.js');
const { reconciliar } = await import('../../src/servicios/respaldo/ServicioDeContingencia.js');
const { crearAdministrador } = await import('../../src/servicios/usuarios/ServicioDeUsuarios.js');

const CLAVE = 'clave-segura';
const correos = [];
let servidor;
let base;
let token;
const sesiones = {};

async function pedir(metodo, ruta, cuerpo) {
	const respuesta = await fetch(`${base}/api${ruta}`, {
		method: metodo,
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
	});
	return { estado: respuesta.status, cuerpo: await respuesta.json() };
}

function nuevoCliente() {
	const correo = `${randomUUID()}@prueba.com`;
	correos.push(correo);
	return {
		correo,
		contraseña: CLAVE,
		nombreCompleto: 'Cliente Contingencia',
		tipoDocumento: 'CC',
		numeroDocumento: randomUUID().slice(0, 30),
		paqueteHosting: 'Chibcha-Oro',
		planDePago: 'Anual',
		dirección: { calle: 'Calle 1', ciudad: 'Bogotá', departamentoOPaís: 'Colombia', códigoPostal: '110111' },
		tarjeta: { franquicia: 'Visa', numero: '4111111111111111', fechaExpiración: '2099-12-31' },
	};
}

/** pool.query también pasa por connect, con callback: solo se corta la transacción. */
function simularCaida() {
	const original = pool.connect;
	return mock.method(pool, 'connect', function (...argumentos) {
		if (argumentos.length > 0) return original.apply(this, argumentos);
		return Promise.reject(Object.assign(new Error('caída simulada'), { code: 'ECONNREFUSED' }));
	});
}

async function existe(correo) {
	const { rowCount } = await pool.query('SELECT 1 FROM usuario WHERE "correo" = $1', [correo]);
	return rowCount === 1;
}

before(async () => {
	await new Promise((resolver) => {
		servidor = app.listen(0, resolver);
	});
	base = `http://127.0.0.1:${servidor.address().port}`;
	for (const [clave, rol] of [
		['clientes', 'Administrador de Clientes'],
		['personal', 'Administrador de Personal'],
		['canales', 'Administrador de Canales'],
	]) {
		const correo = `${randomUUID()}@prueba.com`;
		correos.push(correo);
		await crearAdministrador({
			correo,
			contraseña: CLAVE,
			nombreCompleto: 'Admin',
			documento: randomUUID().slice(0, 30),
			rol,
		});
		const respuesta = await pedir('POST', '/usuarios/sesion', { correo, contraseña: CLAVE });
		sesiones[clave] = respuesta.cuerpo.token;
	}
	token = sesiones.clientes;
});

after(async () => {
	const { rows } = await pool.query('SELECT "id" FROM usuario WHERE "correo" = ANY($1)', [correos]);
	const ids = rows.map((fila) => fila.id);
	for (const tabla of ['cliente', 'distribuidor', 'administrador', 'tecnico_de_soporte', 'empleado', 'usuario']) {
		await pool.query(`DELETE FROM ${tabla} WHERE "id" = ANY($1)`, [ids]);
	}
	await pool.end();
	await new Promise((resolver) => servidor.close(resolver));
	await rm(carpeta, { recursive: true });
});

test('UC6 E5: con la base caída el alta se cifra y luego se reconcilia', async () => {
	const datos = nuevoCliente();
	const caida = simularCaida();
	const { estado, cuerpo } = await pedir('POST', '/perfiles/clientes', datos);
	caida.mock.restore();

	assert.equal(estado, 202);
	assert.equal(cuerpo.pendienteDeReconciliacion, true);
	assert.equal(await existe(datos.correo), false);

	const archivo = await readFile(process.env.RUTA_RESPALDO, 'utf8');
	assert.equal(archivo.trim().split('\n').length, 1);
	for (const secreto of [datos.correo, datos.tarjeta.numero, '1111', datos.numeroDocumento]) {
		assert.equal(archivo.includes(`"${secreto}`), false);
	}
	assert.equal(JSON.parse(archivo).algoritmo, 'ChaCha20');

	assert.deepEqual(await reconciliar(aplicadoresDeRespaldo), { aplicados: 1, pendientes: 0 });
	assert.equal(await existe(datos.correo), true);
	assert.equal(await readFile(process.env.RUTA_RESPALDO, 'utf8'), '');

	const sesion = await pedir('POST', '/usuarios/sesion', { correo: datos.correo, contraseña: CLAVE });
	assert.equal(sesion.estado, 200);
});

async function conCaida(metodo, ruta, cuerpo) {
	const caida = simularCaida();
	const respuesta = await pedir(metodo, ruta, cuerpo);
	caida.mock.restore();
	assert.equal(respuesta.estado, 202);
	assert.equal(respuesta.cuerpo.pendienteDeReconciliacion, true);
}

test('UC6: con la base caída la edición también se respalda y se reconcilia', async () => {
	const datos = nuevoCliente();
	const { cuerpo: creado } = await pedir('POST', '/perfiles/clientes', datos);
	await conCaida('PUT', `/perfiles/clientes/${creado.id}`, { ...datos, nombreCompleto: 'Editado Luego' });
	assert.equal((await pedir('GET', `/perfiles/clientes/${creado.id}`)).cuerpo.nombreCompleto, 'Cliente Contingencia');

	assert.deepEqual(await reconciliar(aplicadoresDeRespaldo), { aplicados: 1, pendientes: 0 });
	assert.equal((await pedir('GET', `/perfiles/clientes/${creado.id}`)).cuerpo.nombreCompleto, 'Editado Luego');
});

test('UC9 E1: alta y edición de personal se respaldan y se reconcilian', async () => {
	token = sesiones.personal;
	const base = { contraseña: CLAVE, nombreCompleto: 'Empleado', tipo: 'Administrador', rol: 'Administrador de Canales' };
	const empleado = { ...base, correo: `${randomUUID()}@prueba.com`, documento: randomUUID().slice(0, 30) };
	correos.push(empleado.correo);
	await conCaida('POST', '/perfiles/personal', empleado);
	assert.deepEqual(await reconciliar(aplicadoresDeRespaldo), { aplicados: 1, pendientes: 0 });

	const [fila] = await pedir('GET', `/perfiles/personal?buscar=${empleado.documento}`).then((r) => r.cuerpo);
	const ruta = `/perfiles/personal/${fila.id}`;
	await conCaida('PUT', ruta, { ...empleado, cargo: 'Coordinación', rol: 'Administrador de Clientes' });
	assert.deepEqual(await reconciliar(aplicadoresDeRespaldo), { aplicados: 1, pendientes: 0 });
	const { cuerpo } = await pedir('GET', ruta);
	assert.equal(cuerpo.rol, 'Administrador de Clientes');
	assert.equal(cuerpo.cargo, 'Coordinación');
	token = sesiones.clientes;
});

test('UC10 E2: alta y edición de distribuidor se respaldan y se reconcilian', async () => {
	token = sesiones.canales;
	const canal = { correo: `${randomUUID()}@prueba.com`, contraseña: CLAVE, razónSocial: 'Canal', nit: randomUUID().slice(0, 30) };
	correos.push(canal.correo);
	await conCaida('POST', '/perfiles/distribuidores', canal);
	assert.deepEqual(await reconciliar(aplicadoresDeRespaldo), { aplicados: 1, pendientes: 0 });

	const [fila] = await pedir('GET', `/perfiles/distribuidores?buscar=${canal.nit}`).then((r) => r.cuerpo);
	const ruta = `/perfiles/distribuidores/${fila.id}`;
	await conCaida('PUT', ruta, { ...canal, razónSocial: 'Canal Editado' });
	assert.deepEqual(await reconciliar(aplicadoresDeRespaldo), { aplicados: 1, pendientes: 0 });
	const { cuerpo } = await pedir('GET', ruta);
	assert.equal(cuerpo.razónSocial, 'Canal Editado');
	assert.equal(Number(cuerpo.comisiónAplicable), 10);
	token = sesiones.clientes;
});

test('un respaldo que no se puede aplicar queda en el archivo', async () => {
	const datos = nuevoCliente();
	const caida = simularCaida();
	await pedir('POST', '/perfiles/clientes', datos);
	caida.mock.restore();
	await pedir('POST', '/perfiles/clientes', { ...datos, numeroDocumento: randomUUID().slice(0, 30) });

	assert.deepEqual(await reconciliar(aplicadoresDeRespaldo), { aplicados: 0, pendientes: 1 });
	assert.equal((await readFile(process.env.RUTA_RESPALDO, 'utf8')).trim().split('\n').length, 1);
});

test('un error de datos no activa la contingencia', async () => {
	const datos = nuevoCliente();
	await pedir('POST', '/perfiles/clientes', datos);
	const repetido = await pedir('POST', '/perfiles/clientes', { ...datos, numeroDocumento: 'otro' + randomUUID().slice(0, 20) });
	assert.equal(repetido.estado, 409);
});

test('una conexión perdida a media transacción se reconoce como caída y no tumba el proceso', async () => {
	await assert.rejects(
		enTransaccion(async (conexion) => {
			const { rows } = await conexion.query('SELECT pg_backend_pid() AS pid');
			await pool.query('SELECT pg_terminate_backend($1)', [rows[0].pid]);
			await new Promise((resolver) => setTimeout(resolver, 100));
			await conexion.query('SELECT 1');
		}),
		esCaidaDeBase,
	);
	assert.equal(esCaidaDeBase(Object.assign(new Error('x'), { code: '23505' })), false);
});
