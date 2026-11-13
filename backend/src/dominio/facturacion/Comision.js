export class Comisión {
	#cheque;
	#distribuidor;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#monto;
	/**
	 * Base de UC14. Solo vive en memoria; no se persiste.
	 */
	#montoFacturado;
	#período;
	#porcentajeAplicado;

	constructor(datos = {}) {
		this.#cheque = datos.cheque ?? null;
		this.#distribuidor = datos.distribuidor ?? null;
		this.#id = datos.id ?? null;
		this.#monto = datos.monto ?? null;
		this.#montoFacturado = datos.montoFacturado ?? 0;
		this.#período = datos.período ?? null;
		this.#porcentajeAplicado = datos.porcentajeAplicado ?? null;
	}

	get cheque() {
		return this.#cheque;
	}

	set cheque(cheque) {
		this.#cheque = cheque;
	}

	get distribuidor() {
		return this.#distribuidor;
	}

	get monto() {
		return this.#monto;
	}

	get período() {
		return this.#período;
	}

	get porcentajeAplicado() {
		return this.#porcentajeAplicado;
	}

	/**
	 * UC14: monto facturado por porcentaje de comisión, redondeado al centavo.
	 * @param {Distribuidor} distribuidor
	 * @returns {number}
	 */
	calcular(distribuidor) {
		this.#distribuidor = distribuidor;
		this.#porcentajeAplicado = distribuidor.comisiónAplicable;
		this.#monto = Math.round(this.#montoFacturado * this.#porcentajeAplicado) / 100;
		return this.#monto;
	}
}
