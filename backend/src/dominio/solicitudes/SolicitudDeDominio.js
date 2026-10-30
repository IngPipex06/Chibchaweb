import { EstadoSolicitudDominio } from './EstadoSolicitudDominio.js';

export class SolicitudDeDominio {
	#archivoXML;
	#cliente;
	#dominio;
	#estado;
	#fechaSolicitud;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#nombreDominioSolicitado;

	constructor(datos = {}) {
		this.#archivoXML = datos.archivoXML ?? null;
		this.#cliente = datos.cliente ?? null;
		this.#dominio = datos.dominio ?? null;
		this.#estado = datos.estado ?? EstadoSolicitudDominio.Generada;
		this.#fechaSolicitud = datos.fechaSolicitud ?? null;
		this.#id = datos.id ?? null;
		this.#nombreDominioSolicitado = datos.nombreDominioSolicitado ?? null;
	}

	/**
	 * @returns {ArchivoXML}
	 */
	generarXML() {
	}

	simularEnvío() {
	}
}
