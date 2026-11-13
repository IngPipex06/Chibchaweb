import { compararHash } from '../../config/hash.js';

export class PreguntaDeSeguridad {
	#pregunta;
	#respuesta;

	constructor(datos = {}) {
		this.#pregunta = datos.pregunta ?? null;
		this.#respuesta = datos.respuesta ?? null;
	}

	get pregunta() {
		return this.#pregunta;
	}

	/**
	 * @param {string} intento
	 * @returns {Promise<boolean>}
	 */
	validarRespuesta(intento) {
		return compararHash(intento, this.#respuesta);
	}
}
