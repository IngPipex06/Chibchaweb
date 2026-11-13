import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generarHash } from '../../../src/config/hash.js';
import { Cliente } from '../../../src/dominio/usuarios/Cliente.js';
import { PreguntaDeSeguridad } from '../../../src/dominio/usuarios/PreguntaDeSeguridad.js';

test('iniciarSesión compara contra el hash almacenado', async () => {
	const cliente = new Cliente({ contraseña: await generarHash('clave-correcta') });
	assert.equal(await cliente.iniciarSesión('clave-correcta'), true);
	assert.equal(await cliente.iniciarSesión('clave-erronea'), false);
});

test('restablecerContraseña guarda un hash y deja de aceptar la anterior', async () => {
	const cliente = new Cliente({ contraseña: await generarHash('clave-anterior') });
	await cliente.restablecerContraseña('clave-nueva');
	assert.notEqual(cliente.contraseña, 'clave-nueva');
	assert.equal(await cliente.iniciarSesión('clave-nueva'), true);
	assert.equal(await cliente.iniciarSesión('clave-anterior'), false);
});

test('validarRespuesta compara contra el hash almacenado', async () => {
	const pregunta = new PreguntaDeSeguridad({ pregunta: '¿Mascota?', respuesta: await generarHash('Luna') });
	assert.equal(await pregunta.validarRespuesta('Luna'), true);
	assert.equal(await pregunta.validarRespuesta('Sol'), false);
});
