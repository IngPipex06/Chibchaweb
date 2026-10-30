export class ErrorDeServicio extends Error {
	constructor(estado, mensaje, campo = null, extras = {}) {
		super(mensaje);
		this.estado = estado;
		this.campo = campo;
		this.extras = extras;
	}
}
