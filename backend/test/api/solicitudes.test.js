import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, mock, test } from 'node:test';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/baseDeDatos.js';
import { RegistradorSimulado } from '../../src/dominio/solicitudes/RegistradorSimulado.js';
import { crearAdministrador } from '../../src/servicios/usuarios/ServicioDeUsuarios.js';

const CLAVE = 'clave-segura';
const TARJETA = { franquicia: 'Visa', numero: '4111111111111111', fechaExpiración: '2099-12-31' };
const DIRECCION = { calle: 'Calle 1 & 2', ciudad: 'Bogotá', departamentoOPaís: 'Colombia', códigoPostal: '110111' };

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
const dominioNuevo = () => `${randomUUID()}.com`;

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

async function crearCliente(cambios = {}) {
	const correo = correoNuevo();
	const { cuerpo } = await pedirJson('POST', '/perfiles/clientes', tokenClientes, {
		correo,
		contraseña: CLAVE,
		nombreCompleto: 'Ana <Pérez>',
		tipoDocumento: 'CC',
		numeroDocumento: unico(),
		paqueteHosting: 'Chibcha-Plata',
		planDePago: 'Mensual',
		dirección: DIRECCION,
		tarjeta: TARJETA,
		...cambios,
	});
	titulares.push(cuerpo.id);
	return { id: cuerpo.id, correo, token: await abrirSesion(correo) };
}

const solicitar = (token, nombreDominioSolicitado = dominioNuevo()) =>
	pedirJson('POST', '/solicitudes', token, { nombreDominioSolicitado });

before(async () => {
	await new Promise((resolver) => {
		servidor = app.listen(0, resolver);
	});
	base = `http://127.0.0.1:${servidor.address().port}`;
	tokenClientes = await crearAdmin('Administrador de Clientes');
	tokenCanales = await crearAdmin('Administrador de Canales');
});

after(async () => {
	await pool.query('DELETE FROM solicitud_de_dominio WHERE "clienteId" = ANY($1)', [titulares]);
	await pool.query('DELETE FROM dominio WHERE "clienteId" = ANY($1)', [titulares]);
	await pool.query('DELETE FROM medio_de_pago WHERE "titularId" = ANY($1)', [titulares]);
	const { rows } = await pool.query('SELECT "id" FROM usuario WHERE "correo" = ANY($1)', [correos]);
	const ids = rows.map((fila) => fila.id);
	for (const tabla of ['cliente', 'distribuidor', 'administrador', 'tecnico_de_soporte', 'empleado', 'usuario']) {
		await pool.query(`DELETE FROM ${tabla} WHERE "id" = ANY($1)`, [ids]);
	}
	await pool.end();
	await new Promise((resolver) => servidor.close(resolver));
});

test('UC19 y UC20: guarda la solicitud Generada con su XML, sin crear el dominio', async () => {
	const cliente = await crearCliente();
	const nombre = dominioNuevo();
	const { estado, cuerpo } = await solicitar(cliente.token, nombre.toUpperCase());
	assert.equal(estado, 201);
	assert.equal(cuerpo.estado, 'Generada');
	assert.equal(cuerpo.nombreDominioSolicitado, nombre);
	assert.equal(cuerpo.formatoVersionXml, '1.0');
	assert.equal(cuerpo.dominioId, null);

	const { rowCount } = await pool.query('SELECT 1 FROM dominio WHERE "nombre" = $1', [nombre]);
	assert.equal(rowCount, 0);
	assert.equal((await pedirJson('GET', '/solicitudes', cliente.token)).cuerpo.length, 1);
	assert.equal((await pedirJson('GET', `/solicitudes/${cuerpo.id}`, cliente.token)).cuerpo.id, cuerpo.id);
});

test('UC20: el XML descargable lleva declaración, datos del titular y texto escapado', async () => {
	const cliente = await crearCliente();
	const nombre = dominioNuevo();
	const { cuerpo } = await solicitar(cliente.token, nombre);

	const respuesta = await pedir('GET', `/solicitudes/${cuerpo.id}/xml`, cliente.token);
	assert.equal(respuesta.status, 200);
	assert.match(respuesta.headers.get('content-type'), /^application\/xml/);
	const xml = await respuesta.text();
	assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
	assert.ok(xml.includes('xmlns="urn:chibchaweb:params:xml:ns:solicitud-1.0"'));
	assert.ok(xml.includes(`<nombre>${nombre}</nombre>`));
	assert.ok(xml.includes('<nombre>Ana &lt;Pérez&gt;</nombre>'));
	assert.ok(xml.includes('<calle>Calle 1 &amp; 2</calle>'));
	assert.ok(xml.includes(`<correo>${cliente.correo}</correo>`));
	assert.ok(xml.includes(`<idTransaccion>${cuerpo.id}</idTransaccion>`));
	assert.equal(xml.includes('ns2.chibchaweb.com'), true);
});

test('UC20: sin dirección el XML la omite', async () => {
	const correo = correoNuevo();
	const { cuerpo: registro } = await pedirJson('POST', '/usuarios/registro', '', {
		correo,
		contraseña: CLAVE,
		preguntaSeguridad: '¿Mascota?',
		respuestaSeguridad: 'Luna',
		nombreCompleto: 'Sin Dirección',
		tipoDocumento: 'CC',
		numeroDocumento: unico(),
		paqueteHosting: 'Chibcha-Plata',
		planDePago: 'Mensual',
	});
	titulares.push(registro.id);
	const token = await abrirSesion(correo);
	const { cuerpo } = await solicitar(token);
	const xml = await (await pedir('GET', `/solicitudes/${cuerpo.id}/xml`, token)).text();
	assert.equal(xml.includes('<direccion>'), false);
});

test('UC19 E1: rechaza nombres vacíos o sin formato de dominio', async () => {
	const cliente = await crearCliente();
	for (const nombre of [undefined, '', 'sin-punto', 'con espacio.com', '-guion.com', 'a.b', `${'a'.repeat(64)}.com`]) {
		const { estado, cuerpo } = await pedirJson('POST', '/solicitudes', cliente.token, {
			nombreDominioSolicitado: nombre,
		});
		assert.equal(estado, 400, String(nombre));
		assert.equal(cuerpo.campo, 'nombreDominioSolicitado');
	}
	assert.deepEqual((await pedirJson('GET', '/solicitudes', cliente.token)).cuerpo, []);
});

test('UC19: solo el Cliente solicita y cada uno ve lo suyo', async () => {
	const correo = correoNuevo();
	const { cuerpo: distribuidor } = await pedirJson('POST', '/perfiles/distribuidores', tokenCanales, {
		correo,
		contraseña: CLAVE,
		razónSocial: `Distribuidora ${unico()}`,
		nit: unico(),
		tarjeta: TARJETA,
	});
	titulares.push(distribuidor.id);
	assert.equal((await solicitar(await abrirSesion(correo))).estado, 403);
	assert.equal((await solicitar(tokenClientes)).estado, 403);
	assert.equal((await pedirJson('GET', '/solicitudes', 'falso')).estado, 401);

	const dueño = await crearCliente();
	const otro = await crearCliente();
	const { cuerpo } = await solicitar(dueño.token);
	assert.equal((await pedirJson('GET', `/solicitudes/${cuerpo.id}`, otro.token)).estado, 404);
	assert.equal((await pedirJson('GET', `/solicitudes/${cuerpo.id}/xml`, otro.token)).estado, 404);
	assert.equal((await pedirJson('POST', `/solicitudes/${cuerpo.id}/envio`, otro.token)).estado, 404);
	assert.equal((await pedirJson('GET', '/solicitudes/no-es-uuid', otro.token)).estado, 404);
});

test('UC21: confirma, pasa a Enviada, crea el Dominio del cliente y no se repite', async () => {
	const cliente = await crearCliente();
	const nombre = dominioNuevo();
	const { cuerpo: solicitud } = await solicitar(cliente.token, nombre);

	const { estado, cuerpo } = await pedirJson('POST', `/solicitudes/${solicitud.id}/envio`, cliente.token);
	assert.equal(estado, 200);
	assert.equal(cuerpo.estado, 'Enviada');
	assert.ok(cuerpo.mensaje);
	const { rows } = await pool.query('SELECT * FROM dominio WHERE "id" = $1', [cuerpo.dominioId]);
	assert.equal(rows[0].nombre, nombre);
	assert.equal(rows[0].clienteId, cliente.id);
	assert.equal(rows[0].distribuidorId, null);

	assert.equal((await pedirJson('POST', `/solicitudes/${solicitud.id}/envio`, cliente.token)).estado, 409);
});

test('UC21: dos envíos simultáneos registran un solo dominio', async () => {
	const cliente = await crearCliente();
	const { cuerpo: solicitud } = await solicitar(cliente.token);
	const envios = await Promise.all([
		pedirJson('POST', `/solicitudes/${solicitud.id}/envio`, cliente.token),
		pedirJson('POST', `/solicitudes/${solicitud.id}/envio`, cliente.token),
	]);
	assert.deepEqual(envios.map((envio) => envio.estado).sort(), [200, 409]);
});

test('UC21: un dominio ya registrado responde 409 y la solicitud sigue Generada', async () => {
	const primero = await crearCliente();
	const segundo = await crearCliente();
	const nombre = dominioNuevo();
	const { cuerpo: ganadora } = await solicitar(primero.token, nombre);
	const { cuerpo: perdedora } = await solicitar(segundo.token, nombre);
	await pedirJson('POST', `/solicitudes/${ganadora.id}/envio`, primero.token);

	assert.equal((await pedirJson('POST', `/solicitudes/${perdedora.id}/envio`, segundo.token)).estado, 409);
	const { cuerpo } = await pedirJson('GET', `/solicitudes/${perdedora.id}`, segundo.token);
	assert.equal(cuerpo.estado, 'Generada');
	assert.equal(cuerpo.dominioId, null);
});

test('UC21: sin confirmación del registrador no cambia nada', async () => {
	const cliente = await crearCliente();
	const { cuerpo: solicitud } = await solicitar(cliente.token);
	const rechazo = mock.method(RegistradorSimulado.prototype, 'enviar', () => false);
	const { estado } = await pedirJson('POST', `/solicitudes/${solicitud.id}/envio`, cliente.token);
	rechazo.mock.restore();
	assert.equal(estado, 502);
	const { cuerpo } = await pedirJson('GET', `/solicitudes/${solicitud.id}`, cliente.token);
	assert.equal(cuerpo.estado, 'Generada');
});
