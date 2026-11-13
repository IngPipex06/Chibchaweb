import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { esCaidaDeBase } from '../../config/baseDeDatos.js';
import { entorno } from '../../config/entorno.js';
import * as ConfiguracionCifradoGateway from '../../datos/gateways/ConfiguracionCifradoGateway.js';
import { AlgoritmoDeCifradoAES256 } from '../../dominio/respaldo/AlgoritmoDeCifradoAES256.js';
import { AlgoritmoDeCifradoBlowfish } from '../../dominio/respaldo/AlgoritmoDeCifradoBlowfish.js';
import { AlgoritmoDeCifradoChaCha20 } from '../../dominio/respaldo/AlgoritmoDeCifradoChaCha20.js';
import { AlgoritmoDeCifradoTripleDES } from '../../dominio/respaldo/AlgoritmoDeCifradoTripleDES.js';
import { GestorDeRespaldoCifrado } from '../../dominio/respaldo/GestorDeRespaldoCifrado.js';

const ALGORITMOS = Object.freeze({
	AES256: AlgoritmoDeCifradoAES256,
	ChaCha20: AlgoritmoDeCifradoChaCha20,
	Blowfish: AlgoritmoDeCifradoBlowfish,
	TripleDES: AlgoritmoDeCifradoTripleDES,
});

export const DATOS_PENDIENTES = 'La base de datos no está disponible: los datos quedan pendientes de reconciliación';

// El respaldo actúa con la base caída, cuando la tabla ya no se puede leer: se conserva en memoria.
let algoritmoVigente = 'AES256';

/** Se llama al arrancar y cada minuto (RT4, tiempo de ejecución). Si la base no responde, sigue el valor en memoria. */
export async function cargarAlgoritmoVigente() {
	try {
		algoritmoVigente = (await ConfiguracionCifradoGateway.obtenerAlgoritmoActivo()) ?? algoritmoVigente;
	} catch (error) {
		if (!esCaidaDeBase(error)) throw error;
		console.error(`Base no disponible: el respaldo usará ${algoritmoVigente}`);
	}
}

/** RT4: una línea por respaldo. Lo pendiente es lo que siga en el archivo, no un estado. */
export async function respaldarEnArchivo(datos, origen) {
	const gestor = new GestorDeRespaldoCifrado({ algoritmoActivo: new ALGORITMOS[algoritmoVigente]() });
	const archivo = gestor.respaldar(JSON.stringify(datos), origen);
	const linea = JSON.stringify({
		fecha: archivo.fecha,
		origen: archivo.origen,
		algoritmo: algoritmoVigente,
		contenido: archivo.contenidoCifrado,
	});
	await mkdir(dirname(entorno.rutaRespaldo), { recursive: true });
	await appendFile(entorno.rutaRespaldo, `${linea}\n`, { mode: 0o600 });
}

async function leerLineas() {
	try {
		const texto = await readFile(entorno.rutaRespaldo, 'utf8');
		return texto.split('\n').filter(Boolean);
	} catch (error) {
		if (error.code === 'ENOENT') return [];
		throw error;
	}
}

async function retirarLineas(aplicadas) {
	const quedan = (await leerLineas()).filter((linea) => !aplicadas.has(linea));
	const temporal = `${entorno.rutaRespaldo}.tmp`;
	await writeFile(temporal, quedan.map((linea) => `${linea}\n`).join(''), { mode: 0o600 });
	await rename(temporal, entorno.rutaRespaldo);
}

/**
 * Aplica cada línea con el aplicador de su origen. Lo que falle se conserva en el archivo.
 * @returns {Promise<{ aplicados: number, pendientes: number }>}
 */
export async function reconciliar(aplicadores) {
	const lineas = await leerLineas();
	const aplicadas = new Set();
	for (const linea of lineas) {
		const { origen, algoritmo, contenido, fecha } = JSON.parse(linea);
		try {
			const datos = JSON.parse(new ALGORITMOS[algoritmo]().descifrar(contenido));
			await aplicadores[origen](datos);
			aplicadas.add(linea);
		} catch (error) {
			console.error(`No se pudo reconciliar el respaldo de ${origen} del ${fecha}: ${error.message}`);
			if (esCaidaDeBase(error)) break;
		}
	}
	if (aplicadas.size > 0) await retirarLineas(aplicadas);
	return { aplicados: aplicadas.size, pendientes: lineas.length - aplicadas.size };
}
