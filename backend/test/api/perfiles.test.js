import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/baseDeDatos.js';
import * as DominioGateway from '../../src/datos/gateways/DominioGateway.js';
import { crearAdministrador } from '../../src/servicios/usuarios/ServicioDeUsuarios.js';

const CLAVE = 'clave-segura';
const TARJETA = { franquicia: 'Visa', numero: '4111111111111111', fechaExpiración: '2099-12-31' };
const DIRECCION = { calle: 'Calle 1', ciudad: 'Bogotá', departamentoOPaís: 'Colombia', códigoPostal: '110111' };

let servidor;
let base;
const correos = [];
const sesiones = {};

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

async function iniciarSesion(correo, contraseña = CLAVE) {
	const { cuerpo } = await pedir('POST', '/usuarios/sesion', '', { correo, contraseña });
	return cuerpo.token;
}

async function crearAdmin(rol) {
	const correo = correoNuevo();
	await crearAdministrador({ correo, contraseña: CLAVE, nombreCompleto: rol, documento: unico(), rol });
	return iniciarSesion(correo);
}

function nuevoCliente(cambios = {}) {
	return {
		correo: correoNuevo(),
		contraseña: CLAVE,
		nombreCompleto: 'Cliente de Prueba',
		tipoDocumento: 'CC',
		numeroDocumento: unico(),
		paqueteHosting: 'Chibcha-Oro',
		planDePago: 'Anual',
		dirección: DIRECCION,
		tarjeta: TARJETA,
		...cambios,
	};
}

before(async () => {
	await new Promise((resolver) => {
		servidor = app.listen(0, resolver);
	});
	base = `http://127.0.0.1:${servidor.address().port}`;
	sesiones.clientes = await crearAdmin('Administrador de Clientes');
	sesiones.personal = await crearAdmin('Administrador de Personal');
	sesiones.canales = await crearAdmin('Administrador de Canales');
});

after(async () => {
	const { rows } = await pool.query('SELECT "id" FROM usuario WHERE "correo" = ANY($1)', [correos]);
	const ids = rows.map((fila) => fila.id);
	await pool.query('DELETE FROM dominio WHERE "clienteId" = ANY($1)', [ids]);
	for (const tabla of ['cliente', 'distribuidor', 'administrador', 'tecnico_de_soporte', 'empleado', 'usuario']) {
		await pool.query(`DELETE FROM ${tabla} WHERE "id" = ANY($1)`, [ids]);
	}
	await pool.end();
	await new Promise((resolver) => servidor.close(resolver));
});

test('UC5: cada subrol solo llega a su gestión', async () => {
	assert.deepEqual((await pedir('GET', '/perfiles/gestiones', sesiones.clientes)).cuerpo, ['clientes']);
	assert.deepEqual((await pedir('GET', '/perfiles/gestiones', sesiones.canales)).cuerpo, ['distribuidores']);

	assert.equal((await pedir('GET', '/perfiles/clientes', sesiones.personal)).estado, 403);
	assert.equal((await pedir('GET', '/perfiles/personal', sesiones.canales)).estado, 403);
	assert.equal((await pedir('GET', '/perfiles/distribuidores', sesiones.clientes)).estado, 403);
	assert.equal((await pedir('GET', '/perfiles/clientes', 'falso')).estado, 401);
});

test('un cliente no puede entrar a la gestión de perfiles', async () => {
	const datos = nuevoCliente();
	await pedir('POST', '/perfiles/clientes', sesiones.clientes, datos);
	const token = await iniciarSesion(datos.correo);
	assert.equal((await pedir('GET', '/perfiles/gestiones', token)).estado, 403);
	assert.equal((await pedir('GET', '/perfiles/clientes', token)).estado, 403);
});

test('UC6: el alta guarda la tarjeta enmascarada y nunca el número completo', async () => {
	const { estado, cuerpo } = await pedir('POST', '/perfiles/clientes', sesiones.clientes, nuevoCliente());
	assert.equal(estado, 201);
	assert.equal(cuerpo.mediosDePago[0].numeroEnmascarado, '************1111');
	assert.equal(cuerpo.mediosDePago[0].fechaExpiración, '2099-12-31');
	assert.equal('contraseña' in cuerpo, false);

	const { rows } = await pool.query('SELECT * FROM medio_de_pago WHERE "titularId" = $1', [cuerpo.id]);
	assert.equal(JSON.stringify(rows).includes(TARJETA.numero), false);
});

test('UC6 E3 y E4: dirección o tarjeta inválida no deja nada guardado', async () => {
	const casos = [
		[{ dirección: { ...DIRECCION, calle: '' } }, 'dirección', null],
		[{ dirección: undefined }, 'dirección', null],
		[{ tarjeta: undefined }, 'tarjeta', null],
		[{ tarjeta: { ...TARJETA, numero: '4111111111111112' } }, 'tarjeta', 'Tarjeta inválida: número incorrecto'],
		[{ tarjeta: { ...TARJETA, fechaExpiración: '2020-01-01' } }, 'tarjeta', 'Tarjeta inválida: vencida'],
		[{ tarjeta: { ...TARJETA, fechaExpiración: 'zzz' } }, 'tarjeta', null],
		[{ tarjeta: { ...TARJETA, fechaExpiración: '2099-13-45' } }, 'tarjeta', null],
		[{ tarjeta: { ...TARJETA, franquicia: ['Visa'] } }, 'tarjeta', 'Tarjeta inválida: franquicia no aceptada'],
		[{ tarjeta: { ...TARJETA, franquicia: 'Amex' } }, 'tarjeta', 'Tarjeta inválida: franquicia no aceptada'],
		[{ tarjeta: { ...TARJETA, franquicia: 'constructor' } }, 'tarjeta', 'Tarjeta inválida: franquicia no aceptada'],
	];
	for (const [cambios, campo, mensaje] of casos) {
		const datos = nuevoCliente(cambios);
		const { estado, cuerpo } = await pedir('POST', '/perfiles/clientes', sesiones.clientes, datos);
		assert.equal(estado, 400, JSON.stringify(cambios));
		assert.equal(cuerpo.campo, campo);
		if (mensaje) assert.equal(cuerpo.error, mensaje);
		const { rowCount } = await pool.query('SELECT 1 FROM usuario WHERE "correo" = $1', [datos.correo]);
		assert.equal(rowCount, 0);
	}
});

test('UC6 A1 a A5: edita, busca, inhabilita y reactiva', async () => {
	const datos = nuevoCliente();
	const { cuerpo: creado } = await pedir('POST', '/perfiles/clientes', sesiones.clientes, datos);
	const ruta = `/perfiles/clientes/${creado.id}`;

	const sinTarjeta = await pedir('PUT', ruta, sesiones.clientes, { ...datos, tarjeta: undefined });
	assert.equal(sinTarjeta.estado, 400);
	assert.equal(sinTarjeta.cuerpo.campo, 'tarjeta');

	const edicion = { ...datos, nombreCompleto: 'Nombre Editado' };
	const editado = await pedir('PUT', ruta, sesiones.clientes, edicion);
	assert.equal(editado.estado, 200);
	assert.equal(editado.cuerpo.nombreCompleto, 'Nombre Editado');
	assert.equal(editado.cuerpo.mediosDePago.length, 1);

	const otra = { franquicia: 'Mastercard', numero: '5555555555554444', fechaExpiración: '2099-12-31' };
	const conOtra = await pedir('PUT', ruta, sesiones.clientes, { ...edicion, tarjeta: otra });
	assert.equal(conOtra.cuerpo.mediosDePago.length, 2);

	const listado = await pedir('GET', `/perfiles/clientes?buscar=${datos.numeroDocumento}`, sesiones.clientes);
	assert.deepEqual(listado.cuerpo.map((fila) => fila.id), [creado.id]);

	assert.equal((await pedir('POST', `${ruta}/inhabilitar`, sesiones.clientes)).estado, 204);
	const bloqueado = await pedir('POST', '/usuarios/sesion', '', { correo: datos.correo, contraseña: CLAVE });
	assert.equal(bloqueado.estado, 403);
	assert.equal((await pedir('GET', ruta, sesiones.clientes)).cuerpo.estado, 'Inhabilitado');

	assert.equal((await pedir('POST', `${ruta}/reactivar`, sesiones.clientes)).estado, 204);
	assert.ok(await iniciarSesion(datos.correo));
});

test('UC6 E2: rechaza identificador repetido', async () => {
	const datos = nuevoCliente();
	await pedir('POST', '/perfiles/clientes', sesiones.clientes, datos);
	const repetido = nuevoCliente({ numeroDocumento: datos.numeroDocumento });
	const { estado, cuerpo } = await pedir('POST', '/perfiles/clientes', sesiones.clientes, repetido);
	assert.equal(estado, 409);
	assert.equal(cuerpo.campo, 'numeroDocumento');

	const conDirecciónMala = { ...repetido, dirección: { ...DIRECCION, calle: '' } };
	assert.equal((await pedir('POST', '/perfiles/clientes', sesiones.clientes, conDirecciónMala)).estado, 409);
});

test('UC7 y UC8: devuelven la lista completa de errores', async () => {
	const dirección = { ...DIRECCION, calle: '', códigoPostal: '11$0' };
	const mala = await pedir('POST', '/perfiles/clientes', sesiones.clientes, nuevoCliente({ dirección }));
	assert.deepEqual(mala.cuerpo.errores, ['calle inválida', 'código postal inválido']);

	const tarjeta = { ...TARJETA, numero: '4111111111111112', fechaExpiración: '2020-01-01' };
	const vencida = await pedir('POST', '/perfiles/clientes', sesiones.clientes, nuevoCliente({ tarjeta }));
	assert.equal(vencida.cuerpo.error, 'Tarjeta inválida: número incorrecto, vencida');
	assert.deepEqual(vencida.cuerpo.errores, ['número incorrecto', 'vencida']);
});

test('un id inexistente o mal formado responde 404', async () => {
	assert.equal((await pedir('GET', '/perfiles/clientes/abc', sesiones.clientes)).estado, 404);
	assert.equal((await pedir('GET', `/perfiles/clientes/${randomUUID()}`, sesiones.clientes)).estado, 404);
});

test('UC9: crea técnico y administrador, y ambos pueden iniciar sesión', async () => {
	const datos = { contraseña: CLAVE, nombreCompleto: 'Empleado', cargo: 'Soporte' };
	const tecnico = {
		...datos,
		correo: correoNuevo(),
		documento: unico(),
		tipo: 'TécnicoDeSoporte',
		nivelDeServicio: 'Nivel2',
	};
	const creado = await pedir('POST', '/perfiles/personal', sesiones.personal, tecnico);
	assert.equal(creado.estado, 201);
	assert.equal(creado.cuerpo.nivelDeServicio, 'Nivel2');

	const edicion = { ...tecnico, nivelDeServicio: 'Nivel3' };
	const editado = await pedir('PUT', `/perfiles/personal/${creado.cuerpo.id}`, sesiones.personal, edicion);
	assert.equal(editado.cuerpo.nivelDeServicio, 'Nivel3');

	const admin = {
		...datos,
		correo: correoNuevo(),
		documento: unico(),
		tipo: 'Administrador',
		rol: 'Administrador de Canales',
	};
	const creadoAdmin = await pedir('POST', '/perfiles/personal', sesiones.personal, admin);
	assert.equal(creadoAdmin.cuerpo.rol, 'Administrador de Canales');
	const token = await iniciarSesion(admin.correo);
	assert.deepEqual((await pedir('GET', '/perfiles/gestiones', token)).cuerpo, ['distribuidores']);

	const invalidos = [{ tipo: 'Jefe' }, { nivelDeServicio: 'Nivel9' }];
	for (const cambios of invalidos) {
		const cuerpo = { ...tecnico, correo: correoNuevo(), documento: unico(), ...cambios };
		assert.equal((await pedir('POST', '/perfiles/personal', sesiones.personal, cuerpo)).estado, 400);
	}
});

test('UC9: nadie inhabilita su propia cuenta', async () => {
	const { cuerpo: perfil } = await pedir('GET', '/usuarios/perfil', sesiones.personal);
	const ruta = `/perfiles/personal/${perfil.id}/inhabilitar`;
	assert.equal((await pedir('POST', ruta, sesiones.personal)).estado, 409);
});

test('UC9: nadie cambia su propio rol, pero sí sus demás datos', async () => {
	const correo = correoNuevo();
	const documento = unico();
	const base = { correo, documento, nombreCompleto: 'Dos' };
	await crearAdministrador({ ...base, contraseña: CLAVE, rol: 'Administrador de Personal' });
	const token = await iniciarSesion(correo);
	const { cuerpo: perfil } = await pedir('GET', '/usuarios/perfil', token);
	const ruta = `/perfiles/personal/${perfil.id}`;

	const cambio = await pedir('PUT', ruta, token, { ...base, rol: 'Administrador de Clientes' });
	assert.equal(cambio.estado, 403);
	assert.equal((await pedir('GET', ruta, token)).cuerpo.rol, 'Administrador de Personal');

	const edicion = await pedir('PUT', ruta, token, { ...base, nombreCompleto: 'Otro', rol: 'Administrador de Personal' });
	assert.equal(edicion.cuerpo.nombreCompleto, 'Otro');

	const ajeno = await pedir('PUT', ruta, sesiones.personal, { ...base, rol: 'Administrador de Clientes' });
	assert.equal(ajeno.cuerpo.rol, 'Administrador de Clientes');
});

test('UC2 E2: ofrece recuperar en cada fallo y marca el límite, sin bloquear ni revelar la cuenta', async () => {
	const datos = nuevoCliente();
	await pedir('POST', '/perfiles/clientes', sesiones.clientes, datos);
	const fallar = async (correo) => pedir('POST', '/usuarios/sesion', '', { correo, contraseña: 'incorrecta' });

	for (let i = 0; i < 4; i += 1) {
		const { cuerpo } = await fallar(datos.correo);
		assert.equal(cuerpo.ofrecerRecuperacion, true);
		assert.equal(cuerpo.limiteDeIntentosAlcanzado, false);
	}
	const quinto = await fallar(datos.correo);
	assert.equal(quinto.estado, 401);
	assert.equal(quinto.cuerpo.limiteDeIntentosAlcanzado, true);

	const inexistente = `${randomUUID()}@prueba.com`;
	for (let i = 0; i < 4; i += 1) await fallar(inexistente);
	assert.equal((await fallar(inexistente)).cuerpo.limiteDeIntentosAlcanzado, true);

	assert.ok(await iniciarSesion(datos.correo));
	assert.equal((await fallar(datos.correo)).cuerpo.limiteDeIntentosAlcanzado, false);
});

function nuevoDistribuidor() {
	return { correo: correoNuevo(), contraseña: CLAVE, razónSocial: `Canal ${unico()}`, nit: unico() };
}

test('UC10: asigna y quita dominios, y el vínculo llega a los conteos de la facturación', async () => {
	const { cuerpo: cliente } = await pedir('POST', '/perfiles/clientes', sesiones.clientes, nuevoCliente());
	const nombre = `${randomUUID()}.com`;
	await pool.query('INSERT INTO dominio ("nombre", "clienteId") VALUES ($1, $2)', [nombre, cliente.id]);
	const { cuerpo: canal } = await pedir('POST', '/perfiles/distribuidores', sesiones.canales, nuevoDistribuidor());
	const { cuerpo: otro } = await pedir('POST', '/perfiles/distribuidores', sesiones.canales, nuevoDistribuidor());
	const ruta = `/perfiles/distribuidores/${canal.id}/dominios`;

	assert.equal((await pedir('POST', ruta, sesiones.clientes, { nombre })).estado, 403);
	const asignado = await pedir('POST', ruta, sesiones.canales, { nombre });
	assert.equal(asignado.estado, 201);
	assert.deepEqual((await pedir('GET', ruta, sesiones.canales)).cuerpo, [asignado.cuerpo]);
	assert.equal(await DominioGateway.contarPorDistribuidor(canal.id), 1);
	const fechas = async () =>
		(await pool.query('SELECT "fechaAsignación" FROM dominio WHERE "nombre" = $1', [nombre])).rows[0].fechaAsignación;
	assert.notEqual(await fechas(), null);
	assert.equal(await DominioGateway.contarPorCliente(cliente.id), 1);

	const ajeno = await pedir('POST', `/perfiles/distribuidores/${otro.id}/dominios`, sesiones.canales, { nombre });
	assert.equal(ajeno.estado, 409);
	assert.equal((await pedir('POST', ruta, sesiones.canales, { nombre: 'no-existe.com' })).estado, 404);
	assert.equal((await pedir('POST', ruta, sesiones.canales, {})).estado, 400);
	const sinVinculo = `/perfiles/distribuidores/${otro.id}/dominios/${nombre}`;
	assert.equal((await pedir('DELETE', sinVinculo, sesiones.canales)).estado, 404);

	assert.equal((await pedir('DELETE', `${ruta}/${nombre}`, sesiones.canales)).estado, 204);
	assert.equal(await DominioGateway.contarPorDistribuidor(canal.id), 0);
	assert.equal(await fechas(), null);
	assert.equal((await pedir('GET', '/perfiles/distribuidores/no-es-uuid/dominios', sesiones.canales)).estado, 404);
});

test('UC10: asigna el dominio sin importar mayúsculas', async () => {
	const { cuerpo: cliente } = await pedir('POST', '/perfiles/clientes', sesiones.clientes, nuevoCliente());
	const nombre = `${randomUUID()}.com`;
	await pool.query('INSERT INTO dominio ("nombre", "clienteId") VALUES ($1, $2)', [nombre, cliente.id]);
	const { cuerpo: canal } = await pedir('POST', '/perfiles/distribuidores', sesiones.canales, nuevoDistribuidor());

	const asignado = await pedir('POST', `/perfiles/distribuidores/${canal.id}/dominios`, sesiones.canales, {
		nombre: nombre.toUpperCase(),
	});
	assert.equal(asignado.estado, 201);
	assert.equal(asignado.cuerpo.nombre, nombre);
});

test('UC10: asigna la comisión por categoría y no deja editarla', async () => {
	const datos = { correo: correoNuevo(), contraseña: CLAVE, razónSocial: 'Canal', nit: unico() };
	const basico = await pedir('POST', '/perfiles/distribuidores', sesiones.canales, datos);
	assert.equal(basico.estado, 201);
	assert.equal(basico.cuerpo.categoría, 'Básico');
	assert.equal(Number(basico.cuerpo.comisiónAplicable), 10);

	const premium = await pedir('POST', '/perfiles/distribuidores', sesiones.canales, {
		...datos,
		correo: correoNuevo(),
		nit: unico(),
		categoría: 'Premium',
	});
	assert.equal(Number(premium.cuerpo.comisiónAplicable), 15);

	const ruta = `/perfiles/distribuidores/${basico.cuerpo.id}`;
	const editado = await pedir('PUT', ruta, sesiones.canales, {
		...datos,
		razónSocial: 'Canal Editado',
		categoría: 'Premium',
		comisiónAplicable: 15,
	});
	assert.equal(editado.cuerpo.razónSocial, 'Canal Editado');
	assert.equal(editado.cuerpo.categoría, 'Básico');
	assert.equal(Number(editado.cuerpo.comisiónAplicable), 10);

	const repetido = { ...datos, correo: correoNuevo() };
	const conflicto = await pedir('POST', '/perfiles/distribuidores', sesiones.canales, repetido);
	assert.equal(conflicto.estado, 409);
	assert.equal(conflicto.cuerpo.campo, 'nit');

	assert.equal((await pedir('POST', `${ruta}/inhabilitar`, sesiones.canales)).estado, 204);
	assert.equal((await pedir('GET', ruta, sesiones.canales)).cuerpo.estado, 'Inhabilitado');
});
