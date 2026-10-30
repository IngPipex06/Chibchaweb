import { enTransaccion } from '../../config/baseDeDatos.js';
import { generarHash } from '../../config/hash.js';
import * as AdministradorGateway from '../../datos/gateways/AdministradorGateway.js';
import * as ClienteGateway from '../../datos/gateways/ClienteGateway.js';
import * as DistribuidorGateway from '../../datos/gateways/DistribuidorGateway.js';
import * as EmpleadoGateway from '../../datos/gateways/EmpleadoGateway.js';
import * as PermisoGateway from '../../datos/gateways/PermisoGateway.js';
import * as RolGateway from '../../datos/gateways/RolGateway.js';
import * as TecnicoDeSoporteGateway from '../../datos/gateways/TecnicoDeSoporteGateway.js';
import * as UsuarioGateway from '../../datos/gateways/UsuarioGateway.js';
import { Dirección } from '../../dominio/perfiles/Direccion.js';
import { PaqueteDeHosting } from '../../dominio/perfiles/PaqueteDeHosting.js';
import { PlanDePago } from '../../dominio/perfiles/PlanDePago.js';
import { Administrador } from '../../dominio/usuarios/Administrador.js';
import { Cliente } from '../../dominio/usuarios/Cliente.js';
import { Distribuidor } from '../../dominio/usuarios/Distribuidor.js';
import { Permiso } from '../../dominio/usuarios/Permiso.js';
import { PreguntaDeSeguridad } from '../../dominio/usuarios/PreguntaDeSeguridad.js';
import { Rol } from '../../dominio/usuarios/Rol.js';
import { TécnicoDeSoporte } from '../../dominio/usuarios/TecnicoDeSoporte.js';
import { ErrorDeServicio } from '../ErrorDeServicio.js';
import {
	exigirContraseñaNueva,
	exigirCorreo,
	exigirOpcion,
	exigirTexto,
	exigirValorHasheable,
	fechaOpcional,
	textoOpcional,
} from './validacion.js';

const VIOLACION_UNIQUE = '23505';

async function cargarRol(rolId) {
	const rol = await RolGateway.buscarPorId(rolId);
	const permisos = await PermisoGateway.listarPorRol(rolId);
	return new Rol({
		...rol,
		permisos: permisos.map((permiso) => new Permiso({ ...permiso, descripción: permiso.descripcion })),
	});
}

/**
 * Arma la subclase concreta de Usuario a partir de su fila. La herencia está
 * repartida en tablas (Class Table Inheritance): la clase sale de la tabla que
 * tenga una fila con ese id.
 */
function cargarDirección(fila) {
	if (!fila.direccionCalle) return null;
	return new Dirección({
		calle: fila.direccionCalle,
		ciudad: fila.direccionCiudad,
		departamentoOPaís: fila.direccionDepartamentoOPais,
		códigoPostal: fila.direccionCodigoPostal,
	});
}

export async function cargarUsuario(fila) {
	const base = {
		id: fila.id,
		correo: fila.correo,
		contraseña: fila.contraseña,
		estado: fila.estado,
		preguntaDeSeguridad: fila.preguntaSeguridad
			? new PreguntaDeSeguridad({ pregunta: fila.preguntaSeguridad, respuesta: fila.respuestaSeguridad })
			: null,
	};

	const cliente = await ClienteGateway.buscarPorId(fila.id);
	if (cliente) return new Cliente({ ...cliente, ...base, dirección: cargarDirección(cliente) });

	const distribuidor = await DistribuidorGateway.buscarPorId(fila.id);
	if (distribuidor) return new Distribuidor({ ...distribuidor, ...base });

	const empleado = await EmpleadoGateway.buscarPorId(fila.id);
	if (empleado) {
		const administrador = await AdministradorGateway.buscarPorId(fila.id);
		if (administrador) {
			return new Administrador({ ...empleado, ...base, rol: await cargarRol(administrador.rolId) });
		}
		const tecnico = await TecnicoDeSoporteGateway.buscarPorId(fila.id);
		if (tecnico) return new TécnicoDeSoporte({ ...empleado, ...tecnico, ...base });
	}

	throw new Error(`El usuario ${fila.id} no tiene una subclase concreta`);
}

export function describirPerfil(usuario) {
	const perfil = {
		id: usuario.id,
		correo: usuario.correo,
		tipo: usuario.constructor.name,
	};
	if (usuario instanceof Distribuidor) {
		return { ...perfil, nombre: usuario.razónSocial };
	}
	perfil.nombre = usuario.nombreCompleto;
	if (usuario instanceof Administrador) {
		perfil.rol = usuario.rol.nombre;
		perfil.permisos = usuario.rol.permisos.map((permiso) => permiso.nombre);
	}
	if (usuario instanceof TécnicoDeSoporte) {
		perfil.nivelDeServicio = usuario.nivelDeServicio;
	}
	return perfil;
}

export function traducirDuplicado(error, campos) {
	if (error.code !== VIOLACION_UNIQUE) return error;
	const campo = campos.find((nombre) => error.constraint?.includes(nombre));
	return new ErrorDeServicio(409, 'El valor ya está registrado', campo);
}

/** UC1: es el único autorregistro del sistema y siempre crea un Cliente. */
export async function registrarCliente(datos) {
	const correo = exigirCorreo(datos.correo);
	const contraseña = exigirContraseñaNueva(datos.contraseña);
	const pregunta = exigirTexto(datos.preguntaSeguridad, 'preguntaSeguridad');
	const respuesta = exigirValorHasheable(datos.respuestaSeguridad, 'respuestaSeguridad');
	const fila = {
		nombreCompleto: exigirTexto(datos.nombreCompleto, 'nombreCompleto'),
		tipoDocumento: exigirTexto(datos.tipoDocumento, 'tipoDocumento', 50),
		numeroDocumento: exigirTexto(datos.numeroDocumento, 'numeroDocumento', 50),
		teléfono: textoOpcional(datos.teléfono, 'teléfono', 30),
		fechaNacimiento: fechaOpcional(datos.fechaNacimiento, 'fechaNacimiento'),
		paqueteHosting: exigirOpcion(datos.paqueteHosting, PaqueteDeHosting, 'paqueteHosting'),
		planDePago: exigirOpcion(datos.planDePago, PlanDePago, 'planDePago'),
	};

	const contraseñaHash = await generarHash(contraseña);
	const respuestaHash = await generarHash(respuesta);
	try {
		const id = await enTransaccion(async (conexion) => {
			const nuevoId = await UsuarioGateway.insertar(
				{ correo, contraseña: contraseñaHash, preguntaSeguridad: pregunta, respuestaSeguridad: respuestaHash },
				conexion,
			);
			await ClienteGateway.insertar({ ...fila, id: nuevoId }, conexion);
			return nuevoId;
		});
		return describirPerfil(await cargarUsuario(await UsuarioGateway.buscarPorId(id)));
	} catch (error) {
		throw traducirDuplicado(error, ['correo', 'numeroDocumento']);
	}
}

/** El primer administrador no puede salir de UC9, que ya exige un administrador. */
export async function crearAdministrador(datos) {
	const correo = exigirCorreo(datos.correo);
	const contraseña = exigirContraseñaNueva(datos.contraseña);
	const nombreCompleto = exigirTexto(datos.nombreCompleto, 'nombreCompleto');
	const documento = exigirTexto(datos.documento, 'documento', 50);
	const rol = await RolGateway.buscarPorNombre(datos.rol);
	if (!rol) throw new ErrorDeServicio(400, 'El rol no existe', 'rol');

	const contraseñaHash = await generarHash(contraseña);
	try {
		return await enTransaccion(async (conexion) => {
			const id = await UsuarioGateway.insertar({ correo, contraseña: contraseñaHash }, conexion);
			await EmpleadoGateway.insertar({ id, nombreCompleto, documento }, conexion);
			await AdministradorGateway.insertar({ id, rolId: rol.id }, conexion);
			return id;
		});
	} catch (error) {
		throw traducirDuplicado(error, ['correo', 'documento']);
	}
}
