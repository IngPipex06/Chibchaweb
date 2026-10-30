import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Dirección } from '../../../src/dominio/perfiles/Direccion.js';
import { TarjetaDiners } from '../../../src/dominio/perfiles/TarjetaDiners.js';
import { TarjetaMastercard } from '../../../src/dominio/perfiles/TarjetaMastercard.js';
import { TarjetaVisa } from '../../../src/dominio/perfiles/TarjetaVisa.js';

const VIGENTE = '2099-12-31';

test('acepta números válidos de cada franquicia', () => {
	const casos = [
		[TarjetaVisa, '4111111111111111'],
		[TarjetaVisa, '4222222222222'],
		[TarjetaMastercard, '5555555555554444'],
		[TarjetaMastercard, '2223003122003222'],
		[TarjetaDiners, '36227206271667'],
		[TarjetaDiners, '30569309025904'],
	];
	for (const [Tarjeta, numero] of casos) {
		assert.equal(new Tarjeta({ numero, fechaExpiración: VIGENTE }).validar(), true, numero);
	}
});

test('rechaza por número y explica el motivo', () => {
	const casos = [
		[TarjetaVisa, '4111111111111112'],
		[TarjetaVisa, '5555555555554444'],
		[TarjetaVisa, '411111111111'],
		[TarjetaVisa, '4111-1111-1111-1'],
		[TarjetaMastercard, '4111111111111111'],
		[TarjetaDiners, '4111111111111111'],
	];
	for (const [Tarjeta, numero] of casos) {
		const tarjeta = new Tarjeta({ numero, fechaExpiración: VIGENTE });
		assert.equal(tarjeta.validar(), false, numero);
		assert.deepEqual(tarjeta.motivosDeRechazo, ['número incorrecto']);
	}
});

test('rechaza una tarjeta vencida', () => {
	const tarjeta = new TarjetaVisa({ numero: '4111111111111111', fechaExpiración: '2020-01-31' });
	assert.equal(tarjeta.validar(), false);
	assert.deepEqual(tarjeta.motivosDeRechazo, ['vencida']);
});

test('enmascara todo menos los últimos cuatro dígitos', () => {
	const tarjeta = new TarjetaVisa({ numero: '4111111111111111', fechaExpiración: VIGENTE });
	assert.equal(tarjeta.numeroEnmascarado, '************1111');
});

test('validarFormato exige los cuatro campos de la dirección', () => {
	const válida = { calle: 'Calle 1', ciudad: 'Bogotá', departamentoOPaís: 'Colombia', códigoPostal: '110111' };
	assert.equal(new Dirección(válida).validarFormato(), true);
	assert.equal(new Dirección({ ...válida, ciudad: ' ' }).validarFormato(), false);
	assert.equal(new Dirección({ ...válida, códigoPostal: undefined }).validarFormato(), false);
	assert.equal(new Dirección({ ...válida, códigoPostal: '11$0' }).validarFormato(), false);
});
