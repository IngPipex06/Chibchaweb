export class GestorDeRespaldoCifrado {
	#algoritmoActivo;
	#archivosDeRespaldo;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;

	constructor(datos = {}) {
		this.#algoritmoActivo = datos.algoritmoActivo ?? null;
		this.#archivosDeRespaldo = datos.archivosDeRespaldo ?? [];
		this.#id = datos.id ?? null;
	}

	/**
	 * @param {string} datos
	 * @returns {ArchivoDeRespaldoCifrado}
	 */
	respaldar(datos) {
	}

	#seleccionarAlgoritmo() {
	}
}
