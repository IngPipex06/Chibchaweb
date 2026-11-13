import { Usuario } from './Usuario.js';

/**
 * Titular de la cuenta de negocio: Cliente o Distribuidor. Guarda los medios de
 * pago y es quien paga las facturas y abre los tickets. Separa los datos de
 * negocio de los datos de cuenta de Usuario.
 */
export class Titular extends Usuario {
	#mediosDePago;

	constructor(datos = {}) {
		super(datos);
		if (new.target === Titular) throw new Error('Titular es abstracta');
		this.#mediosDePago = datos.mediosDePago ?? [];
	}

	/**
	 * @param {MedioDePago} medioDePago
	 */
	agregarMedioDePago(medioDePago) {
		this.#mediosDePago.push(medioDePago);
	}

	/**
	 * @param {MedioDePago} medioDePago
	 */
	quitarMedioDePago(medioDePago) {
		this.#mediosDePago = this.#mediosDePago.filter((elemento) => elemento !== medioDePago);
	}
}
