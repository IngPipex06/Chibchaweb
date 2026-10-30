import { Cheque } from './Cheque.js';
import { Comisión } from './Comision.js';

export class CierreMensual {
	#comisiones;
	#fechaEjecución;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#período;
	/**
	 * Lo que arma el servicio antes de `ejecutar`, pares de distribuidor y monto facturado. Solo en memoria.
	 */
	#pendientes;

	constructor(datos = {}) {
		this.#comisiones = datos.comisiones ?? [];
		this.#fechaEjecución = datos.fechaEjecución ?? null;
		this.#id = datos.id ?? null;
		this.#pendientes = datos.pendientes ?? [];
		this.#período = datos.período ?? null;
	}

	get comisiones() {
		return this.#comisiones;
	}

	/**
	 * UC12, por cada distribuidor en orden: UC13, UC14 y UC15.
	 */
	ejecutar() {
		for (const { distribuidor, montoFacturado } of this.#pendientes) {
			distribuidor.recalcularCategoría();
			const comisión = new Comisión({ período: this.#período, montoFacturado });
			comisión.calcular(distribuidor);
			const cheque = new Cheque();
			cheque.generar(comisión);
			comisión.cheque = cheque;
			this.agregarComisión(comisión);
		}
	}

	/**
	 * @param {Comisión} comisión
	 */
	agregarComisión(comisión) {
		this.#comisiones.push(comisión);
	}

	/**
	 * @param {Comisión} comisión
	 */
	quitarComisión(comisión) {
		this.#comisiones = this.#comisiones.filter((elemento) => elemento !== comisión);
	}
}
