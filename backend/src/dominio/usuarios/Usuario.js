import { compararHash, generarHash } from '../../config/hash.js';
import { EstadoUsuario } from './EstadoUsuario.js';

export class Usuario {
	#contraseña;
	#correo;
	#estado;
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#preguntaDeSeguridad;

	constructor(datos = {}) {
		if (new.target === Usuario) throw new Error('Usuario es abstracta');
		this.#contraseña = datos.contraseña ?? null;
		this.#correo = datos.correo ?? null;
		this.#estado = datos.estado ?? EstadoUsuario.Activo;
		this.#id = datos.id ?? null;
		this.#preguntaDeSeguridad = datos.preguntaDeSeguridad ?? null;
	}

	get contraseña() {
		return this.#contraseña;
	}

	get correo() {
		return this.#correo;
	}

	get estado() {
		return this.#estado;
	}

	get id() {
		return this.#id;
	}

	get preguntaDeSeguridad() {
		return this.#preguntaDeSeguridad;
	}

	activar() {
	}

	inhabilitar() {
	}

	/**
	 * @param {string} contraseña
	 * @returns {Promise<boolean>}
	 */
	iniciarSesión(contraseña) {
		return compararHash(contraseña, this.#contraseña);
	}

	/**
	 * @param {string} nueva
	 */
	async restablecerContraseña(nueva) {
		this.#contraseña = await generarHash(nueva);
	}
}
