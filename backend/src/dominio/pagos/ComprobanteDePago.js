export class ComprobanteDePago {
	#estado;
	#factura;
	#fecha;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#medioDePago;
	#monto;

	constructor(datos = {}) {
		this.#estado = datos.estado ?? null;
		this.#factura = datos.factura ?? null;
		this.#fecha = datos.fecha ?? null;
		this.#id = datos.id ?? null;
		this.#medioDePago = datos.medioDePago ?? null;
		this.#monto = datos.monto ?? null;
	}

	/**
	 * @param {Factura} factura
	 * @param {MedioDePago} medioDePago
	 * @returns {ComprobanteDePago}
	 */
	procesarCobro(factura, medioDePago) {
	}
}
