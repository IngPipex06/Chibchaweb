export class ArchivoXML {
	#contenido;
	#formatoVersión;

	constructor(datos = {}) {
		this.#contenido = datos.contenido ?? null;
		this.#formatoVersión = datos.formatoVersión ?? null;
	}
}
