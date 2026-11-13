export class EntradaDeInconsistencia {
	#fecha;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#motivo;
	#registroOriginal;

	constructor(datos = {}) {
		this.#fecha = datos.fecha ?? null;
		this.#id = datos.id ?? null;
		this.#motivo = datos.motivo ?? null;
		this.#registroOriginal = datos.registroOriginal ?? null;
	}

	get fecha() {
		return this.#fecha;
	}

	get motivo() {
		return this.#motivo;
	}

	get registroOriginal() {
		return this.#registroOriginal;
	}
}
