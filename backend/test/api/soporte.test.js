import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/baseDeDatos.js';
import { generarHash } from '../../src/config/hash.js';
import { crearAdministrador } from '../../src/servicios/usuarios/ServicioDeUsuarios.js';
import { escalarTicketsVencidos } from '../../src/servicios/soporte/ServicioDeTickets.js';

const CLAVE = 'clave-segura';
const TARJETA = { franquicia: 'Visa', numero: '4111111111111111', fechaExpiración: '2099-12-31' };
const DIRECCION = { calle: 'Calle 1', ciudad: 'Bogotá', departamentoOPaís: 'Colombia', códigoPostal: '110111' };
const DOS_DIAS_Y_MEDIO = 60 * 60 * 60 * 1000;

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

async function pedirJson(metodo, ruta, token, cuerpo) {
	const respuesta = await fetch(`${base}/api${ruta}`, {
		method: metodo,
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
	});
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
		nombreCompleto: 'Ana Pérez',
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

async function crearTécnico(nivel) {
	const correo = correoNuevo();
	const { rows } = await pool.query('INSERT INTO usuario ("correo", "contraseña") VALUES ($1, $2) RETURNING "id"', [
		correo,
		await generarHash(CLAVE),
	]);
	const { id } = rows[0];
	await pool.query('INSERT INTO empleado ("id", "nombreCompleto", "documento") VALUES ($1, $2, $3)', [
		id,
		'Técnico de Prueba',
		unico(),
	]);
	await pool.query('INSERT INTO tecnico_de_soporte ("id", "nivelDeServicio") VALUES ($1, $2)', [id, nivel]);
	return { id, token: await abrirSesion(correo) };
}

async function crearDominio(clienteId, distribuidorId = null) {
	const { rows } = await pool.query(
		'INSERT INTO dominio ("nombre", "clienteId", "distribuidorId") VALUES ($1, $2, $3) RETURNING "id"',
		[`${randomUUID()}.com`, clienteId, distribuidorId],
	);
	return rows[0].id;
}

async function abrirTicket(prioridad = 'Alta') {
	const cliente = await crearCliente();
	const dominioId = await crearDominio(cliente.id);
	const { cuerpo } = await pedirJson('POST', '/soporte/tickets', cliente.token, {
		dominioId,
		descripción: 'El sitio no carga',
		prioridad,
	});
	return { cliente, ticket: cuerpo };
}

const tomar = (técnico, id) => pedirJson('POST', `/soporte/tickets/${id}/toma`, técnico.token);
const resolver = (técnico, id, solución = 'Se reinició') =>
	pedirJson('POST', `/soporte/tickets/${id}/resolucion`, técnico.token, { solución });
const escalar = (técnico, id, motivo = 'Excede mi competencia') =>
	pedirJson('POST', `/soporte/tickets/${id}/escalamiento`, técnico.token, { motivo });
const anotar = (técnico, id, nota = 'Sigo revisando') =>
	pedirJson('PUT', `/soporte/tickets/${id}/nota`, técnico.token, { nota });
const envejecer = (id) =>
	pool.query('UPDATE ticket SET "fechaInicioSLA" = $2 WHERE "id" = $1', [id, new Date(Date.now() - DOS_DIAS_Y_MEDIO)]);

async function leer(id) {
	const { rows } = await pool.query('SELECT * FROM ticket WHERE "id" = $1', [id]);
	return rows[0];
}

before(async () => {
	await new Promise((resolverEscucha) => {
		servidor = app.listen(0, resolverEscucha);
	});
	base = `http://127.0.0.1:${servidor.address().port}`;
	tokenClientes = await crearAdmin('Administrador de Clientes');
	tokenCanales = await crearAdmin('Administrador de Canales');
});

after(async () => {
	await pool.query('DELETE FROM ticket WHERE "solicitanteId" = ANY($1)', [titulares]);
	await pool.query('DELETE FROM dominio WHERE "clienteId" = ANY($1)', [titulares]);
	await pool.query('DELETE FROM medio_de_pago WHERE "titularId" = ANY($1)', [titulares]);
	const { rows } = await pool.query('SELECT "id" FROM usuario WHERE "correo" = ANY($1)', [correos]);
	const ids = rows.map((fila) => fila.id);
	for (const tabla of ['cliente', 'distribuidor', 'administrador', 'tecnico_de_soporte', 'empleado', 'usuario']) {
		await pool.query(`DELETE FROM ${tabla} WHERE "id" = ANY($1)`, [ids]);
	}
	await pool.end();
	await new Promise((resolverCierre) => servidor.close(resolverCierre));
});

test('UC22: el cliente abre un ticket Abierto en Nivel 1 sobre su dominio', async () => {
	const cliente = await crearCliente();
	const dominioId = await crearDominio(cliente.id);
	const sitios = await pedirJson('GET', '/soporte/sitios', cliente.token);
	assert.deepEqual(sitios.cuerpo.map((sitio) => sitio.id), [dominioId]);

	const { estado, cuerpo } = await pedirJson('POST', '/soporte/tickets', cliente.token, {
		dominioId,
		descripción: 'El sitio no carga',
		prioridad: 'Media',
	});
	assert.equal(estado, 201);
	assert.equal(cuerpo.estado, 'Abierto');
	assert.equal(cuerpo.nivelActual, 'Nivel1');
	assert.equal(cuerpo.tecnicoAsignadoId, null);
	assert.ok(cuerpo.fechaInicioSLA);
});

test('UC22: valida los datos y un dominio ajeno responde 404', async () => {
	const dueño = await crearCliente();
	const ajeno = await crearCliente();
	const dominioId = await crearDominio(dueño.id);
	const datos = { dominioId, descripción: 'Falla', prioridad: 'Alta' };
	const crear = (cambios, token = dueño.token) =>
		pedirJson('POST', '/soporte/tickets', token, { ...datos, ...cambios });

	assert.equal((await crear({ descripción: 'x'.repeat(501) })).estado, 400);
	assert.equal((await crear({ descripción: '' })).estado, 400);
	assert.equal((await crear({ prioridad: 'Urgente' })).estado, 400);
	assert.equal((await crear({ dominioId: 'no-es-uuid' })).estado, 404);
	assert.equal((await crear({}, ajeno.token)).estado, 404);
});

test('UC22: el distribuidor abre tickets solo sobre los dominios que gestiona', async () => {
	const cliente = await crearCliente();
	const distribuidor = await crearDistribuidor();
	const sinDominios = await pedirJson('GET', '/soporte/sitios', distribuidor.token);
	assert.deepEqual(sinDominios.cuerpo, []);

	const dominioId = await crearDominio(cliente.id, distribuidor.id);
	const { estado, cuerpo } = await pedirJson('POST', '/soporte/tickets', distribuidor.token, {
		dominioId,
		descripción: 'Falla',
		prioridad: 'Baja',
	});
	assert.equal(estado, 201);
	assert.equal((await leer(cuerpo.id)).solicitanteId, distribuidor.id);
});

test('Las rutas respetan el rol', async () => {
	const cliente = await crearCliente();
	const técnico = await crearTécnico('Nivel1');
	assert.equal((await pedirJson('GET', '/soporte/tablero', cliente.token)).estado, 403);
	assert.equal((await pedirJson('GET', '/soporte/tickets', técnico.token)).estado, 403);
	assert.equal((await pedirJson('GET', '/soporte/sitios', tokenClientes)).estado, 403);
	assert.equal((await tomar(cliente, randomUUID())).estado, 403);
	assert.equal((await tomar(técnico, randomUUID())).estado, 404);
	assert.equal((await tomar(técnico, 'no-es-uuid')).estado, 404);
});

test('UC23: el tablero muestra el nivel del técnico, filtra y da precedencia a los rezagados', async () => {
	const técnico = await crearTécnico('Nivel2');
	const delTablero = async (consulta = '') => {
		const { cuerpo } = await pedirJson('GET', `/soporte/tablero${consulta}`, técnico.token);
		return cuerpo.map((ticket) => ticket.id);
	};
	const { ticket: baja } = await abrirTicket('Baja');
	const { ticket: alta } = await abrirTicket('Alta');
	const { ticket: rezagado } = await abrirTicket('Baja');
	const { ticket: otroNivel } = await abrirTicket('Alta');
	await pool.query(`UPDATE ticket SET "nivelActual" = 'Nivel2' WHERE "id" = ANY($1)`, [[baja.id, alta.id, rezagado.id]]);
	await pool.query(`UPDATE ticket SET "estado" = 'Rezagado-SLAVencido' WHERE "id" = $1`, [rezagado.id]);

	const todos = await delTablero();
	assert.ok(!todos.includes(otroNivel.id));
	const propios = todos.filter((id) => [baja.id, alta.id, rezagado.id].includes(id));
	assert.deepEqual(propios, [rezagado.id, alta.id, baja.id]);

	assert.ok((await delTablero('?prioridad=Alta')).includes(alta.id));
	assert.ok(!(await delTablero('?prioridad=Alta')).includes(baja.id));
	assert.ok((await delTablero('?estado=Rezagado-SLAVencido')).includes(rezagado.id));
	assert.ok(!(await delTablero('?estado=Rezagado-SLAVencido')).includes(alta.id));
	assert.equal((await pedirJson('GET', '/soporte/tablero?estado=Otro', técnico.token)).estado, 400);
});

test('UC23: tomar y resolver dejan la solución visible para el titular', async () => {
	const { cliente, ticket } = await abrirTicket();
	const técnico = await crearTécnico('Nivel1');
	const tomado = await tomar(técnico, ticket.id);
	assert.equal(tomado.estado, 200);
	assert.equal(tomado.cuerpo.estado, 'EnProgreso');
	assert.equal(tomado.cuerpo.tecnicoAsignadoId, técnico.id);
	assert.ok(tomado.cuerpo.fechaToma);

	assert.equal((await resolver(técnico, ticket.id, '')).estado, 400);
	const resuelto = await resolver(técnico, ticket.id);
	assert.equal(resuelto.estado, 200);
	assert.equal(resuelto.cuerpo.estado, 'Resuelto');
	assert.ok(resuelto.cuerpo.notificación);

	const { cuerpo } = await pedirJson('GET', '/soporte/tickets', cliente.token);
	assert.equal(cuerpo[0].estado, 'Resuelto');
	assert.equal(cuerpo[0].solución, 'Se reinició');
	assert.equal('notaDeAvance' in cuerpo[0], false);
	assert.equal('motivoEscalamiento' in cuerpo[0], false);
});

test('UC23: otro nivel no toma y solo el asignado resuelve, anota o escala', async () => {
	const { ticket } = await abrirTicket();
	const técnico = await crearTécnico('Nivel1');
	const colega = await crearTécnico('Nivel1');
	assert.equal((await tomar(await crearTécnico('Nivel2'), ticket.id)).estado, 403);
	await tomar(técnico, ticket.id);
	assert.equal((await tomar(colega, ticket.id)).estado, 409);
	assert.equal((await resolver(colega, ticket.id)).estado, 403);
	assert.equal((await anotar(colega, ticket.id)).estado, 403);
	assert.equal((await escalar(colega, ticket.id)).estado, 403);
});

test('UC23: dos técnicos que toman a la vez: uno gana y el otro recibe 409', async () => {
	const { ticket } = await abrirTicket();
	const uno = await crearTécnico('Nivel1');
	const otro = await crearTécnico('Nivel1');
	const respuestas = await Promise.all([tomar(uno, ticket.id), tomar(otro, ticket.id)]);
	assert.deepEqual(respuestas.map((respuesta) => respuesta.estado).sort(), [200, 409]);
});

test('UC23 E1: la nota se guarda sin mover el ticket ni el SLA', async () => {
	const { ticket } = await abrirTicket();
	const técnico = await crearTécnico('Nivel1');
	await tomar(técnico, ticket.id);
	const antes = await leer(ticket.id);
	assert.equal((await anotar(técnico, ticket.id, '')).estado, 400);
	assert.equal((await anotar(técnico, ticket.id, 'primera')).estado, 200);
	const { estado, cuerpo } = await anotar(técnico, ticket.id, 'primera');
	assert.equal(estado, 200);
	assert.equal(cuerpo.notaDeAvance, 'primera');
	const después = await leer(ticket.id);
	assert.equal(después.estado, 'EnProgreso');
	assert.deepEqual(después.fechaInicioSLA, antes.fechaInicioSLA);
});

test('UC23: un ticket resuelto no acepta nada más', async () => {
	const { ticket } = await abrirTicket();
	const técnico = await crearTécnico('Nivel1');
	await tomar(técnico, ticket.id);
	await resolver(técnico, ticket.id);
	assert.equal((await tomar(técnico, ticket.id)).estado, 409);
	assert.equal((await resolver(técnico, ticket.id)).estado, 409);
	assert.equal((await anotar(técnico, ticket.id)).estado, 409);
	assert.equal((await escalar(técnico, ticket.id)).estado, 409);
});

test('UC24: escalar sube de nivel, guarda el motivo y devuelve el ticket a la cola', async () => {
	const { ticket } = await abrirTicket();
	const técnico = await crearTécnico('Nivel1');
	await tomar(técnico, ticket.id);
	await anotar(técnico, ticket.id, 'Revisé el DNS');
	assert.equal((await escalar(técnico, ticket.id, '')).estado, 400);

	const { estado, cuerpo } = await escalar(técnico, ticket.id, 'Requiere infraestructura');
	assert.equal(estado, 200);
	assert.equal(cuerpo.estado, 'Abierto');
	assert.equal(cuerpo.nivelActual, 'Nivel2');
	assert.equal(cuerpo.tecnicoAsignadoId, null);
	assert.equal(cuerpo.fechaToma, null);
	assert.equal(cuerpo.motivoEscalamiento, 'Requiere infraestructura');
	assert.equal(cuerpo.notaDeAvance, 'Revisé el DNS');
});

test('UC24: en Nivel 3 no se escala y sin asignar tampoco', async () => {
	const { ticket } = await abrirTicket();
	const técnico = await crearTécnico('Nivel3');
	assert.equal((await escalar(técnico, ticket.id)).estado, 403);
	await pool.query(`UPDATE ticket SET "nivelActual" = 'Nivel3' WHERE "id" = $1`, [ticket.id]);
	await tomar(técnico, ticket.id);
	assert.equal((await escalar(técnico, ticket.id)).estado, 409);
	const fila = await leer(ticket.id);
	assert.equal(fila.estado, 'EnProgreso');
	assert.equal(fila.motivoEscalamiento, null);
});

test('UC25: vence en cada estado sin resolver y reinicia el SLA', async () => {
	const técnico = await crearTécnico('Nivel1');
	const { ticket: abierto } = await abrirTicket();
	const { ticket: enCurso } = await abrirTicket();
	const { ticket: rezagado } = await abrirTicket();
	await tomar(técnico, enCurso.id);
	await pool.query(`UPDATE ticket SET "estado" = 'Rezagado-SLAVencido' WHERE "id" = $1`, [rezagado.id]);
	for (const { id } of [abierto, enCurso, rezagado]) await envejecer(id);

	assert.ok((await escalarTicketsVencidos()) >= 3);
	for (const { id } of [abierto, enCurso, rezagado]) {
		const fila = await leer(id);
		assert.equal(fila.estado, 'Rezagado-SLAVencido');
		assert.equal(fila.nivelActual, 'Nivel2');
		assert.equal(fila.tecnicoAsignadoId, null);
		assert.equal(fila.fechaToma, null);
		assert.ok(Date.now() - fila.fechaInicioSLA.getTime() < 60000);
	}
});

test('UC25: en Nivel 3 queda Rezagado sin subir y no toca lo vigente ni lo resuelto', async () => {
	const técnico = await crearTécnico('Nivel1');
	const { ticket: tope } = await abrirTicket();
	const { ticket: vigente } = await abrirTicket('Baja');
	const { ticket: resuelto } = await abrirTicket();
	await pool.query(`UPDATE ticket SET "nivelActual" = 'Nivel3' WHERE "id" = $1`, [tope.id]);
	await tomar(técnico, resuelto.id);
	await resolver(técnico, resuelto.id);
	await envejecer(tope.id);
	await envejecer(resuelto.id);

	await escalarTicketsVencidos();
	const filaTope = await leer(tope.id);
	assert.equal(filaTope.estado, 'Rezagado-SLAVencido');
	assert.equal(filaTope.nivelActual, 'Nivel3');
	assert.equal((await leer(vigente.id)).estado, 'Abierto');
	const filaResuelto = await leer(resuelto.id);
	assert.equal(filaResuelto.estado, 'Resuelto');
	assert.equal(filaResuelto.nivelActual, 'Nivel1');
});
