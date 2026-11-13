export class PuntoDeControlMigración {
	#fecha;
	#posición;

	constructor(datos = {}) {
		this.#fecha = datos.fecha ?? null;
		this.#posición = datos.posición ?? null;
	}

	get fecha() {
		return this.#fecha;
	}

	get posición() {
		return this.#posición;
	}
}
