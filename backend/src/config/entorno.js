function requerida(nombre) {
	const valor = process.env[nombre];
	if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
	return valor;
}

export const entorno = Object.freeze({
	puerto: Number(process.env.PORT ?? 3000),
	urlBaseDeDatos: requerida('DATABASE_URL'),
	secretoJwt: requerida('JWT_SECRET'),
	claveRespaldo: requerida('CLAVE_RESPALDO'),
	expiracionJwt: process.env.JWT_EXPIRACION ?? '8h',
	rutaRespaldo: process.env.RUTA_RESPALDO ?? 'respaldos/contingencia.jsonl',
});
