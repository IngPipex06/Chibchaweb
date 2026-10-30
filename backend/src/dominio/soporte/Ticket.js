import { NivelDeServicio } from './NivelDeServicio.js';

export class Ticket {
	#descripción;
	#dominio;
	#estado;
	#fechaCreación;
	#fechaInicioSLA;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#nivelActual;
	#prioridad;
	#solicitante;
	#técnicoAsignado;

	constructor(datos = {}) {
		this.#descripción = datos.descripción ?? null;
		this.#dominio = datos.dominio ?? null;
		this.#estado = datos.estado ?? null;
		this.#fechaCreación = datos.fechaCreación ?? null;
		this.#fechaInicioSLA = datos.fechaInicioSLA ?? null;
		this.#id = datos.id ?? null;
		this.#nivelActual = datos.nivelActual ?? NivelDeServicio.Nivel1;
		this.#prioridad = datos.prioridad ?? null;
		this.#solicitante = datos.solicitante ?? null;
		this.#técnicoAsignado = datos.técnicoAsignado ?? null;
	}

	/**
	 * @param {EstadoTicket} nuevo
	 */
	cambiarEstado(nuevo) {
	}

	escalarManualmente() {
	}

	escalarPorVencimiento() {
	}

	/**
	 * @returns {boolean}
	 */
	estáVencido() {
	}

	/**
	 * @param {string} solución
	 */
	resolver(solución) {
	}

	/**
	 * @param {TécnicoDeSoporte} técnico
	 */
	tomar(técnico) {
	}
}
