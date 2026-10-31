import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NivelDeServicio } from '../../../src/dominio/soporte/NivelDeServicio.js';
import { Prioridad } from '../../../src/dominio/soporte/Prioridad.js';
import { Ticket } from '../../../src/dominio/soporte/Ticket.js';
import { TicketAbierto } from '../../../src/dominio/soporte/TicketAbierto.js';
import { TicketEnProgreso } from '../../../src/dominio/soporte/TicketEnProgreso.js';
import { TicketResuelto } from '../../../src/dominio/soporte/TicketResuelto.js';
import { TicketRezagado } from '../../../src/dominio/soporte/TicketRezagado.js';
import { TécnicoDeSoporte } from '../../../src/dominio/usuarios/TecnicoDeSoporte.js';

const HORA = 60 * 60 * 1000;
const técnico = new TécnicoDeSoporte({ id: 't1' });

function ticket(Estado, cambios = {}) {
	return new Ticket({
		estado: new Estado(),
		prioridad: Prioridad.Alta,
		nivelActual: NivelDeServicio.Nivel1,
		fechaInicioSLA: new Date(0),
		...cambios,
	});
}

function enProgreso(cambios = {}) {
	return ticket(TicketEnProgreso, { técnicoAsignado: técnico, fechaToma: new Date(0), ...cambios });
}

test('siguiente sube un nivel y Nivel 3 es el tope', () => {
	assert.equal(NivelDeServicio.Nivel1.siguiente(), NivelDeServicio.Nivel2);
	assert.equal(NivelDeServicio.Nivel2.siguiente(), NivelDeServicio.Nivel3);
	assert.equal(NivelDeServicio.Nivel3.siguiente(), NivelDeServicio.Nivel3);
});

for (const Estado of [TicketAbierto, TicketRezagado]) {
	test(`${Estado.name}: tomar asigna al técnico, guarda la hora y pasa a EnProgreso`, () => {
		const objeto = ticket(Estado);
		objeto.tomar(técnico);
		assert.ok(objeto.estado instanceof TicketEnProgreso);
		assert.equal(objeto.técnicoAsignado, técnico);
		assert.ok(objeto.fechaToma instanceof Date);
	});

	test(`${Estado.name}: no se resuelve, no se anota ni se escala a mano`, () => {
		const objeto = ticket(Estado);
		const estado = objeto.estado;
		objeto.resolver('solución');
		objeto.escalarManualmente('motivo');
		assert.equal(objeto.registrarNota('nota'), false);
		assert.equal(objeto.estado, estado);
		assert.equal(objeto.solución, null);
		assert.equal(objeto.motivoEscalamiento, null);
		assert.equal(objeto.notaDeAvance, null);
	});
}

test('EnProgreso: tomar no cambia nada', () => {
	const objeto = enProgreso();
	const estado = objeto.estado;
	objeto.tomar(new TécnicoDeSoporte({ id: 't2' }));
	assert.equal(objeto.estado, estado);
	assert.equal(objeto.técnicoAsignado, técnico);
});

test('EnProgreso: resolver guarda la solución y es final', () => {
	const objeto = enProgreso();
	objeto.resolver('Se reinició el servicio');
	assert.ok(objeto.estado instanceof TicketResuelto);
	assert.equal(objeto.solución, 'Se reinició el servicio');
});

test('EnProgreso: la nota se guarda sin cambiar estado ni SLA', () => {
	const objeto = enProgreso();
	const estado = objeto.estado;
	assert.equal(objeto.registrarNota('primera'), true);
	assert.equal(objeto.registrarNota('segunda'), true);
	assert.equal(objeto.notaDeAvance, 'segunda');
	assert.equal(objeto.estado, estado);
	assert.equal(objeto.fechaInicioSLA.getTime(), 0);
});

test('EnProgreso: escalar a mano sube, guarda el motivo y devuelve a la cola', () => {
	const objeto = enProgreso({ notaDeAvance: 'avance' });
	objeto.escalarManualmente('Excede mi competencia');
	assert.ok(objeto.estado instanceof TicketAbierto);
	assert.equal(objeto.nivelActual, NivelDeServicio.Nivel2);
	assert.equal(objeto.técnicoAsignado, null);
	assert.equal(objeto.fechaToma, null);
	assert.equal(objeto.motivoEscalamiento, 'Excede mi competencia');
	assert.equal(objeto.notaDeAvance, 'avance');
	assert.ok(objeto.fechaInicioSLA.getTime() > 0);
});

test('EnProgreso en Nivel 3: no se escala a mano ni guarda el motivo', () => {
	const objeto = enProgreso({ nivelActual: NivelDeServicio.Nivel3 });
	const estado = objeto.estado;
	objeto.escalarManualmente('motivo');
	assert.equal(objeto.estado, estado);
	assert.equal(objeto.motivoEscalamiento, null);
	assert.equal(objeto.técnicoAsignado, técnico);
});

for (const Estado of [TicketAbierto, TicketEnProgreso, TicketRezagado]) {
	test(`${Estado.name}: el vencimiento sube, quita al técnico y reinicia el SLA`, () => {
		const objeto = ticket(Estado, { técnicoAsignado: técnico, fechaToma: new Date(0), motivoEscalamiento: 'previo' });
		objeto.escalarPorVencimiento();
		assert.ok(objeto.estado instanceof TicketRezagado);
		assert.equal(objeto.nivelActual, NivelDeServicio.Nivel2);
		assert.equal(objeto.técnicoAsignado, null);
		assert.equal(objeto.fechaToma, null);
		assert.equal(objeto.motivoEscalamiento, 'previo');
		assert.ok(objeto.fechaInicioSLA.getTime() > 0);
	});

	test(`${Estado.name} en Nivel 3: vence sin subir y reinicia el SLA`, () => {
		const objeto = ticket(Estado, { técnicoAsignado: técnico, nivelActual: NivelDeServicio.Nivel3 });
		objeto.escalarPorVencimiento();
		assert.ok(objeto.estado instanceof TicketRezagado);
		assert.equal(objeto.nivelActual, NivelDeServicio.Nivel3);
		assert.equal(objeto.técnicoAsignado, null);
		assert.ok(objeto.fechaInicioSLA.getTime() > 0);
	});
}

test('Resuelto: ningún evento lo cambia', () => {
	const objeto = ticket(TicketResuelto, { técnicoAsignado: técnico, solución: 'hecho' });
	const estado = objeto.estado;
	objeto.tomar(new TécnicoDeSoporte({ id: 't2' }));
	objeto.resolver('otra');
	objeto.escalarManualmente('motivo');
	objeto.escalarPorVencimiento();
	assert.equal(objeto.registrarNota('nota'), false);
	assert.equal(objeto.estado, estado);
	assert.equal(objeto.solución, 'hecho');
	assert.equal(objeto.técnicoAsignado, técnico);
	assert.equal(objeto.nivelActual, NivelDeServicio.Nivel1);
});

for (const [prioridad, horas] of [[Prioridad.Alta, 2], [Prioridad.Media, 24], [Prioridad.Baja, 48]]) {
	test(`estáVencido: ${prioridad} vence al alcanzar ${horas} h`, () => {
		const hace = (tiempo) => ticket(TicketAbierto, { prioridad, fechaInicioSLA: new Date(Date.now() - tiempo) });
		assert.equal(hace(horas * HORA).estáVencido(), true);
		assert.equal(hace(horas * HORA - 60000).estáVencido(), false);
	});
}
