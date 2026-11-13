import { formatearFecha } from '../facturacion/Factura.js';
import { EstadoComprobante } from './EstadoComprobante.js';
import { PasarelaDePagoSimulada } from './PasarelaDePagoSimulada.js';

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

	get estado() {
		return this.#estado;
	}

	get fecha() {
		return this.#fecha;
	}

	get monto() {
		return this.#monto;
	}

	/**
	 * @param {Factura} factura
	 * @param {MedioDePago} medioDePago
	 * @returns {ComprobanteDePago}
	 */
	procesarCobro(factura, medioDePago) {
		const aprobado = new PasarelaDePagoSimulada().cobrar(medioDePago, factura.monto);
		this.#factura = factura;
		this.#medioDePago = medioDePago;
		this.#monto = factura.monto;
		this.#fecha = formatearFecha(new Date());
		this.#estado = aprobado ? EstadoComprobante.Exitoso : EstadoComprobante.Fallido;
		return this;
	}
}
