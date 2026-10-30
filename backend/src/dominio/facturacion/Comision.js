export class Comisión {
	#cheque;
	#distribuidor;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#monto;
	#período;
	#porcentajeAplicado;

	constructor(datos = {}) {
		this.#cheque = datos.cheque ?? null;
		this.#distribuidor = datos.distribuidor ?? null;
		this.#id = datos.id ?? null;
		this.#monto = datos.monto ?? null;
		this.#período = datos.período ?? null;
		this.#porcentajeAplicado = datos.porcentajeAplicado ?? null;
	}

	/**
	 * @param {Distribuidor} distribuidor
	 * @returns {number}
	 */
	calcular(distribuidor) {
	}
}
