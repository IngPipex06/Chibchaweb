import { Empleado } from './Empleado.js';

export class Administrador extends Empleado {
	#rol;

	constructor(datos = {}) {
		super(datos);
		this.#rol = datos.rol ?? null;
	}

	get rol() {
		return this.#rol;
	}
}
