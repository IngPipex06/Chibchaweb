import { EstadoTicket } from './EstadoTicket.js';

export class TicketResuelto extends EstadoTicket {
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
	}
}
