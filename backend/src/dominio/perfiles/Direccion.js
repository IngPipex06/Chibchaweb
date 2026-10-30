export class Dirección {
	#calle;
	#ciudad;
	#códigoPostal;
	#departamentoOPaís;

	constructor(datos = {}) {
		this.#calle = datos.calle ?? null;
		this.#ciudad = datos.ciudad ?? null;
		this.#códigoPostal = datos.códigoPostal ?? null;
		this.#departamentoOPaís = datos.departamentoOPaís ?? null;
	}

	/**
	 * @returns {boolean}
	 */
	validarFormato() {
	}
}
