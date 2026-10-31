import { devolverACola, EstadoTicket, puedeSubirDeNivel } from './EstadoTicket.js';
import { TicketAbierto } from './TicketAbierto.js';
import { TicketResuelto } from './TicketResuelto.js';
import { TicketRezagado } from './TicketRezagado.js';

export class TicketEnProgreso extends EstadoTicket {
	/**
	 * @param {Ticket} ticket
	 * @param {string} motivo
	 */
	escalarManualmente(ticket, motivo) {
		if (!puedeSubirDeNivel(ticket)) return;
		ticket.motivoEscalamiento = motivo;
		devolverACola(ticket);
		ticket.cambiarEstado(new TicketAbierto());
	}

	/**
	 * @param {Ticket} ticket
	 */
	escalarPorVencimiento(ticket) {
		devolverACola(ticket);
		ticket.cambiarEstado(new TicketRezagado());
	}

	/**
	 * @param {Ticket} ticket
	 * @param {string} nota
	 * @returns {boolean}
	 */
	registrarNota(ticket, nota) {
		ticket.notaDeAvance = nota;
		return true;
	}

	/**
	 * @param {Ticket} ticket
	 * @param {string} solución
	 */
	resolver(ticket, solución) {
		ticket.solución = solución;
		ticket.cambiarEstado(new TicketResuelto());
	}

	/**
	 * @param {Ticket} ticket
	 * @param {TécnicoDeSoporte} técnico
	 */
	tomar(ticket, técnico) {
	}
}
