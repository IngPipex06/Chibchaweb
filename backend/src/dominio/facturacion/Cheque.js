export class Cheque {
	#fechaGeneración;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#monto;
	#número;

	constructor(datos = {}) {
		this.#fechaGeneración = datos.fechaGeneración ?? null;
		this.#id = datos.id ?? null;
		this.#monto = datos.monto ?? null;
		this.#número = datos.número ?? null;
	}

	/**
	 * @returns {Archivo}
	 */
	exportarPDF() {
	}

	/**
	 * @param {Comisión} comisión
	 */
	generar(comisión) {
	}
}
