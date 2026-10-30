import { Usuario } from './Usuario.js';

export class Empleado extends Usuario {
	#cargo;
	#documento;
	#nombreCompleto;
	#teléfono;

	constructor(datos = {}) {
		super(datos);
		if (new.target === Empleado) throw new Error('Empleado es abstracta');
		this.#cargo = datos.cargo ?? null;
		this.#documento = datos.documento ?? null;
		this.#nombreCompleto = datos.nombreCompleto ?? null;
		this.#teléfono = datos.teléfono ?? null;
	}
}
