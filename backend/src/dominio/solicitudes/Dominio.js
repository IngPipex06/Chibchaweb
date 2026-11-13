export class Dominio {
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#nombre;
	#fechaRegistro;
	#fechaAsignación;

	constructor(datos = {}) {
		this.#id = datos.id ?? null;
		this.#nombre = datos.nombre ?? null;
		this.#fechaRegistro = datos.fechaRegistro ?? null;
		this.#fechaAsignación = datos.fechaAsignación ?? null;
	}
}
