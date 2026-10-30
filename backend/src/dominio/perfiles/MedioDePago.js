import { PasarelaDePagoSimulada } from '../pagos/PasarelaDePagoSimulada.js';
import { EstadoMedioDePago } from './EstadoMedioDePago.js';

export class MedioDePago {
	#estado;
	#fechaExpiración;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#motivosDeRechazo = [];
	/**
	 * Número completo. Solo vive en memoria durante la validación; nunca se persiste.
	 */
	#numero;
	#numeroEnmascarado;

	constructor(datos = {}) {
		if (new.target === MedioDePago) throw new Error('MedioDePago es abstracta');
		this.#estado = datos.estado ?? EstadoMedioDePago.Activa;
		this.#fechaExpiración = datos.fechaExpiración ?? null;
		this.#id = datos.id ?? null;
		this.#numero = datos.numero ?? null;
		this.#numeroEnmascarado = datos.numeroEnmascarado ?? this.#enmascarar();
	}

	get estado() {
		return this.#estado;
	}

	get fechaExpiración() {
		return this.#fechaExpiración;
	}

	get motivosDeRechazo() {
		return [...this.#motivosDeRechazo];
	}

	get numeroEnmascarado() {
		return this.#numeroEnmascarado;
	}

	/**
	 * @protected
	 */
	get numero() {
		return this.#numero ?? '';
	}

	#enmascarar() {
		return this.#numero === null ? null : this.#numero.slice(-4).padStart(this.#numero.length, '*');
	}

	/**
	 * @returns {boolean}
	 */
	validar() {
		const estructuraVálida =
			this.validarLongitud() && this.validarPrefijo() && this.validarDígitoVerificación();
		const vigente = this.validarVigencia();
		if (!new PasarelaDePagoSimulada().autorizar(this)) {
			this.#motivosDeRechazo = ['franquicia no aceptada'];
			return false;
		}
		this.#motivosDeRechazo = [
			...(estructuraVálida ? [] : ['número incorrecto']),
			...(vigente ? [] : ['vencida']),
		];
		return this.#motivosDeRechazo.length === 0;
	}

	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarDígitoVerificación() {
		if (!/^\d+$/.test(this.numero)) return false;
		const suma = [...this.numero].reverse().reduce((total, caracter, posicion) => {
			const digito = Number(caracter);
			if (posicion % 2 === 0) return total + digito;
			return total + (digito > 4 ? digito * 2 - 9 : digito * 2);
		}, 0);
		return suma % 10 === 0;
	}

	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarLongitud() {
		throw new Error('MedioDePago.validarLongitud() no implementado');
	}

	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarPrefijo() {
		throw new Error('MedioDePago.validarPrefijo() no implementado');
	}

	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarVigencia() {
		const hoy = new Date().toLocaleDateString('en-CA');
		return String(this.#fechaExpiración) >= hoy;
	}
}
