export class RegistroLegado {
	#correo;
	#dominio;
	#estado;
	#idClienteLegado;
	#nombre;
	#planDeHosting;
	#tarjeta;

	constructor(datos = {}) {
		this.#correo = datos.correo ?? null;
		this.#dominio = datos.dominio ?? null;
		this.#estado = datos.estado ?? null;
		this.#idClienteLegado = datos.idClienteLegado ?? null;
		this.#nombre = datos.nombre ?? null;
		this.#planDeHosting = datos.planDeHosting ?? null;
		this.#tarjeta = datos.tarjeta ?? null;
	}

	/**
	 * @returns {boolean}
	 */
	validar() {
	}
}
