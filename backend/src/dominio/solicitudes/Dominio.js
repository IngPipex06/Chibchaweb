export class Dominio {
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#nombre;

	constructor(datos = {}) {
		this.#id = datos.id ?? null;
		this.#nombre = datos.nombre ?? null;
	}
}
