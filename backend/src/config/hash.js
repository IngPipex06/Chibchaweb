import bcrypt from 'bcrypt';

const COSTO = 12;

export function generarHash(texto) {
	return bcrypt.hash(texto, COSTO);
}

export function compararHash(texto, hash) {
	return bcrypt.compare(texto, hash);
}
