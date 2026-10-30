import { EstadoFactura } from './EstadoFactura.js';

export class Factura {
	#estado;
	#fechaEmisión;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#monto;
	#número;
	#pagador;
	#período;
	#comprobanteDePago;

	constructor(datos = {}) {
		this.#estado = datos.estado ?? EstadoFactura.Pendiente;
		this.#fechaEmisión = datos.fechaEmisión ?? null;
		this.#id = datos.id ?? null;
		this.#monto = datos.monto ?? null;
		this.#número = datos.número ?? null;
		this.#pagador = datos.pagador ?? null;
		this.#período = datos.período ?? null;
		this.#comprobanteDePago = datos.comprobanteDePago ?? null;
	}

	emitir() {
	}
}
