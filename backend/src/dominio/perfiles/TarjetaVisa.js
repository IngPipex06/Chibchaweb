import { MedioDePago } from './MedioDePago.js';

export class TarjetaVisa extends MedioDePago {
	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarLongitud() {
		return [13, 16, 19].includes(this.numero.length);
	}

	/**
	 * @protected
	 * @returns {boolean}
	 */
	validarPrefijo() {
		return this.numero.startsWith('4');
	}
}
