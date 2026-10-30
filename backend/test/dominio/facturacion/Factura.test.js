import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EstadoFactura } from '../../../src/dominio/facturacion/EstadoFactura.js';
import { Factura } from '../../../src/dominio/facturacion/Factura.js';

test('emitir deja la factura pendiente y vence 30 días después de la emisión', () => {
	const factura = new Factura({ monto: 100 });
	factura.emitir();

	assert.equal(factura.estado, EstadoFactura.Pendiente);
	assert.match(factura.fechaEmisión, /^\d{4}-\d{2}-\d{2}$/);
	const dias = (Date.parse(factura.fechaVencimiento) - Date.parse(factura.fechaEmisión)) / 86400000;
	assert.equal(dias, 30);
});
