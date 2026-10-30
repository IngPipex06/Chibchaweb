import { Titular } from './Titular.js';

export class Distribuidor extends Titular {
	#categoría;
	#comisiónAplicable;
	#datosDeContacto;
	#dominiosGestionados;
	#nit;
	#numeroDominiosGestionados;
	#razónSocial;

	constructor(datos = {}) {
		super(datos);
		this.#categoría = datos.categoría ?? null;
		this.#comisiónAplicable = datos.comisiónAplicable ?? null;
		this.#datosDeContacto = datos.datosDeContacto ?? null;
		this.#dominiosGestionados = datos.dominiosGestionados ?? [];
		this.#nit = datos.nit ?? null;
		this.#numeroDominiosGestionados = datos.numeroDominiosGestionados ?? null;
		this.#razónSocial = datos.razónSocial ?? null;
	}

	get razónSocial() {
		return this.#razónSocial;
	}

	notificarCambioDeCategoría() {
	}

	recalcularCategoría() {
	}
}
