import { EstadoFactura } from './EstadoFactura.js';

const PLAZO_DE_PAGO_EN_DIAS = 30;

export function formatearFecha(fecha) {
	const mes = String(fecha.getMonth() + 1).padStart(2, '0');
	const día = String(fecha.getDate()).padStart(2, '0');
	return `${fecha.getFullYear()}-${mes}-${día}`;
}

export class Factura {
	#estado;
	#fechaEmisión;
	#fechaVencimiento;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#monto;
	#número;
	#pagador;
	#período;

	constructor(datos = {}) {
		this.#estado = datos.estado ?? EstadoFactura.Pendiente;
		this.#fechaEmisión = datos.fechaEmisión ?? null;
		this.#fechaVencimiento = datos.fechaVencimiento ?? null;
		this.#id = datos.id ?? null;
		this.#monto = datos.monto ?? null;
		this.#número = datos.número ?? null;
		this.#pagador = datos.pagador ?? null;
		this.#período = datos.período ?? null;
	}

	get estado() {
		return this.#estado;
	}

	get fechaEmisión() {
		return this.#fechaEmisión;
	}

	get fechaVencimiento() {
		return this.#fechaVencimiento;
	}

	get monto() {
		return this.#monto;
	}

	get número() {
		return this.#número;
	}

	get pagador() {
		return this.#pagador;
	}

	get período() {
		return this.#período;
	}

	/**
	 * UC11, pasos 7 y 8: estado pendiente, fecha de emisión y vencimiento.
	 */
	emitir() {
		const hoy = new Date();
		const vencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + PLAZO_DE_PAGO_EN_DIAS);
		this.#estado = EstadoFactura.Pendiente;
		this.#fechaEmisión = formatearFecha(hoy);
		this.#fechaVencimiento = formatearFecha(vencimiento);
	}
}
