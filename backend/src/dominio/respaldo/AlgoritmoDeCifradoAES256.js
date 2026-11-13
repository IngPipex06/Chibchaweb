import { cifrarTexto, descifrarTexto } from '../../config/cifrado.js';
import { AlgoritmoDeCifrado } from './AlgoritmoDeCifrado.js';

const ESPECIFICACION = { nombre: 'aes-256-gcm', longitudClave: 32, longitudIv: 12, autenticado: true };

export class AlgoritmoDeCifradoAES256 extends AlgoritmoDeCifrado {
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
