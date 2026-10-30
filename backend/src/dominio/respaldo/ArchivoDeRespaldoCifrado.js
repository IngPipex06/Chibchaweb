export class ArchivoDeRespaldoCifrado {
	#contenidoCifrado;
	#fecha;
	#origen;

	constructor(datos = {}) {
		this.#contenidoCifrado = datos.contenidoCifrado ?? null;
		this.#fecha = datos.fecha ?? null;
		this.#origen = datos.origen ?? null;
	}
}
