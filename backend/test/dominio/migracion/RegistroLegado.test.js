import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RegistroLegado } from '../../../src/dominio/migracion/RegistroLegado.js';

const ENCABEZADO = 'ID_Cliente_Legado,Nombre,Dominio,Plan de Hosting,Estado,Tarjeta,Correo';
const FILA = 'L-1,Ana,ana.co,Chibcha-Oro/Windows/Mensual,Activo,4111111111111111|12/2099,ana@prueba.com';

const leer = (...filas) => RegistroLegado.leerArchivo(Buffer.from([ENCABEZADO, ...filas].join('\n')));

test('leerArchivo rechaza codificación, control y encabezado incompatibles', () => {
	assert.equal(RegistroLegado.leerArchivo(Buffer.from([0xff, 0xfe, 0x00])), null);
	assert.equal(RegistroLegado.leerArchivo(Buffer.from('otro,encabezado\n')), null);
	assert.equal(RegistroLegado.leerArchivo(Buffer.from(`${ENCABEZADO}\nL-1\0`)), null);
});

test('leerArchivo numera las líneas del archivo e ignora las vacías', () => {
	const [primero, segundo] = leer(FILA, '', FILA);
	assert.equal(primero.línea, 2);
	assert.equal(segundo.línea, 4);
});

test('un registro correcto pasa las cuatro reglas', () => {
	const [registro] = leer(FILA);
	assert.equal(registro.validar(), true);
	assert.equal(registro.paquete, 'Chibcha-Oro');
	assert.equal(registro.planDePago, 'Mensual');
});

test('la franquicia sale del número y el número completo no se entrega', () => {
	const [registro] = leer(FILA);
	assert.deepEqual(registro.tarjetaParaGuardar(), {
		tipoTarjeta: 'Visa',
		numeroEnmascarado: '************1111',
		fechaExpiración: '2099-12-31',
		últimosDígitos: '1111',
	});
});

test('UC28 A1: todas las reglas incumplidas quedan juntas', () => {
	const [registro] = leer('L-2,Ana,ana.co,Chibcha-Bronce/Linux/Mensual,Activo,123|12/2099,correo-malo');
	assert.equal(registro.validar(), false);
	assert.deepEqual(registro.motivos, [
		'plan de hosting: combinación no válida',
		'formato seguro: correo',
		'formato seguro: tarjeta',
	]);
});

test('una fila incompleta es error de esquema, no falla estructural', () => {
	const [registro] = leer('L-3,Ana');
	assert.equal(registro.validar(), false);
	assert.deepEqual(registro.motivos, ['esquema: faltan campos obligatorios']);
});

test('estado desconocido y tarjeta vencida se rechazan', () => {
	const [estado] = leer(FILA.replace('Activo', 'Moroso'));
	const [vencida] = leer(FILA.replace('12/2099', '01/2000'));
	assert.deepEqual(estado.validar() ? [] : estado.motivos, ['esquema: estado no reconocido']);
	assert.deepEqual(vencida.validar() ? [] : vencida.motivos, ['formato seguro: tarjeta']);
});

test('el id ya migrado se omite; el correo ajeno se reporta', () => {
	const [omitido, ajeno] = leer(FILA, FILA);
	omitido.cotejar({ idYaMigrado: true });
	ajeno.cotejar({ correoOcupado: true });
	assert.equal(omitido.validar(), false);
	assert.equal(omitido.esDuplicado, true);
	assert.deepEqual(omitido.motivos, []);
	assert.equal(ajeno.validar(), false);
	assert.deepEqual(ajeno.motivos, ['duplicado: correo de otro cliente']);
});

test('el texto para el reporte nunca lleva el número completo', () => {
	const [completa, corrida] = leer(FILA, 'L-4,4111 1111 1111 1111');
	assert.ok(completa.texto.includes('************1111|12/2099'));
	assert.ok(!completa.texto.includes('4111111111111111'));
	assert.ok(!corrida.texto.includes('4111 1111'));
});
