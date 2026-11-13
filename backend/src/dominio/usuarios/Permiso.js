export class Permiso {
	#descripción;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#nombre;

	constructor(datos = {}) {
		this.#descripción = datos.descripción ?? null;
		this.#id = datos.id ?? null;
		this.#nombre = datos.nombre ?? null;
	}

	get nombre() {
		return this.#nombre;
	}
}
