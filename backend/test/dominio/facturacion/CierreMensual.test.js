import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CierreMensual } from '../../../src/dominio/facturacion/CierreMensual.js';
import { CategoríaDistribuidor } from '../../../src/dominio/usuarios/CategoriaDistribuidor.js';
import { Distribuidor } from '../../../src/dominio/usuarios/Distribuidor.js';

function cerrar(datosDistribuidor, montoFacturado) {
	const distribuidor = new Distribuidor({ razónSocial: 'Prueba', ...datosDistribuidor });
	const cierre = new CierreMensual({ período: '2026-09', pendientes: [{ distribuidor, montoFacturado }] });
	cierre.ejecutar();
	return { distribuidor, comisión: cierre.comisiones[0] };
}

const BASICO = { categoría: CategoríaDistribuidor.Básico, comisiónAplicable: 10 };
const PREMIUM = { categoría: CategoríaDistribuidor.Premium, comisiónAplicable: 15 };

test('UC13: con 100 dominios sigue Básico y no hay aviso', () => {
	const { distribuidor, comisión } = cerrar({ ...BASICO, numeroDominiosGestionados: 100 }, 1000);
	assert.equal(distribuidor.categoría, CategoríaDistribuidor.Básico);
	assert.equal(distribuidor.avisoDeCategoría, null);
	assert.equal(comisión.porcentajeAplicado, 10);
	assert.equal(comisión.monto, 100);
});

test('UC13 A1: con 101 dominios sube a Premium, avisa y UC14 aplica el 15%', () => {
	const { distribuidor, comisión } = cerrar({ ...BASICO, numeroDominiosGestionados: 101 }, 1000);
	assert.equal(distribuidor.categoría, CategoríaDistribuidor.Premium);
	assert.match(distribuidor.avisoDeCategoría, /Premium/);
	assert.equal(comisión.monto, 150);
});

test('UC13 A1: Premium baja a Básico cuando deja de superar el umbral', () => {
	const { distribuidor } = cerrar({ ...PREMIUM, numeroDominiosGestionados: 5 }, 0);
	assert.equal(distribuidor.comisiónAplicable, 10);
	assert.notEqual(distribuidor.avisoDeCategoría, null);
});

test('UC12 A1: sin facturación la comisión y el cheque quedan en cero', () => {
	const { comisión } = cerrar({ ...BASICO, numeroDominiosGestionados: 0 }, 0);
	assert.equal(comisión.monto, 0);
	assert.equal(comisión.cheque.monto, 0);
});

test('UC14 redondea al centavo y UC15 toma el monto y el número del banco', () => {
	const { comisión } = cerrar({ ...BASICO, numeroDominiosGestionados: 0 }, 333.35);
	assert.equal(comisión.monto, 33.34);
	assert.equal(comisión.cheque.monto, 33.34);
	assert.match(comisión.cheque.número, /^CHQ-[0-9A-F]{8}$/);
});

test('UC15: el cheque se exporta como PDF', async () => {
	const { comisión } = cerrar({ ...BASICO, numeroDominiosGestionados: 0 }, 1000);
	const contenido = await comisión.cheque.exportarPDF();
	assert.equal(contenido.subarray(0, 4).toString(), '%PDF');
});
