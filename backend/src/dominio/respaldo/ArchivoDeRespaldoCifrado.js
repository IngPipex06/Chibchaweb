export class ArchivoDeRespaldoCifrado {
	#contenidoCifrado;
	#fecha;
	#origen;

	constructor(datos = {}) {
		this.#contenidoCifrado = datos.contenidoCifrado ?? null;
		this.#fecha = datos.fecha ?? null;
		this.#origen = datos.origen ?? null;
	}

	get contenidoCifrado() {
		return this.#contenidoCifrado;
	}

	get fecha() {
		return this.#fecha;
	}

	get origen() {
		return this.#origen;
	}
}
