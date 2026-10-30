import { cifrarTexto, descifrarTexto } from '../../config/cifrado.js';
import { AlgoritmoDeCifrado } from './AlgoritmoDeCifrado.js';

const ESPECIFICACION = { nombre: 'des-ede3-cbc', longitudClave: 24, longitudIv: 8, autenticado: false };

export class AlgoritmoDeCifradoTripleDES extends AlgoritmoDeCifrado {
	/**
	 * @param {string} datos
	 * @returns {string}
	 */
	cifrar(datos) {
		return cifrarTexto(ESPECIFICACION, datos);
	}

	/**
	 * @param {string} datos
	 * @returns {string}
	 */
	descifrar(datos) {
		return descifrarTexto(ESPECIFICACION, datos);
	}
}
