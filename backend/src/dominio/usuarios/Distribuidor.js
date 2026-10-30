import { CategoríaDistribuidor } from './CategoriaDistribuidor.js';
import { Titular } from './Titular.js';

const UMBRAL_DE_DOMINIOS_PREMIUM = 100;

export const COMISIÓN_POR_CATEGORÍA = Object.freeze({
	[CategoríaDistribuidor.Básico]: 10,
	[CategoríaDistribuidor.Premium]: 15,
});

export class Distribuidor extends Titular {
	/**
	 * UC13 A1: no hay tabla de avisos, vive en memoria y sale en el resumen del cierre.
	 */
	#avisoDeCategoría = null;
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

	get avisoDeCategoría() {
		return this.#avisoDeCategoría;
	}

	get categoría() {
		return this.#categoría;
	}

	get comisiónAplicable() {
		return this.#comisiónAplicable;
	}

	get razónSocial() {
		return this.#razónSocial;
	}

	notificarCambioDeCategoría() {
		this.#avisoDeCategoría = `Su categoría cambió a ${this.#categoría}, con comisión del ${this.#comisiónAplicable}%`;
	}

	/**
	 * UC13: corte mensual contra el umbral de 100 dominios.
	 */
	recalcularCategoría() {
		const categoría =
			this.#numeroDominiosGestionados > UMBRAL_DE_DOMINIOS_PREMIUM
				? CategoríaDistribuidor.Premium
				: CategoríaDistribuidor.Básico;
		const cambió = categoría !== this.#categoría;
		this.#categoría = categoría;
		this.#comisiónAplicable = COMISIÓN_POR_CATEGORÍA[categoría];
		if (cambió) this.notificarCambioDeCategoría();
	}

	/**
	 * @param {Dominio} dominio
	 */
	agregarDominioGestionado(dominio) {
		this.#dominiosGestionados.push(dominio);
	}

	/**
	 * @param {Dominio} dominio
	 */
	quitarDominioGestionado(dominio) {
		this.#dominiosGestionados = this.#dominiosGestionados.filter((elemento) => elemento !== dominio);
	}
}
