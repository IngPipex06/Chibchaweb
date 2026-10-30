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

	activar() {
	}

	inhabilitar() {
	}

	/**
	 * @param {string} contraseña
	 * @returns {boolean}
	 */
	iniciarSesión(contraseña) {
	}

	/**
	 * @param {string} nueva
	 */
	restablecerContraseña(nueva) {
	}
}
