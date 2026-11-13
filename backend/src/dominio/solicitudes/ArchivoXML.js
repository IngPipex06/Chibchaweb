export class ArchivoXML {
	#contenido;
	#formatoVersión;

	constructor(datos = {}) {
		this.#contenido = datos.contenido ?? null;
		this.#formatoVersión = datos.formatoVersión ?? null;
	}

	get contenido() {
		return this.#contenido;
	}

	get formatoVersión() {
		return this.#formatoVersión;
	}
}
