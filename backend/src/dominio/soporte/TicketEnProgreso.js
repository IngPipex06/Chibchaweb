import { EstadoTicket } from './EstadoTicket.js';

export class TicketEnProgreso extends EstadoTicket {
	/**
	 * @param {Ticket} ticket
	 */
	escalarManualmente(ticket) {
	}

	/**
	 * @param {Ticket} ticket
	 */
	escalarPorVencimiento(ticket) {
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
