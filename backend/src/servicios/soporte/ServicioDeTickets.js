import { enTransaccion } from '../../config/baseDeDatos.js';
import * as DominioGateway from '../../datos/gateways/DominioGateway.js';
import * as TicketGateway from '../../datos/gateways/TicketGateway.js';
import { NivelDeServicio } from '../../dominio/soporte/NivelDeServicio.js';
import { Prioridad } from '../../dominio/soporte/Prioridad.js';
import { Ticket } from '../../dominio/soporte/Ticket.js';
import { TécnicoDeSoporte } from '../../dominio/usuarios/TecnicoDeSoporte.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { exigirOpcion, exigirTexto, FORMATO_UUID } from '../usuarios/validacion.js';
import { crearEstado, textoDeEstado } from './FabricaDeEstadoTicket.js';

const LARGO_DE_TEXTO = 500;
const ESTADOS_DE_COLA = Object.freeze({
	Abierto: 'Abierto',
	EnProgreso: 'EnProgreso',
	Rezagado: 'Rezagado-SLAVencido',
});

function armarTicket(fila) {
	return new Ticket({
		id: fila.id,
		prioridad: fila.prioridad,
		fechaInicioSLA: fila.fechaInicioSLA,
		solución: fila.solución,
		fechaToma: fila.fechaToma,
		motivoEscalamiento: fila.motivoEscalamiento,
		notaDeAvance: fila.notaDeAvance,
		nivelActual: NivelDeServicio[fila.nivelActual],
		estado: crearEstado(fila.estado),
		técnicoAsignado: fila.tecnicoAsignadoId ? new TécnicoDeSoporte({ id: fila.tecnicoAsignadoId }) : null,
	});
}

function filaDeTicket(ticket) {
	return {
		estado: textoDeEstado(ticket.estado),
		nivelActual: ticket.nivelActual.valor,
		tecnicoAsignadoId: ticket.técnicoAsignado?.id ?? null,
		fechaInicioSLA: ticket.fechaInicioSLA,
		solución: ticket.solución,
		fechaToma: ticket.fechaToma,
		motivoEscalamiento: ticket.motivoEscalamiento,
		notaDeAvance: ticket.notaDeAvance,
	};
}

export const listarSitios = (titularId) => DominioGateway.listarPorTitular(titularId);

/** UC22: fechaInicioSLA arranca el plazo; el temporizador lo revisa desde fuera. */
export async function abrirTicket(titularId, datos) {
	const dominioId = datos.dominioId;
	exigirTexto(dominioId, 'dominioId');
	const descripción = exigirTexto(datos.descripción, 'descripción', LARGO_DE_TEXTO);
	const prioridad = exigirOpcion(datos.prioridad, Prioridad, 'prioridad');
	if (!FORMATO_UUID.test(dominioId) || !(await DominioGateway.pertenece(dominioId, titularId))) {
		throw new ErrorDeServicio(404, 'El sitio no existe', 'dominioId');
	}
	const id = await TicketGateway.insertar({
		solicitanteId: titularId,
		dominioId,
		descripción,
		prioridad,
		fechaCreación: new Date(),
	});
	return TicketGateway.obtener(id);
}

export const listarTicketsDelTitular = (titularId) => TicketGateway.listarPorSolicitante(titularId);

/** UC23 A1: sin tickets del nivel el tablero queda vacío. */
export async function verTablero(técnico, filtros) {
	const { estado, prioridad } = filtros;
	if (estado !== undefined) exigirOpcion(estado, ESTADOS_DE_COLA, 'estado');
	if (prioridad !== undefined) exigirOpcion(prioridad, Prioridad, 'prioridad');
	return TicketGateway.listarPorNivel(técnico.nivelDeServicio, { estado, prioridad });
}

/** El estado decide: si la operación no vale en él, el ticket no cambia. La nota no cambia el estado: la aceptación la devuelve él. */
async function operar(id, exigirPermiso, operación) {
	await enTransaccion(async (conexion) => {
		const fila = await TicketGateway.bloquear(id, conexion);
		if (!fila) throw new ErrorDeServicio(404, 'El ticket no existe');
		exigirPermiso(fila);
		const ticket = armarTicket(fila);
		const estadoAnterior = ticket.estado;
		const aceptada = operación(ticket);
		if (!aceptada && ticket.estado === estadoAnterior) {
			throw new ErrorDeServicio(409, 'La operación no es válida en el estado actual del ticket');
		}
		await TicketGateway.actualizar(id, filaDeTicket(ticket), conexion);
	});
	return TicketGateway.obtener(id);
}

function delNivel(técnico) {
	return (fila) => {
		if (fila.nivelActual !== técnico.nivelDeServicio) {
			throw new ErrorDeServicio(403, 'El ticket no es de su nivel');
		}
	};
}

function asignadoA(técnico) {
	return (fila) => {
		if (fila.tecnicoAsignadoId !== técnico.id) {
			throw new ErrorDeServicio(403, 'El ticket no está asignado a este técnico');
		}
	};
}

export function tomarTicket(técnico, id) {
	return operar(id, delNivel(técnico), (ticket) => ticket.tomar(técnico));
}

/** UC23 paso 7: no hay correo ni avisos guardados; el titular ve el estado y la solución en sus tickets. */
export async function resolverTicket(técnico, id, datos) {
	const solución = exigirTexto(datos.solución, 'solución', LARGO_DE_TEXTO);
	const ticket = await operar(id, asignadoA(técnico), (objeto) => objeto.resolver(solución));
	return { ...ticket, notificación: 'Aviso simulado al solicitante: el ticket fue resuelto' };
}

/** UC24: el motivo queda en el ticket; guarda solo el último. */
export function escalarTicket(técnico, id, datos) {
	const motivo = exigirTexto(datos.motivo, 'motivo', LARGO_DE_TEXTO);
	return operar(id, asignadoA(técnico), (ticket) => ticket.escalarManualmente(motivo));
}

/** UC23 E1: el ticket sigue en su estado y el SLA corriendo; guarda solo la última nota. */
export function anotarAvance(técnico, id, datos) {
	const nota = exigirTexto(datos.nota, 'nota', LARGO_DE_TEXTO);
	return operar(id, asignadoA(técnico), (ticket) => ticket.registrarNota(nota));
}

/** UC25: lo dispara el temporizador; quien decide si venció es el ticket. */
export async function escalarTicketsVencidos() {
	return enTransaccion(async (conexion) => {
		const filas = await TicketGateway.bloquearSinResolver(conexion);
		let escalados = 0;
		for (const fila of filas) {
			const ticket = armarTicket(fila);
			if (!ticket.estáVencido()) continue;
			ticket.escalarPorVencimiento();
			await TicketGateway.actualizar(fila.id, filaDeTicket(ticket), conexion);
			escalados += 1;
		}
		return escalados;
	});
}
