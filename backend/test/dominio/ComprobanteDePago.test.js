import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { Factura } from '../../src/dominio/facturacion/Factura.js';
import { ComprobanteDePago } from '../../src/dominio/pagos/ComprobanteDePago.js';
import { EstadoComprobante } from '../../src/dominio/pagos/EstadoComprobante.js';
import { PasarelaDePagoSimulada } from '../../src/dominio/pagos/PasarelaDePagoSimulada.js';
import { EstadoMedioDePago } from '../../src/dominio/perfiles/EstadoMedioDePago.js';
import { TarjetaVisa } from '../../src/dominio/perfiles/TarjetaVisa.js';

test('procesarCobro: aprobado queda Exitoso con el monto de la factura', () => {
	const comprobante = new ComprobanteDePago().procesarCobro(new Factura({ monto: 250 }), new TarjetaVisa());
	assert.equal(comprobante.estado, EstadoComprobante.Exitoso);
	assert.equal(comprobante.monto, 250);
	assert.match(comprobante.fecha, /^\d{4}-\d{2}-\d{2}$/);
});

test('procesarCobro: rechazado queda Fallido', () => {
	const rechazo = mock.method(PasarelaDePagoSimulada.prototype, 'cobrar', () => false);
	const comprobante = new ComprobanteDePago().procesarCobro(new Factura({ monto: 250 }), new TarjetaVisa());
	rechazo.mock.restore();
	assert.equal(comprobante.estado, EstadoComprobante.Fallido);
});

test('una tarjeta nueva nace Activa', () => {
	assert.equal(new TarjetaVisa().estado, EstadoMedioDePago.Activa);
});
