import PDFDocument from 'pdfkit';
import { BancoSimulado } from './BancoSimulado.js';
import { formatearFecha } from './Factura.js';

export class Cheque {
	/**
	 * UC15, paso 3: distribuidor y periodo se leen de aquí. Solo en memoria; la tabla guarda `comisionId`.
	 */
	#comisión;
	#fechaGeneración;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#monto;
	#número;

	constructor(datos = {}) {
		this.#comisión = datos.comisión ?? null;
		this.#fechaGeneración = datos.fechaGeneración ?? null;
		this.#id = datos.id ?? null;
		this.#monto = datos.monto ?? null;
		this.#número = datos.número ?? null;
	}

	get fechaGeneración() {
		return this.#fechaGeneración;
	}

	get monto() {
		return this.#monto;
	}

	get número() {
		return this.#número;
	}

	/**
	 * UC15, paso 5.
	 * @returns {Promise<Buffer>}
	 */
	exportarPDF() {
		return new Promise((resolver, rechazar) => {
			const documento = new PDFDocument();
			const partes = [];
			documento.on('data', (parte) => partes.push(parte));
			documento.on('end', () => resolver(Buffer.concat(partes)));
			documento.on('error', rechazar);

			documento.fontSize(18).text('ChibchaWeb: cheque de comisión');
			documento.moveDown().fontSize(12);
			documento.text(`Número: ${this.#número}`);
			documento.text(`Distribuidor: ${this.#comisión.distribuidor.razónSocial}`);
			documento.text(`Periodo: ${this.#comisión.período}`);
			documento.text(`Monto: ${this.#monto}`);
			documento.text(`Fecha de generación: ${this.#fechaGeneración}`);
			documento.end();
		});
	}

	/**
	 * @param {Comisión} comisión
	 */
	generar(comisión) {
		this.#comisión = comisión;
		this.#monto = comisión.monto;
		this.#número = new BancoSimulado().emitirCheque(comisión.monto);
		this.#fechaGeneración = formatearFecha(new Date());
	}
}
