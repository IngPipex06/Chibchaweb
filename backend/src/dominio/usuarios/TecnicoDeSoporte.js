import { Empleado } from './Empleado.js';

export class TécnicoDeSoporte extends Empleado {
	#nivelDeServicio;

	constructor(datos = {}) {
		super(datos);
		this.#nivelDeServicio = datos.nivelDeServicio ?? null;
	}

	get nivelDeServicio() {
		return this.#nivelDeServicio;
	}

	/**
	 * @returns {Ticket[]}
	 */
	verTicketsAsignados() {
	}
}
