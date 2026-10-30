import { Titular } from './Titular.js';

export class Cliente extends Titular {
	#dirección;
	#dominios;
	#fechaNacimiento;
	#nombreCompleto;
	#numeroDocumento;
	#paqueteHosting;
	#planDePago;
	#teléfono;
	#tipoDocumento;

	constructor(datos = {}) {
		super(datos);
		this.#dirección = datos.dirección ?? null;
		this.#dominios = datos.dominios ?? [];
		this.#fechaNacimiento = datos.fechaNacimiento ?? null;
		this.#nombreCompleto = datos.nombreCompleto ?? null;
		this.#numeroDocumento = datos.numeroDocumento ?? null;
		this.#paqueteHosting = datos.paqueteHosting ?? null;
		this.#planDePago = datos.planDePago ?? null;
		this.#teléfono = datos.teléfono ?? null;
		this.#tipoDocumento = datos.tipoDocumento ?? null;
	}

	get dirección() {
		return this.#dirección;
	}

	get nombreCompleto() {
		return this.#nombreCompleto;
	}

	get numeroDocumento() {
		return this.#numeroDocumento;
	}

	get tipoDocumento() {
		return this.#tipoDocumento;
	}

	/**
	 * @param {Dominio} dominio
	 */
	agregarDominio(dominio) {
		this.#dominios.push(dominio);
	}

	/**
	 * @param {Dominio} dominio
	 */
	quitarDominio(dominio) {
		this.#dominios = this.#dominios.filter((elemento) => elemento !== dominio);
	}
}
