import { cifrarTexto, descifrarTexto } from '../../config/cifrado.js';
import { AlgoritmoDeCifrado } from './AlgoritmoDeCifrado.js';

const ESPECIFICACION = { nombre: 'bf-cbc', longitudClave: 32, longitudIv: 8, autenticado: false };

export class AlgoritmoDeCifradoBlowfish extends AlgoritmoDeCifrado {
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
