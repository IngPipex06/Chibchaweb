export class ErrorDeServicio extends Error {
	constructor(estado, mensaje, campo = null) {
		super(mensaje);
		this.estado = estado;
		this.campo = campo;
	}
}
