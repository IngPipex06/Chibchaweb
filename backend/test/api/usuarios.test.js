import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/baseDeDatos.js';
import { generarHash } from '../../src/config/hash.js';
import { crearAdministrador } from '../../src/servicios/usuarios/ServicioDeUsuarios.js';

let servidor;
let base;
const correos = [];

function nuevoRegistro(cambios = {}) {
	const unico = randomUUID();
	const correo = `${unico}@prueba.com`;
	correos.push(correo);
	return {
		correo,
		contraseña: 'clave-segura',
		preguntaSeguridad: '¿Nombre de tu mascota?',
		respuestaSeguridad: 'Luna',
		nombreCompleto: 'Persona de Prueba',
		tipoDocumento: 'CC',
		numeroDocumento: unico.slice(0, 30),
		paqueteHosting: 'Chibcha-Plata',
		planDePago: 'Mensual',
		...cambios,
	};
}

async function pedir(ruta, cuerpo, cabeceras = {}) {
	const respuesta = await fetch(`${base}/api/usuarios${ruta}`, {
		method: cuerpo === undefined ? 'GET' : 'POST',
		headers: { 'Content-Type': 'application/json', ...cabeceras },
		body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
	});
	const texto = await respuesta.text();
	return { estado: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

before(async () => {
	await new Promise((resolver) => {
		servidor = app.listen(0, resolver);
	});
	base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
	const { rows } = await pool.query('SELECT "id" FROM usuario WHERE "correo" = ANY($1)', [correos]);
	const ids = rows.map((fila) => fila.id);
	for (const tabla of ['cliente', 'distribuidor', 'administrador', 'tecnico_de_soporte', 'empleado', 'usuario']) {
		await pool.query(`DELETE FROM ${tabla} WHERE "id" = ANY($1)`, [ids]);
	}
	await pool.end();
	await new Promise((resolver) => servidor.close(resolver));
});

test('UC1: registra un cliente y guarda hashes, no texto plano', async () => {
	const datos = nuevoRegistro();
	const { estado, cuerpo } = await pedir('/registro', datos);
	assert.equal(estado, 201);
	assert.equal(cuerpo.tipo, 'Cliente');
	assert.equal(cuerpo.nombre, datos.nombreCompleto);

	const { rows } = await pool.query('SELECT * FROM usuario WHERE "correo" = $1', [datos.correo]);
	assert.match(rows[0].contraseña, /^\$2b\$12\$/);
	assert.match(rows[0].respuestaSeguridad, /^\$2b\$12\$/);
});

test('UC1: rechaza correo y documento repetidos sin dejar filas sueltas', async () => {
	const datos = nuevoRegistro();
	await pedir('/registro', datos);

	const correoRepetido = await pedir('/registro', nuevoRegistro({ correo: datos.correo }));
	assert.equal(correoRepetido.estado, 409);
	assert.equal(correoRepetido.cuerpo.campo, 'correo');

	const otro = nuevoRegistro({ numeroDocumento: datos.numeroDocumento });
	const documentoRepetido = await pedir('/registro', otro);
	assert.equal(documentoRepetido.estado, 409);
	assert.equal(documentoRepetido.cuerpo.campo, 'numeroDocumento');
	const { rowCount } = await pool.query('SELECT 1 FROM usuario WHERE "correo" = $1', [otro.correo]);
	assert.equal(rowCount, 0);
});

test('UC1: señala el campo inválido', async () => {
	const casos = [
		[{ correo: 'sin-formato' }, 'correo'],
		[{ contraseña: 'corta' }, 'contraseña'],
		[{ contraseña: 'x'.repeat(73) }, 'contraseña'],
		[{ paqueteHosting: 'Gratis' }, 'paqueteHosting'],
		[{ planDePago: undefined }, 'planDePago'],
		[{ fechaNacimiento: '2023-02-30' }, 'fechaNacimiento'],
		[{ teléfono: '1'.repeat(31) }, 'teléfono'],
	];
	for (const [cambios, campo] of casos) {
		const { estado, cuerpo } = await pedir('/registro', nuevoRegistro(cambios));
		assert.equal(estado, 400, campo);
		assert.equal(cuerpo.campo, campo);
	}
});

test('UC2: abre sesión, no distingue el fallo y protege el perfil', async () => {
	const datos = nuevoRegistro();
	await pedir('/registro', datos);

	const correcta = await pedir('/sesion', { correo: datos.correo.toUpperCase(), contraseña: datos.contraseña });
	assert.equal(correcta.estado, 200);
	assert.equal(correcta.cuerpo.perfil.tipo, 'Cliente');

	const claveMala = await pedir('/sesion', { correo: datos.correo, contraseña: 'otra-clave' });
	const correoMalo = await pedir('/sesion', { correo: 'nadie@prueba.com', contraseña: 'otra-clave' });
	assert.equal(claveMala.estado, 401);
	assert.deepEqual(claveMala.cuerpo, correoMalo.cuerpo);

	assert.equal((await pedir('/perfil')).estado, 401);
	assert.equal((await pedir('/perfil', undefined, { Authorization: 'Bearer falso' })).estado, 401);
	const perfil = await pedir('/perfil', undefined, { Authorization: `Bearer ${correcta.cuerpo.token}` });
	assert.equal(perfil.estado, 200);
	assert.equal(perfil.cuerpo.correo, datos.correo);
});

test('UC2 E1: un campo vacío no llega a autenticar', async () => {
	const { estado, cuerpo } = await pedir('/sesion', { correo: 'a@b.co' });
	assert.equal(estado, 400);
	assert.equal(cuerpo.campo, 'contraseña');
});

test('UC2 E3: una cuenta inhabilitada solo se revela con la clave correcta', async () => {
	const datos = nuevoRegistro();
	await pedir('/registro', datos);
	await pool.query(`UPDATE usuario SET "estado" = 'Inhabilitado' WHERE "correo" = $1`, [datos.correo]);

	assert.equal((await pedir('/sesion', { correo: datos.correo, contraseña: 'otra-clave' })).estado, 401);
	const { estado, cuerpo } = await pedir('/sesion', { correo: datos.correo, contraseña: datos.contraseña });
	assert.equal(estado, 403);
	assert.equal(cuerpo.error, 'Cuenta inactiva, contacte al administrador');
});

test('UC2: carga el rol y los permisos del administrador', async () => {
	const correo = `${randomUUID()}@prueba.com`;
	correos.push(correo);
	await crearAdministrador({
		correo,
		contraseña: 'clave-segura',
		nombreCompleto: 'Admin de Prueba',
		documento: randomUUID().slice(0, 30),
		rol: 'Administrador de Personal',
	});

	const { estado, cuerpo } = await pedir('/sesion', { correo, contraseña: 'clave-segura' });
	assert.equal(estado, 200);
	assert.equal(cuerpo.perfil.tipo, 'Administrador');
	assert.equal(cuerpo.perfil.rol, 'Administrador de Personal');
	assert.deepEqual(cuerpo.perfil.permisos, ['GestionarPerfilDePersonalInterno']);
});

test('UC3 y UC4: recupera la contraseña solo con la respuesta correcta', async () => {
	const datos = nuevoRegistro();
	await pedir('/registro', datos);

	const pregunta = await pedir('/recuperacion/pregunta', { correo: datos.correo });
	assert.deepEqual(pregunta.cuerpo, { pregunta: datos.preguntaSeguridad });

	const solicitud = { correo: datos.correo, nuevaContraseña: 'clave-renovada' };
	const fallida = await pedir('/recuperacion', { ...solicitud, respuesta: 'Sol' });
	assert.equal(fallida.estado, 401);
	assert.equal((await pedir('/sesion', { correo: datos.correo, contraseña: 'clave-renovada' })).estado, 401);

	assert.equal((await pedir('/recuperacion', { ...solicitud, respuesta: 'Luna' })).estado, 204);
	assert.equal((await pedir('/sesion', { correo: datos.correo, contraseña: 'clave-renovada' })).estado, 200);
	assert.equal((await pedir('/sesion', { correo: datos.correo, contraseña: datos.contraseña })).estado, 401);
});

test('UC3: sin cuenta o sin pregunta de seguridad no hay recuperación', async () => {
	const correo = `${randomUUID()}@prueba.com`;
	correos.push(correo);
	await crearAdministrador({
		correo,
		contraseña: 'clave-segura',
		nombreCompleto: 'Admin sin pregunta',
		documento: randomUUID().slice(0, 30),
		rol: 'Administrador de Clientes',
	});

	const sinPregunta = await pedir('/recuperacion/pregunta', { correo });
	const sinCuenta = await pedir('/recuperacion/pregunta', { correo: 'nadie@prueba.com' });
	assert.equal(sinPregunta.estado, 404);
	assert.deepEqual(sinPregunta.cuerpo, sinCuenta.cuerpo);
});

test('UC2: carga el nivel del técnico y el perfil del distribuidor', async () => {
	const hash = await generarHash('clave-segura');
	const crearCuenta = async () => {
		const correo = `${randomUUID()}@prueba.com`;
		correos.push(correo);
		const { rows } = await pool.query(
			'INSERT INTO usuario ("correo", "contraseña") VALUES ($1, $2) RETURNING "id"',
			[correo, hash],
		);
		return { correo, id: rows[0].id };
	};

	const tecnico = await crearCuenta();
	await pool.query('INSERT INTO empleado ("id", "nombreCompleto", "documento") VALUES ($1, $2, $3)', [
		tecnico.id,
		'Técnico de Prueba',
		randomUUID().slice(0, 30),
	]);
	await pool.query(`INSERT INTO tecnico_de_soporte ("id", "nivelDeServicio") VALUES ($1, 'Nivel2')`, [tecnico.id]);
	const sesionTecnico = await pedir('/sesion', { correo: tecnico.correo, contraseña: 'clave-segura' });
	assert.equal(sesionTecnico.cuerpo.perfil.tipo, 'TécnicoDeSoporte');
	assert.equal(sesionTecnico.cuerpo.perfil.nivelDeServicio, 'Nivel2');

	const distribuidor = await crearCuenta();
	await pool.query(
		`INSERT INTO distribuidor ("id", "razónSocial", "nit", "categoría", "comisiónAplicable")
		VALUES ($1, $2, $3, 'Básico', 10)`,
		[distribuidor.id, 'Canal de Prueba', randomUUID().slice(0, 30)],
	);
	const sesionDistribuidor = await pedir('/sesion', { correo: distribuidor.correo, contraseña: 'clave-segura' });
	assert.equal(sesionDistribuidor.cuerpo.perfil.tipo, 'Distribuidor');
	assert.equal(sesionDistribuidor.cuerpo.perfil.nombre, 'Canal de Prueba');
});

test('un token deja de servir cuando la cuenta se inhabilita', async () => {
	const datos = nuevoRegistro();
	await pedir('/registro', datos);
	const { cuerpo } = await pedir('/sesion', { correo: datos.correo, contraseña: datos.contraseña });
	await pool.query(`UPDATE usuario SET "estado" = 'Inhabilitado' WHERE "correo" = $1`, [datos.correo]);

	const perfil = await pedir('/perfil', undefined, { Authorization: `Bearer ${cuerpo.token}` });
	assert.equal(perfil.estado, 401);
});

test('un cuerpo que no es JSON responde 400', async () => {
	const respuesta = await fetch(`${base}/api/usuarios/sesion`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: '{roto',
	});
	assert.equal(respuesta.status, 400);
});
