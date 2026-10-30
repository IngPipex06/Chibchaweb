export class MedioDePago {
	#fechaExpiración;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#numeroEnmascarado;

	constructor(datos = {}) {
		if (new.target === MedioDePago) throw new Error('MedioDePago es abstracta');
		this.#fechaExpiración = datos.fechaExpiración ?? null;
		this.#id = datos.id ?? null;
		this.#numeroEnmascarado = datos.numeroEnmascarado ?? null;
	}

	/**
	 * @returns {boolean}
	 */
	validar() {
	}

	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarDígitoVerificación() {
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
	}
}
