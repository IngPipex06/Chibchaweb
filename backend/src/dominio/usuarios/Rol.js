export class Rol {
	/**
	 * Clave primaria técnica, sin significado de negocio
	 */
	#id;
	#nombre;
	#permisos;

	constructor(datos = {}) {
		this.#id = datos.id ?? null;
		this.#nombre = datos.nombre ?? null;
		this.#permisos = datos.permisos ?? [];
	}

	get nombre() {
		return this.#nombre;
	}

	get permisos() {
		return this.#permisos;
	}

	/**
	 * @param {Permiso} permiso
	 */
	agregarPermiso(permiso) {
		this.#permisos.push(permiso);
	}

	/**
	 * @param {Permiso} permiso
	 */
	quitarPermiso(permiso) {
		this.#permisos = this.#permisos.filter((elemento) => elemento !== permiso);
	}

	/**
	 * @param {string} nombrePermiso
	 * @returns {boolean}
	 */
	tienePermiso(nombrePermiso) {
		return this.#permisos.some((permiso) => permiso.nombre === nombrePermiso);
	}
}
