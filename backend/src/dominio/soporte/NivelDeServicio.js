export class NivelDeServicio {
	static Nivel1 = new NivelDeServicio('Nivel1');
	static Nivel2 = new NivelDeServicio('Nivel2');
	static Nivel3 = new NivelDeServicio('Nivel3');

	constructor(valor) {
		this.valor = valor;
		Object.freeze(this);
	}

	/**
	 * @returns {NivelDeServicio}
	 */
	siguiente() {
		if (this === NivelDeServicio.Nivel1) return NivelDeServicio.Nivel2;
		return NivelDeServicio.Nivel3;
	}
}

Object.freeze(NivelDeServicio);
