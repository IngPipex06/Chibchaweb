import { AlgoritmoDeCifradoAES256 } from './AlgoritmoDeCifradoAES256.js';
import { ArchivoDeRespaldoCifrado } from './ArchivoDeRespaldoCifrado.js';

export class GestorDeRespaldoCifrado {
	#algoritmoActivo;
	#archivosDeRespaldo;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;

	constructor(datos = {}) {
		this.#algoritmoActivo = datos.algoritmoActivo ?? null;
		this.#archivosDeRespaldo = datos.archivosDeRespaldo ?? [];
		this.#id = datos.id ?? null;
	}

	/**
	 * @param {string} datos
	 * @param {string} origen
	 * @returns {ArchivoDeRespaldoCifrado}
	 */
	respaldar(datos, origen) {
		const archivo = new ArchivoDeRespaldoCifrado({
			contenidoCifrado: this.#seleccionarAlgoritmo().cifrar(datos),
			fecha: new Date().toISOString(),
			origen,
		});
		this.#archivosDeRespaldo.push(archivo);
		return archivo;
	}

	#seleccionarAlgoritmo() {
		this.#algoritmoActivo ??= new AlgoritmoDeCifradoAES256();
		return this.#algoritmoActivo;
	}
}
