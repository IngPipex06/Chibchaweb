import { MedioDePago } from './MedioDePago.js';

export class TarjetaMastercard extends MedioDePago {
	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarLongitud() {
		return this.numero.length === 16;
	}

	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarPrefijo() {
		const dosDigitos = Number(this.numero.slice(0, 2));
		const cuatroDigitos = Number(this.numero.slice(0, 4));
		return (dosDigitos >= 51 && dosDigitos <= 55) || (cuatroDigitos >= 2221 && cuatroDigitos <= 2720);
	}
}
