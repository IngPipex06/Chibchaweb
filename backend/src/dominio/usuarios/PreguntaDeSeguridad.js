export class PreguntaDeSeguridad {
	#pregunta;
	#respuesta;

	constructor(datos = {}) {
		this.#pregunta = datos.pregunta ?? null;
		this.#respuesta = datos.respuesta ?? null;
	}

	/**
	 * @param {string} intento
	 * @returns {boolean}
	 */
	validarRespuesta(intento) {
	}
}
