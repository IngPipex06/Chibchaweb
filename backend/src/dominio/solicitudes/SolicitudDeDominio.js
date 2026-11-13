import { ArchivoXML } from './ArchivoXML.js';
import { EstadoSolicitudDominio } from './EstadoSolicitudDominio.js';
import { RegistradorSimulado } from './RegistradorSimulado.js';

// Formato propio del equipo (RF5), con la estructura de un comando create de EPP.
const FORMATO_VERSIÓN = '1.0';
const ESPACIO_DE_NOMBRES = `urn:chibchaweb:params:xml:ns:solicitud-${FORMATO_VERSIÓN}`;
const PERIODO_EN_AÑOS = 1;
const SERVIDORES_DE_NOMBRES = Object.freeze(['ns1.chibchaweb.com', 'ns2.chibchaweb.com']);

const ENTIDADES = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' });

function escapar(valor) {
	return String(valor).replace(/[&<>"']/g, (caracter) => ENTIDADES[caracter]);
}

function direcciónXML(dirección) {
	if (!dirección) return '';
	return `
          <direccion>
            <calle>${escapar(dirección.calle)}</calle>
            <ciudad>${escapar(dirección.ciudad)}</ciudad>
            <departamentoOPais>${escapar(dirección.departamentoOPaís)}</departamentoOPais>
            <codigoPostal>${escapar(dirección.códigoPostal)}</codigoPostal>
          </direccion>`;
}

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

	get archivoXML() {
		return this.#archivoXML;
	}

	get estado() {
		return this.#estado;
	}

	/**
	 * @returns {ArchivoXML}
	 */
	generarXML() {
		if (!this.#id || !this.#nombreDominioSolicitado || !this.#fechaSolicitud || !this.#cliente) {
			throw new Error('La solicitud debe estar guardada y completa para generar el XML');
		}
		const cliente = this.#cliente;
		const servidores = SERVIDORES_DE_NOMBRES.map(
			(servidor) => `          <servidor>${servidor}</servidor>`,
		).join('\n');
		const contenido = `<?xml version="1.0" encoding="UTF-8"?>
<chibchaweb xmlns="${ESPACIO_DE_NOMBRES}" version="${FORMATO_VERSIÓN}">
  <comando>
    <crear>
      <dominio>
        <nombre>${escapar(this.#nombreDominioSolicitado)}</nombre>
        <periodo unidad="anios">${PERIODO_EN_AÑOS}</periodo>
        <servidoresDeNombres>
${servidores}
        </servidoresDeNombres>
        <titular>
          <nombre>${escapar(cliente.nombreCompleto)}</nombre>
          <documento tipo="${escapar(cliente.tipoDocumento)}">${escapar(cliente.numeroDocumento)}</documento>
          <correo>${escapar(cliente.correo)}</correo>${direcciónXML(cliente.dirección)}
        </titular>
      </dominio>
    </crear>
    <fechaSolicitud>${escapar(this.#fechaSolicitud)}</fechaSolicitud>
    <idTransaccion>${escapar(this.#id)}</idTransaccion>
  </comando>
</chibchaweb>
`;
		this.#archivoXML = new ArchivoXML({ contenido, formatoVersión: FORMATO_VERSIÓN });
		return this.#archivoXML;
	}

	simularEnvío() {
		if (new RegistradorSimulado().enviar(this.#archivoXML)) {
			this.#estado = EstadoSolicitudDominio.Enviada;
		}
	}
}
