import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AlgoritmoDeCifradoAES256 } from '../../../src/dominio/respaldo/AlgoritmoDeCifradoAES256.js';
import { AlgoritmoDeCifradoBlowfish } from '../../../src/dominio/respaldo/AlgoritmoDeCifradoBlowfish.js';
import { AlgoritmoDeCifradoChaCha20 } from '../../../src/dominio/respaldo/AlgoritmoDeCifradoChaCha20.js';
import { AlgoritmoDeCifradoTripleDES } from '../../../src/dominio/respaldo/AlgoritmoDeCifradoTripleDES.js';

const ALGORITMOS = [
	AlgoritmoDeCifradoAES256,
	AlgoritmoDeCifradoChaCha20,
	AlgoritmoDeCifradoBlowfish,
	AlgoritmoDeCifradoTripleDES,
];
const TEXTO = 'Respaldo de pago: comprobante Nº 42, señor Ñandú. '.repeat(200);

for (const Algoritmo of ALGORITMOS) {
	test(`${Algoritmo.name} recupera el texto original`, () => {
		const algoritmo = new Algoritmo();
		const cifrado = algoritmo.cifrar(TEXTO);
		assert.equal(algoritmo.descifrar(cifrado), TEXTO);
		assert.equal(Buffer.from(cifrado, 'base64').includes('Respaldo'), false);
		assert.equal(algoritmo.descifrar(algoritmo.cifrar('')), '');
	});

	test(`${Algoritmo.name} no repite el resultado para el mismo texto`, () => {
		const algoritmo = new Algoritmo();
		assert.notEqual(algoritmo.cifrar(TEXTO), algoritmo.cifrar(TEXTO));
	});
}

for (const Algoritmo of [AlgoritmoDeCifradoAES256, AlgoritmoDeCifradoChaCha20]) {
	test(`${Algoritmo.name} rechaza un contenido alterado`, () => {
		const algoritmo = new Algoritmo();
		const paquete = Buffer.from(algoritmo.cifrar(TEXTO), 'base64');
		paquete[paquete.length - 1] ^= 1;
		assert.throws(() => algoritmo.descifrar(paquete.toString('base64')));
	});
}
