import { Empleado } from './Empleado.js';

export class TécnicoDeSoporte extends Empleado {
	#nivelDeServicio;

	constructor(datos = {}) {
		super(datos);
		this.#nivelDeServicio = datos.nivelDeServicio ?? null;
	}

	/**
	 * @returns {Ticket[]}
	 */
	verTicketsAsignados() {
	}
}
