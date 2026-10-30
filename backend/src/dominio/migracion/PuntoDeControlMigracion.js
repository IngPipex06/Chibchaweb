export class PuntoDeControlMigración {
	#fecha;
	#posición;

	constructor(datos = {}) {
		this.#fecha = datos.fecha ?? null;
		this.#posición = datos.posición ?? null;
	}
}
