import { TicketAbierto } from '../../dominio/soporte/TicketAbierto.js';
import { TicketEnProgreso } from '../../dominio/soporte/TicketEnProgreso.js';
import { TicketResuelto } from '../../dominio/soporte/TicketResuelto.js';
import { TicketRezagado } from '../../dominio/soporte/TicketRezagado.js';

const ESTADOS = Object.freeze({
	Abierto: TicketAbierto,
	EnProgreso: TicketEnProgreso,
	'Rezagado-SLAVencido': TicketRezagado,
	Resuelto: TicketResuelto,
});

export function crearEstado(texto) {
	return new ESTADOS[texto]();
}

export function textoDeEstado(estado) {
	return Object.keys(ESTADOS).find((texto) => estado instanceof ESTADOS[texto]);
}
