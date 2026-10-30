export class Dirección {
	#calle;
	#ciudad;
	#códigoPostal;
	#departamentoOPaís;
	/**
	 * Errores de la última validación. Solo viven en memoria; no se persisten.
	 */
	#erroresDeFormato = [];

	constructor(datos = {}) {
		this.#calle = datos.calle ?? null;
		this.#ciudad = datos.ciudad ?? null;
		this.#códigoPostal = datos.códigoPostal ?? null;
		this.#departamentoOPaís = datos.departamentoOPaís ?? null;
	}

	get erroresDeFormato() {
		return [...this.#erroresDeFormato];
	}

	/**
	 * @returns {boolean}
	 */
	validarFormato() {
		const textoValido = (valor, maximo) =>
			typeof valor === 'string' && valor.trim() !== '' && valor.length <= maximo;
		this.#erroresDeFormato = [
			...(textoValido(this.#calle, 255) ? [] : ['calle inválida']),
			...(textoValido(this.#ciudad, 100) ? [] : ['ciudad inválida']),
			...(textoValido(this.#departamentoOPaís, 100) ? [] : ['departamento o país inválido']),
			...(textoValido(this.#códigoPostal, 20) && /^[\p{L}\d -]+$/u.test(this.#códigoPostal)
				? []
				: ['código postal inválido']),
		];
		return this.#erroresDeFormato.length === 0;
	}
}
