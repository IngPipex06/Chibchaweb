import { NivelDeServicio } from './NivelDeServicio.js';

/** Efecto común de los dos escalamientos; en Nivel 3 el ticket no sube más. */
export function devolverACola(ticket) {
	ticket.nivelActual = ticket.nivelActual.siguiente();
	ticket.técnicoAsignado = null;
	ticket.fechaToma = null;
	ticket.fechaInicioSLA = new Date();
}

export function puedeSubirDeNivel(ticket) {
	return ticket.nivelActual !== NivelDeServicio.Nivel3;
}

export class EstadoTicket {
	/**
	 * @param {Ticket} ticket
	 * @param {string} motivo
	 */
	escalarManualmente(ticket, motivo) {
		throw new Error('EstadoTicket.escalarManualmente() no implementado');
	}

	/**
	 * @param {Ticket} ticket
	 */
	escalarPorVencimiento(ticket) {
		throw new Error('EstadoTicket.escalarPorVencimiento() no implementado');
	}

	/**
	 * @param {Ticket} ticket
	 * @param {string} nota
	 * @returns {boolean}
	 */
	registrarNota(ticket, nota) {
		throw new Error('EstadoTicket.registrarNota() no implementado');
	}

	/**
	 * @param {Ticket} ticket
	 * @param {string} solución
	 */
	resolver(ticket, solución) {
		throw new Error('EstadoTicket.resolver() no implementado');
	}

	/**
	 * @param {Ticket} ticket
	 * @param {TécnicoDeSoporte} técnico
	 */
	tomar(ticket, técnico) {
		throw new Error('EstadoTicket.tomar() no implementado');
	}
}
