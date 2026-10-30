export class CierreMensual {
	#comisiones;
	#fechaEjecución;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#período;

	constructor(datos = {}) {
		this.#comisiones = datos.comisiones ?? [];
		this.#fechaEjecución = datos.fechaEjecución ?? null;
		this.#id = datos.id ?? null;
		this.#período = datos.período ?? null;
	}

	ejecutar() {
	}

	/**
	 * @param {Comisión} comisión
	 */
	agregarComisión(comisión) {
		this.#comisiones.push(comisión);
	}

	/**
	 * @param {Comisión} comisión
	 */
	quitarComisión(comisión) {
		this.#comisiones = this.#comisiones.filter((elemento) => elemento !== comisión);
	}
}
