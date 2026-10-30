export class EstadoTicket {
	/**
	 * @param {Ticket} ticket
	 */
	escalarManualmente(ticket) {
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
