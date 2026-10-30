import { enTransaccion, esCaidaDeBase } from '../../config/baseDeDatos.js';
import { generarHash } from '../../config/hash.js';
import * as AdministradorGateway from '../../datos/gateways/AdministradorGateway.js';
import * as ClienteGateway from '../../datos/gateways/ClienteGateway.js';
import * as DistribuidorGateway from '../../datos/gateways/DistribuidorGateway.js';
import * as EmpleadoGateway from '../../datos/gateways/EmpleadoGateway.js';
import * as MedioDePagoGateway from '../../datos/gateways/MedioDePagoGateway.js';
import * as RolGateway from '../../datos/gateways/RolGateway.js';
import * as TecnicoDeSoporteGateway from '../../datos/gateways/TecnicoDeSoporteGateway.js';
import * as UsuarioGateway from '../../datos/gateways/UsuarioGateway.js';
import { OrigenRespaldo } from '../../dominio/respaldo/OrigenRespaldo.js';
import { Dirección } from '../../dominio/perfiles/Direccion.js';
import { PaqueteDeHosting } from '../../dominio/perfiles/PaqueteDeHosting.js';
import { PlanDePago } from '../../dominio/perfiles/PlanDePago.js';
import { NivelDeServicio } from '../../dominio/soporte/NivelDeServicio.js';
import { CategoríaDistribuidor } from '../../dominio/usuarios/CategoriaDistribuidor.js';
import { COMISIÓN_POR_CATEGORÍA } from '../../dominio/usuarios/Distribuidor.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import { cargarUsuario, traducirDuplicado } from '../usuarios/ServicioDeUsuarios.js';
import {
	exigirContraseñaNueva,
	exigirCorreo,
	exigirOpcion,
	exigirTexto,
	fechaOpcional,
	textoOpcional,
} from '../usuarios/validacion.js';
import { respaldarEnArchivo } from '../respaldo/ServicioDeContingencia.js';
import { validarTarjeta } from './ServicioDeMediosDePago.js';

/** UC5: filtro por rol de la fachada. */
const GESTIONES = Object.freeze({
	GestionarPerfilDeClientes: 'clientes',
	GestionarPerfilDePersonalInterno: 'personal',
	GestionarPerfilDeDistribuidores: 'distribuidores',
});

const DATOS_PENDIENTES = 'La base de datos no está disponible: los datos quedan pendientes de reconciliación';

export function listarGestiones(permisos) {
	return permisos.filter((permiso) => Object.hasOwn(GESTIONES, permiso)).map((permiso) => GESTIONES[permiso]);
}

function exigirFicha(ficha) {
	if (!ficha) throw new ErrorDeServicio(404, 'El perfil no existe');
	return ficha;
}

async function crearCuenta(correo, contraseña, conexion) {
	return UsuarioGateway.insertar({ correo, contraseña }, conexion);
}

/** RT4: crear y editar de los tres perfiles. Lo que se respalda es lo que recibirá `guardar` al reconciliar. */
async function persistir({ guardar, datos, origen, campos, obtener }) {
	let id;
	try {
		id = await guardar(datos);
	} catch (error) {
		if (!esCaidaDeBase(error)) throw traducirDuplicado(error, campos);
		await respaldarEnArchivo(datos, origen);
		return { pendienteDeReconciliacion: true, mensaje: DATOS_PENDIENTES };
	}
	return obtener(id);
}

async function cambiarEstado(id, operacion) {
	const usuario = await cargarUsuario(await UsuarioGateway.buscarPorId(id));
	operacion(usuario);
	await UsuarioGateway.actualizarEstado(id, usuario.estado);
}

function validarDirección(datos = {}) {
	const dirección = new Dirección(datos ?? {});
	if (!dirección.validarFormato()) {
		throw new ErrorDeServicio(400, 'La dirección no tiene un formato válido', 'dirección', {
			errores: dirección.erroresDeFormato,
		});
	}
	return {
		direccionCalle: datos.calle.trim(),
		direccionCiudad: datos.ciudad.trim(),
		direccionDepartamentoOPais: datos.departamentoOPaís.trim(),
		direccionCodigoPostal: datos.códigoPostal.trim(),
	};
}

function validarDatosDeCliente(datos) {
	return {
		correo: exigirCorreo(datos.correo),
		nombreCompleto: exigirTexto(datos.nombreCompleto, 'nombreCompleto'),
		tipoDocumento: exigirTexto(datos.tipoDocumento, 'tipoDocumento', 50),
		numeroDocumento: exigirTexto(datos.numeroDocumento, 'numeroDocumento', 50),
		teléfono: textoOpcional(datos.teléfono, 'teléfono', 30),
		fechaNacimiento: fechaOpcional(datos.fechaNacimiento, 'fechaNacimiento'),
		paqueteHosting: exigirOpcion(datos.paqueteHosting, PaqueteDeHosting, 'paqueteHosting'),
		planDePago: exigirOpcion(datos.planDePago, PlanDePago, 'planDePago'),
	};
}

/** UC6 paso 5. Si la base no responde sigue el flujo: la restricción UNIQUE decide al reconciliar. */
async function exigirDocumentoLibre(numeroDocumento) {
	let fila;
	try {
		fila = await ClienteGateway.buscarPorNumeroDocumento(numeroDocumento);
	} catch (error) {
		if (esCaidaDeBase(error)) return;
		throw error;
	}
	if (fila) throw new ErrorDeServicio(409, 'El valor ya está registrado', 'numeroDocumento');
}

function guardarAltaDeCliente({ fila, contraseñaHash, tarjeta }) {
	return enTransaccion(async (conexion) => {
		const id = await crearCuenta(fila.correo, contraseñaHash, conexion);
		await ClienteGateway.insertar({ ...fila, id }, conexion);
		await MedioDePagoGateway.insertar({ ...tarjeta, titularId: id }, conexion);
		return id;
	});
}

async function guardarEdicionDeCliente({ id, fila, tarjeta }) {
	exigirFicha(await ClienteGateway.obtenerFicha(id));
	await enTransaccion(async (conexion) => {
		await UsuarioGateway.actualizarCorreo(id, fila.correo, conexion);
		await ClienteGateway.actualizar({ ...fila, id }, conexion);
		await MedioDePagoGateway.insertarSiNoExiste({ ...tarjeta, titularId: id }, conexion);
	});
	return id;
}

export const clientes = {
	listar: (busqueda) => ClienteGateway.listar(busqueda),

	async obtener(id) {
		const ficha = exigirFicha(await ClienteGateway.obtenerFicha(id));
		return { ...ficha, mediosDePago: await MedioDePagoGateway.listarPorTitular(id) };
	},

	async crear(datos) {
		const básicos = validarDatosDeCliente(datos);
		const contraseña = exigirContraseñaNueva(datos.contraseña);
		await exigirDocumentoLibre(básicos.numeroDocumento);
		const fila = { ...básicos, ...validarDirección(datos.dirección) };
		const tarjeta = validarTarjeta(datos.tarjeta ?? null);
		const contraseñaHash = await generarHash(contraseña);
		return persistir({
			guardar: guardarAltaDeCliente,
			datos: { fila, contraseñaHash, tarjeta },
			origen: OrigenRespaldo.PerfilCliente,
			campos: ['correo', 'numeroDocumento'],
			obtener: (nuevoId) => this.obtener(nuevoId),
		});
	},

	/** UC6 paso 8: el número no se guarda, así que editar exige reingresar la tarjeta. */
	async editar(id, datos) {
		const básicos = validarDatosDeCliente(datos);
		const fila = { ...básicos, ...validarDirección(datos.dirección) };
		const tarjeta = validarTarjeta(datos.tarjeta ?? null);
		return persistir({
			guardar: guardarEdicionDeCliente,
			datos: { id, fila, tarjeta },
			origen: OrigenRespaldo.PerfilCliente,
			campos: ['correo', 'numeroDocumento'],
			obtener: (editadoId) => this.obtener(editadoId),
		});
	},

	async inhabilitar(id) {
		exigirFicha(await ClienteGateway.obtenerFicha(id));
		await cambiarEstado(id, (usuario) => usuario.inhabilitar());
	},

	async reactivar(id) {
		exigirFicha(await ClienteGateway.obtenerFicha(id));
		await cambiarEstado(id, (usuario) => usuario.activar());
	},
};

function validarDatosDeDistribuidor(datos) {
	return {
		correo: exigirCorreo(datos.correo),
		razónSocial: exigirTexto(datos.razónSocial, 'razónSocial'),
		nit: exigirTexto(datos.nit, 'nit', 50),
		datosDeContacto: textoOpcional(datos.datosDeContacto, 'datosDeContacto', 255),
	};
}

function guardarAltaDeDistribuidor({ fila, contraseñaHash, categoría }) {
	return enTransaccion(async (conexion) => {
		const id = await crearCuenta(fila.correo, contraseñaHash, conexion);
		await DistribuidorGateway.insertar(
			{ ...fila, id, categoría, comisiónAplicable: COMISIÓN_POR_CATEGORÍA[categoría] },
			conexion,
		);
		return id;
	});
}

async function guardarEdicionDeDistribuidor({ id, fila }) {
	exigirFicha(await DistribuidorGateway.obtenerFicha(id));
	await enTransaccion(async (conexion) => {
		await UsuarioGateway.actualizarCorreo(id, fila.correo, conexion);
		await DistribuidorGateway.actualizar({ ...fila, id }, conexion);
	});
	return id;
}

export const distribuidores = {
	listar: (busqueda) => DistribuidorGateway.listar(busqueda),

	async obtener(id) {
		return exigirFicha(await DistribuidorGateway.obtenerFicha(id));
	},

	async crear(datos) {
		const fila = validarDatosDeDistribuidor(datos);
		const contraseña = exigirContraseñaNueva(datos.contraseña);
		const categoría = exigirOpcion(
			datos.categoría ?? CategoríaDistribuidor.Básico,
			CategoríaDistribuidor,
			'categoría',
		);
		const contraseñaHash = await generarHash(contraseña);
		return persistir({
			guardar: guardarAltaDeDistribuidor,
			datos: { fila, contraseñaHash, categoría },
			origen: OrigenRespaldo.PerfilDistribuidor,
			campos: ['correo', 'nit'],
			obtener: (nuevoId) => this.obtener(nuevoId),
		});
	},

	/** La categoría y la comisión no se editan aquí: las recalcula UC13. */
	async editar(id, datos) {
		return persistir({
			guardar: guardarEdicionDeDistribuidor,
			datos: { id, fila: validarDatosDeDistribuidor(datos) },
			origen: OrigenRespaldo.PerfilDistribuidor,
			campos: ['correo', 'nit'],
			obtener: (editadoId) => this.obtener(editadoId),
		});
	},

	async inhabilitar(id) {
		await this.obtener(id);
		await cambiarEstado(id, (usuario) => usuario.inhabilitar());
	},
};

function validarDatosDeEmpleado(datos) {
	return {
		correo: exigirCorreo(datos.correo),
		nombreCompleto: exigirTexto(datos.nombreCompleto, 'nombreCompleto'),
		documento: exigirTexto(datos.documento, 'documento', 50),
		cargo: textoOpcional(datos.cargo, 'cargo', 100),
		teléfono: textoOpcional(datos.teléfono, 'teléfono', 30),
	};
}

async function exigirRol(nombre) {
	const rol = await RolGateway.buscarPorNombre(nombre ?? '');
	if (!rol) throw new ErrorDeServicio(400, 'El rol no existe', 'rol');
	return rol;
}

function exigirNivel(valor) {
	if (!Object.values(NivelDeServicio).some((nivel) => nivel.valor === valor)) {
		throw new ErrorDeServicio(400, 'El valor no es una opción válida', 'nivelDeServicio');
	}
	return valor;
}

/** El rol se resuelve aquí porque con la base caída no se puede consultar antes de respaldar. */
async function guardarAltaDePersonal({ fila, contraseñaHash, rol: nombreDeRol, nivelDeServicio }) {
	const rol = nivelDeServicio ? null : await exigirRol(nombreDeRol);
	return enTransaccion(async (conexion) => {
		const id = await crearCuenta(fila.correo, contraseñaHash, conexion);
		await EmpleadoGateway.insertar({ ...fila, id }, conexion);
		if (rol) await AdministradorGateway.insertar({ id, rolId: rol.id }, conexion);
		else await TecnicoDeSoporteGateway.insertar({ id, nivelDeServicio }, conexion);
		return id;
	});
}

async function guardarEdicionDePersonal({ id, fila, rol: nombreDeRol, nivelDeServicio, solicitanteId }) {
	const actual = exigirFicha(await EmpleadoGateway.obtenerFicha(id));
	const rol = actual.rolId ? await exigirRol(nombreDeRol) : null;
	if (id === solicitanteId && rol?.id !== actual.rolId) {
		throw new ErrorDeServicio(403, 'No puede cambiar su propio rol', 'rol');
	}
	const nivel = actual.rolId ? null : exigirNivel(nivelDeServicio);
	await enTransaccion(async (conexion) => {
		await UsuarioGateway.actualizarCorreo(id, fila.correo, conexion);
		await EmpleadoGateway.actualizar({ ...fila, id }, conexion);
		if (rol) await AdministradorGateway.actualizarRol(id, rol.id, conexion);
		else await TecnicoDeSoporteGateway.actualizarNivel(id, nivel, conexion);
	});
	return id;
}

export const personal = {
	listar: (busqueda) => EmpleadoGateway.listar(busqueda),

	async obtener(id) {
		return exigirFicha(await EmpleadoGateway.obtenerFicha(id));
	},

	/** UC9: de aquí salen las cuentas de Administrador y de Técnico de Soporte. */
	async crear(datos) {
		const fila = validarDatosDeEmpleado(datos);
		const contraseña = exigirContraseñaNueva(datos.contraseña);
		const esTecnico = datos.tipo === 'TécnicoDeSoporte';
		if (!esTecnico && datos.tipo !== 'Administrador') {
			throw new ErrorDeServicio(400, 'El valor no es una opción válida', 'tipo');
		}
		const nivelDeServicio = esTecnico ? exigirNivel(datos.nivelDeServicio) : null;
		const contraseñaHash = await generarHash(contraseña);
		return persistir({
			guardar: guardarAltaDePersonal,
			datos: { fila, contraseñaHash, rol: esTecnico ? null : datos.rol, nivelDeServicio },
			origen: OrigenRespaldo.PerfilPersonal,
			campos: ['correo', 'documento'],
			obtener: (nuevoId) => this.obtener(nuevoId),
		});
	},

	async editar(id, datos, solicitanteId) {
		const { rol, nivelDeServicio } = datos;
		return persistir({
			guardar: guardarEdicionDePersonal,
			datos: { id, fila: validarDatosDeEmpleado(datos), rol, nivelDeServicio, solicitanteId },
			origen: OrigenRespaldo.PerfilPersonal,
			campos: ['correo', 'documento'],
			obtener: (editadoId) => this.obtener(editadoId),
		});
	},

	/** Sin esta regla, el último Administrador de Personal podría dejar el sistema sin altas de personal. */
	async inhabilitar(id, solicitanteId) {
		await this.obtener(id);
		if (id === solicitanteId) throw new ErrorDeServicio(409, 'No puede inhabilitar su propia cuenta');
		await cambiarEstado(id, (usuario) => usuario.inhabilitar());
	},
};

/** RT4: las altas no traen id porque aún no existen. */
export const aplicadoresDeRespaldo = Object.freeze({
	[OrigenRespaldo.PerfilCliente]: (datos) => (datos.id ? guardarEdicionDeCliente(datos) : guardarAltaDeCliente(datos)),
	[OrigenRespaldo.PerfilDistribuidor]: (datos) =>
		datos.id ? guardarEdicionDeDistribuidor(datos) : guardarAltaDeDistribuidor(datos),
	[OrigenRespaldo.PerfilPersonal]: (datos) => (datos.id ? guardarEdicionDePersonal(datos) : guardarAltaDePersonal(datos)),
});
