import { MedioDePago } from './MedioDePago.js';

export class TarjetaDiners extends MedioDePago {
	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarLongitud() {
		return this.numero.length === 14;
	}

	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarPrefijo() {
		const tresDigitos = Number(this.numero.slice(0, 3));
		return /^3[68]/.test(this.numero) || (tresDigitos >= 300 && tresDigitos <= 305);
	}
}
