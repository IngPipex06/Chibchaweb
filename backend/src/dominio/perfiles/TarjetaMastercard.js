import { MedioDePago } from './MedioDePago.js';

export class TarjetaMastercard extends MedioDePago {
	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarLongitud() {
	}

	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarPrefijo() {
	}
}
