import { devolverACola, EstadoTicket } from './EstadoTicket.js';
import { TicketEnProgreso } from './TicketEnProgreso.js';

export class TicketRezagado extends EstadoTicket {
	/**
	 * @param {Ticket} ticket
	 * @param {string} motivo
	 */
	escalarManualmente(ticket, motivo) {
	}

	/**
	 * @param {Ticket} ticket
	 */
	escalarPorVencimiento(ticket) {
		devolverACola(ticket);
	}

	/**
	 * @param {Ticket} ticket
	 * @param {string} nota
	 * @returns {boolean}
	 */
	registrarNota(ticket, nota) {
		return false;
	}

	/**
	 * @param {Ticket} ticket
	 * @param {string} solución
	 */
	resolver(ticket, solución) {
	}

	/**
	 * @param {Ticket} ticket
	 * @param {TécnicoDeSoporte} técnico
	 */
	tomar(ticket, técnico) {
		ticket.técnicoAsignado = técnico;
		ticket.fechaToma = new Date();
		ticket.cambiarEstado(new TicketEnProgreso());
	}
}
