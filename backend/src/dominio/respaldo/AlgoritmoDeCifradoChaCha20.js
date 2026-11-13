import { cifrarTexto, descifrarTexto } from '../../config/cifrado.js';
import { AlgoritmoDeCifrado } from './AlgoritmoDeCifrado.js';

const ESPECIFICACION = { nombre: 'chacha20-poly1305', longitudClave: 32, longitudIv: 12, autenticado: true };

export class AlgoritmoDeCifradoChaCha20 extends AlgoritmoDeCifrado {
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
