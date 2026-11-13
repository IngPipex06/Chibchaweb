import { FRANQUICIAS } from '../perfiles/Franquicias.js';
import { PaqueteDeHosting } from '../perfiles/PaqueteDeHosting.js';
import { PlanDePago } from '../perfiles/PlanDePago.js';
import { EstadoUsuario } from '../usuarios/EstadoUsuario.js';

const ENCABEZADO = 'ID_Cliente_Legado,Nombre,Dominio,Plan de Hosting,Estado,Tarjeta,Correo';
const COLUMNAS = ENCABEZADO.split(',').length;
const CARACTERES_DE_CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_TARJETA = /^(\d+)\|(0[1-9]|1[0-2])\/(\d{4})$/;
const POSIBLE_NUMERO_DE_TARJETA = /\d[\d -]{10,}\d/g;
const SISTEMAS_OPERATIVOS = Object.freeze(['Windows', 'Unix']);
const MAXIMO_NOMBRE = 255;
const MAXIMO_ID = 50;
const MAXIMO_MOTIVO = 255;

export class RegistroLegado {
	#correo;
	#cotejo = {};
	#dominio;
	#estado;
	#idClienteLegado;
	/**
	 * Número de línea en el archivo, para el reporte de UC28.
	 */
	#línea;
	#motivos = [];
	#nombre;
	#planDeHosting;
	#tarjeta;
	/**
	 * La línea original con la tarjeta enmascarada: es lo único que puede llegar al reporte.
	 */
	#texto;

	constructor(datos = {}) {
		this.#correo = datos.correo ?? null;
		this.#dominio = datos.dominio ?? null;
		this.#estado = datos.estado ?? null;
		this.#idClienteLegado = datos.idClienteLegado ?? null;
		this.#línea = datos.línea ?? null;
		this.#nombre = datos.nombre ?? null;
		this.#planDeHosting = datos.planDeHosting ?? null;
		this.#tarjeta = datos.tarjeta ?? null;
		this.#texto = datos.texto ?? null;
	}

	/**
	 * UC26 paso 2: revisa codificación y encabezado. Una fila incompleta no es falla estructural: la reporta UC28.
	 * @param {Buffer} archivoOrigen
	 * @returns {RegistroLegado[] | null} null si el archivo está corrupto o su esquema es incompatible
	 */
	static leerArchivo(archivoOrigen) {
		let texto;
		try {
			texto = new TextDecoder('utf-8', { fatal: true }).decode(archivoOrigen);
		} catch {
			return null;
		}
		if (CARACTERES_DE_CONTROL.test(texto)) return null;
		const [encabezado, ...filas] = texto.split(/\r?\n/);
		if (encabezado.trim() !== ENCABEZADO) return null;
		return filas.flatMap((fila, indice) => (fila.trim() === '' ? [] : [RegistroLegado.#desdeFila(fila, indice + 2)]));
	}

	static #desdeFila(fila, línea) {
		const columnas = fila.split(',').map((columna) => columna.trim());
		const [idClienteLegado, nombre, dominio, planDeHosting, estado, tarjeta, correo] =
			columnas.length === COLUMNAS ? columnas : [columnas[0]];
		return new RegistroLegado({
			correo: correo?.toLowerCase(),
			dominio: dominio?.toLowerCase(),
			estado,
			idClienteLegado,
			línea,
			nombre,
			planDeHosting,
			tarjeta,
			texto: fila.trim().replace(POSIBLE_NUMERO_DE_TARJETA, (numero) => numero.slice(-4).padStart(numero.length, '*')),
		});
	}

	get correo() {
		return this.#correo;
	}

	get dominio() {
		return this.#dominio;
	}

	get estado() {
		return this.#estado;
	}

	get esDuplicado() {
		return this.#cotejo.idYaMigrado === true;
	}

	get idClienteLegado() {
		return this.#idClienteLegado;
	}

	get línea() {
		return this.#línea;
	}

	get motivos() {
		return [...this.#motivos];
	}

	get nombre() {
		return this.#nombre;
	}

	get paquete() {
		return this.#planDeHosting.split('/')[0];
	}

	get planDePago() {
		return this.#planDeHosting.split('/')[2];
	}

	get texto() {
		return this.#texto;
	}

	/**
	 * Lo que el registro no puede saber solo: si su id, correo o dominio ya existen.
	 * @param {{ idYaMigrado?: boolean, documentoOcupado?: boolean, correoOcupado?: boolean, dominioOcupado?: boolean }} cotejo
	 */
	cotejar(cotejo) {
		this.#cotejo = cotejo;
	}

	/**
	 * UC28 paso 3: identificador, número de línea, regla y motivo.
	 * @returns {string}
	 */
	describirMotivo(motivo) {
		return `Línea ${this.#línea}, registro ${this.#idClienteLegado ?? 'sin id'}: ${motivo}`.slice(0, MAXIMO_MOTIVO);
	}

	/**
	 * Fila lista para guardar; el número completo no sale de aquí.
	 * @returns {{ tipoTarjeta: string, numeroEnmascarado: string, fechaExpiración: string, últimosDígitos: string }}
	 */
	tarjetaParaGuardar() {
		const { tipoTarjeta, tarjeta, últimosDígitos } = this.#leerTarjeta();
		return {
			tipoTarjeta,
			numeroEnmascarado: tarjeta.numeroEnmascarado,
			fechaExpiración: tarjeta.fechaExpiración,
			últimosDígitos,
		};
	}

	/**
	 * UC27: las cuatro reglas de RF8. Un duplicado del mismo id no es error: lo omite UC26 A2.
	 * @returns {boolean}
	 */
	validar() {
		if (this.esDuplicado) return false;
		this.#motivos = [
			...this.#validarEsquema(),
			...this.#validarPlan(),
			...this.#validarFormatoSeguro(),
			...this.#validarDuplicados(),
		];
		return this.#motivos.length === 0;
	}

	#validarEsquema() {
		const obligatorios = [this.#idClienteLegado, this.#nombre, this.#dominio, this.#planDeHosting, this.#tarjeta, this.#correo];
		if (obligatorios.some((campo) => !campo)) return ['esquema: faltan campos obligatorios'];
		const dentroDeLímite =
			this.#idClienteLegado.length <= MAXIMO_ID && [this.#nombre, this.#dominio, this.#correo].every((campo) => campo.length <= MAXIMO_NOMBRE);
		if (!dentroDeLímite) return ['esquema: campo demasiado largo'];
		return Object.values(EstadoUsuario).includes(this.#estado) ? [] : ['esquema: estado no reconocido'];
	}

	#validarPlan() {
		if (!this.#planDeHosting) return [];
		const [paquete, sistema, plan, ...sobrantes] = this.#planDeHosting.split('/');
		const coherente =
			sobrantes.length === 0 &&
			Object.values(PaqueteDeHosting).includes(paquete) &&
			SISTEMAS_OPERATIVOS.includes(sistema) &&
			Object.values(PlanDePago).includes(plan);
		return coherente ? [] : ['plan de hosting: combinación no válida'];
	}

	#validarFormatoSeguro() {
		const motivos = [];
		if (this.#correo && !FORMATO_CORREO.test(this.#correo)) motivos.push('formato seguro: correo');
		if (this.#tarjeta && !this.#leerTarjeta()?.tarjeta.validar()) motivos.push('formato seguro: tarjeta');
		return motivos;
	}

	#validarDuplicados() {
		const { documentoOcupado, correoOcupado, dominioOcupado } = this.#cotejo;
		return [
			...(documentoOcupado ? ['duplicado: el id coincide con el documento de otro cliente'] : []),
			...(correoOcupado ? ['duplicado: correo de otro cliente'] : []),
			...(dominioOcupado ? ['duplicado: dominio de otro cliente'] : []),
		];
	}

	/** La franquicia no viene en el archivo: se reconoce por el número. */
	#leerTarjeta() {
		const partes = FORMATO_TARJETA.exec(this.#tarjeta);
		if (!partes) return null;
		const [, numero, mes, año] = partes;
		const fechaExpiración = new Date(Date.UTC(Number(año), Number(mes), 0)).toISOString().slice(0, 10);
		for (const [tipoTarjeta, Tarjeta] of Object.entries(FRANQUICIAS)) {
			const tarjeta = new Tarjeta({ numero, fechaExpiración });
			if (tarjeta.validarPrefijo()) return { tipoTarjeta, tarjeta, últimosDígitos: numero.slice(-4) };
		}
		return null;
	}
}
