import { NivelDeServicio } from './NivelDeServicio.js';
import { Prioridad } from './Prioridad.js';

const HORAS_DE_PLAZO = Object.freeze({
	[Prioridad.Alta]: 2,
	[Prioridad.Media]: 24,
	[Prioridad.Baja]: 48,
});
const MILISEGUNDOS_POR_HORA = 60 * 60 * 1000;

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
	#fechaToma;
	#motivoEscalamiento;
	#notaDeAvance;
	#solución;
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
		this.#solución = datos.solución ?? null;
		this.#fechaToma = datos.fechaToma ?? null;
		this.#motivoEscalamiento = datos.motivoEscalamiento ?? null;
		this.#notaDeAvance = datos.notaDeAvance ?? null;
		this.#técnicoAsignado = datos.técnicoAsignado ?? null;
	}

	get estado() {
		return this.#estado;
	}

	get fechaInicioSLA() {
		return this.#fechaInicioSLA;
	}

	set fechaInicioSLA(valor) {
		this.#fechaInicioSLA = valor;
	}

	get fechaToma() {
		return this.#fechaToma;
	}

	set fechaToma(valor) {
		this.#fechaToma = valor;
	}

	get motivoEscalamiento() {
		return this.#motivoEscalamiento;
	}

	set motivoEscalamiento(valor) {
		this.#motivoEscalamiento = valor;
	}

	get nivelActual() {
		return this.#nivelActual;
	}

	set nivelActual(valor) {
		this.#nivelActual = valor;
	}

	get notaDeAvance() {
		return this.#notaDeAvance;
	}

	set notaDeAvance(valor) {
		this.#notaDeAvance = valor;
	}

	get solución() {
		return this.#solución;
	}

	set solución(valor) {
		this.#solución = valor;
	}

	get técnicoAsignado() {
		return this.#técnicoAsignado;
	}

	set técnicoAsignado(valor) {
		this.#técnicoAsignado = valor;
	}

	/**
	 * @param {EstadoTicket} nuevo
	 */
	cambiarEstado(nuevo) {
		this.#estado = nuevo;
	}

	/**
	 * @param {string} motivo
	 */
	escalarManualmente(motivo) {
		this.#estado.escalarManualmente(this, motivo);
	}

	escalarPorVencimiento() {
		this.#estado.escalarPorVencimiento(this);
	}

	/**
	 * @returns {boolean}
	 */
	estáVencido() {
		const transcurrido = Date.now() - this.#fechaInicioSLA.getTime();
		return transcurrido >= HORAS_DE_PLAZO[this.#prioridad] * MILISEGUNDOS_POR_HORA;
	}

	/**
	 * @param {string} nota
	 * @returns {boolean}
	 */
	registrarNota(nota) {
		return this.#estado.registrarNota(this, nota);
	}

	/**
	 * @param {string} solución
	 */
	resolver(solución) {
		this.#estado.resolver(this, solución);
	}

	/**
	 * @param {TécnicoDeSoporte} técnico
	 */
	tomar(técnico) {
		this.#estado.tomar(this, técnico);
	}
}
