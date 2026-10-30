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
}
