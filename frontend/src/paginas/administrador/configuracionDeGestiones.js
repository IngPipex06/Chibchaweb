import { perfiles } from '../../api/servicios.js'
import { CAMPOS_DE_TARJETA, campoContraseñaNueva, campoCorreo, cuerpoDeTarjeta } from '../../componentes/camposComunes.js'
import { porcentaje, soloFecha } from '../../componentes/formato.js'
import { CATEGORIAS, NIVELES, PAQUETES, PLANES, ROLES_DE_ADMINISTRADOR, TIPOS_DE_PERSONAL, etiqueta } from '../../componentes/valores.js'

// Configuración de las tres gestiones (UC6 a UC10). Las celdas y pares son datos:
// { texto, secundario, fuerte } o { estado } para mostrar una etiqueta de estado.

const opcional = (objeto, clave, valor) => {
  if (valor != null && String(valor).trim() !== '') objeto[clave] = String(valor).trim()
}
const limpio = (valor) => String(valor ?? '').trim()
const cuenta = (crear) => [{ tipo: 'titulo', etiqueta: 'Cuenta' }, campoCorreo, ...(crear ? [campoContraseñaNueva] : [])]

const clientes = {
  titulo: 'Gestión de clientes',
  singular: 'cliente',
  api: perfiles.clientes,
  reactivable: true,
  marcadorDeBusqueda: 'Nombre, correo o documento',
  columnas: ['Cliente', 'Documento', 'Paquete', 'Plan', 'Estado'],
  nombre: (x) => x.nombreCompleto || x.correo,
  fila: (x) => [
    { texto: x.nombreCompleto, secundario: x.correo, fuerte: true },
    { texto: `${x.tipoDocumento ?? ''} ${x.numeroDocumento ?? ''}`.trim() },
    { texto: x.paqueteHosting },
    { texto: x.planDePago },
    { estado: x.estado },
  ],
  // Los clientes migrados pueden traer dirección, teléfono y fecha vacíos.
  pares: (x) => [
    ['Estado', { estado: x.estado }],
    ['Correo', { texto: x.correo }],
    ['Documento', { texto: `${x.tipoDocumento ?? ''} ${x.numeroDocumento ?? ''}`.trim() }],
    ['Teléfono', { texto: x.teléfono }],
    ['Fecha de nacimiento', { texto: soloFecha(x.fechaNacimiento) }],
    ['Paquete de hosting', { texto: x.paqueteHosting }],
    ['Plan de pago', { texto: x.planDePago }],
    ['Dirección', { texto: [x.direccionCalle, x.direccionCiudad, x.direccionDepartamentoOPais].filter(Boolean).join(', ') + (x.direccionCodigoPostal ? ` · CP ${x.direccionCodigoPostal}` : '') }, true],
    ['Medios de pago activos', { texto: (x.mediosDePago ?? []).map((m) => `${m.tipoTarjeta ?? ''} ${m.numeroEnmascarado ?? ''}`.trim()).join(' · ') || 'Ninguno' }, true],
  ],
  // La ficha trae la dirección plana; el formulario la arma como bloque.
  aFormulario: (x) => ({
    correo: x.correo ?? '',
    nombreCompleto: x.nombreCompleto ?? '',
    tipoDocumento: x.tipoDocumento ?? '',
    numeroDocumento: x.numeroDocumento ?? '',
    teléfono: x.teléfono ?? '',
    fechaNacimiento: soloFecha(x.fechaNacimiento),
    paqueteHosting: x.paqueteHosting ?? '',
    planDePago: x.planDePago ?? '',
    calle: x.direccionCalle ?? '',
    ciudad: x.direccionCiudad ?? '',
    departamentoOPaís: x.direccionDepartamentoOPais ?? '',
    códigoPostal: x.direccionCodigoPostal ?? '',
  }),
  campos: ({ crear }) => [
    ...cuenta(crear),
    { tipo: 'titulo', etiqueta: 'Datos personales' },
    { nombre: 'nombreCompleto', etiqueta: 'Nombre completo', obligatorio: true, max: 255, completo: true },
    { nombre: 'tipoDocumento', etiqueta: 'Tipo de documento', obligatorio: true, max: 50 },
    { nombre: 'numeroDocumento', etiqueta: 'Número de documento', obligatorio: true, max: 50 },
    { nombre: 'teléfono', etiqueta: 'Teléfono', tipo: 'telefono', max: 30 },
    { nombre: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', formato: 'fecha' },
    { tipo: 'titulo', etiqueta: 'Servicio' },
    { nombre: 'paqueteHosting', etiqueta: 'Paquete de hosting', tipo: 'opciones', opciones: PAQUETES, obligatorio: true, completo: true },
    { nombre: 'planDePago', etiqueta: 'Plan de pago', tipo: 'opciones', opciones: PLANES, obligatorio: true, completo: true },
    { tipo: 'titulo', nombre: 'dirección', etiqueta: 'Dirección' },
    { nombre: 'calle', etiqueta: 'Calle', obligatorio: true, max: 255, completo: true },
    { nombre: 'ciudad', etiqueta: 'Ciudad', obligatorio: true, max: 100 },
    { nombre: 'departamentoOPaís', etiqueta: 'Departamento o país', obligatorio: true, max: 100 },
    { nombre: 'códigoPostal', etiqueta: 'Código postal', obligatorio: true, max: 20 },
    { tipo: 'titulo', nombre: 'tarjeta', etiqueta: 'Tarjeta', ayuda: crear ? '' : 'Reingrese la tarjeta: el número completo no se guarda (UC6 paso 8).' },
    ...CAMPOS_DE_TARJETA,
  ],
  cuerpo: (v, { crear }) => {
    const o = {
      correo: limpio(v.correo).toLowerCase(),
      nombreCompleto: limpio(v.nombreCompleto),
      tipoDocumento: limpio(v.tipoDocumento),
      numeroDocumento: limpio(v.numeroDocumento),
      paqueteHosting: v.paqueteHosting,
      planDePago: v.planDePago,
      dirección: { calle: limpio(v.calle), ciudad: limpio(v.ciudad), departamentoOPaís: limpio(v.departamentoOPaís), códigoPostal: limpio(v.códigoPostal) },
      tarjeta: cuerpoDeTarjeta(v),
    }
    opcional(o, 'teléfono', v.teléfono)
    opcional(o, 'fechaNacimiento', soloFecha(v.fechaNacimiento))
    if (crear) o.contraseña = v.contraseña
    return o
  },
}

const personal = {
  titulo: 'Gestión de personal',
  singular: 'perfil de personal',
  api: perfiles.personal,
  marcadorDeBusqueda: 'Nombre, correo o documento',
  columnas: ['Nombre', 'Tipo', 'Rol o nivel', 'Cargo', 'Estado'],
  nombre: (x) => x.nombreCompleto || x.correo,
  tipoDe: (x) => x.tipo || (x.rol ? 'Administrador' : 'TécnicoDeSoporte'),
  fila: (x) => [
    { texto: x.nombreCompleto, secundario: x.correo, fuerte: true },
    { texto: etiqueta(x.tipo) },
    { texto: x.rol || etiqueta(x.nivelDeServicio) },
    { texto: x.cargo },
    { estado: x.estado },
  ],
  pares: (x) => [
    ['Estado', { estado: x.estado }],
    ['Correo', { texto: x.correo }],
    ['Tipo', { texto: etiqueta(x.tipo) }],
    x.rol ? ['Rol', { texto: x.rol }] : ['Nivel de servicio', { texto: etiqueta(x.nivelDeServicio) }],
    ['Documento', { texto: x.documento }],
    ['Cargo', { texto: x.cargo }],
    ['Teléfono', { texto: x.teléfono }],
  ],
  // El backend exige rol o nivelDeServicio en cada edición: se precargan desde la ficha.
  aFormulario: (x) => ({
    correo: x.correo ?? '',
    nombreCompleto: x.nombreCompleto ?? '',
    documento: x.documento ?? '',
    cargo: x.cargo ?? '',
    teléfono: x.teléfono ?? '',
    rol: x.rol ?? '',
    nivelDeServicio: x.nivelDeServicio ?? '',
  }),
  campos: ({ crear, tipoDePersonal, propio }) => [
    ...cuenta(crear),
    ...(crear ? [{ nombre: 'tipo', etiqueta: 'Tipo de personal', tipo: 'opciones', opciones: TIPOS_DE_PERSONAL, obligatorio: true, completo: true }] : []),
    { tipo: 'titulo', etiqueta: 'Datos' },
    { nombre: 'nombreCompleto', etiqueta: 'Nombre completo', obligatorio: true, max: 255, completo: true },
    { nombre: 'documento', etiqueta: 'Documento', obligatorio: true, max: 50 },
    { nombre: 'cargo', etiqueta: 'Cargo', max: 100 },
    { nombre: 'teléfono', etiqueta: 'Teléfono', tipo: 'telefono', max: 30 },
    ...(tipoDePersonal === 'Administrador'
      ? [
          { tipo: 'titulo', etiqueta: 'Rol de administrador', ayuda: propio ? 'Es su propio perfil: el rol se envía sin cambios, porque nadie cambia su propio rol.' : '' },
          { nombre: 'rol', etiqueta: 'Rol', tipo: 'seleccion', opciones: ROLES_DE_ADMINISTRADOR, obligatorio: true, completo: true, desactivado: propio },
        ]
      : []),
    ...(tipoDePersonal === 'TécnicoDeSoporte'
      ? [{ tipo: 'titulo', etiqueta: 'Soporte' }, { nombre: 'nivelDeServicio', etiqueta: 'Nivel de servicio', tipo: 'opciones', opciones: NIVELES, obligatorio: true, completo: true }]
      : []),
  ],
  cuerpo: (v, { crear, tipoDePersonal }) => {
    const o = { correo: limpio(v.correo).toLowerCase(), nombreCompleto: limpio(v.nombreCompleto), documento: limpio(v.documento) }
    opcional(o, 'cargo', v.cargo)
    opcional(o, 'teléfono', v.teléfono)
    if (crear) {
      o.contraseña = v.contraseña
      o.tipo = tipoDePersonal
    }
    if (tipoDePersonal === 'Administrador') o.rol = v.rol
    else o.nivelDeServicio = v.nivelDeServicio
    return o
  },
}

const distribuidores = {
  titulo: 'Gestión de distribuidores',
  singular: 'distribuidor',
  api: perfiles.distribuidores,
  conDominios: true,
  marcadorDeBusqueda: 'Razón social, NIT o correo',
  columnas: ['Razón social', 'NIT', 'Categoría', 'Comisión', 'Estado'],
  nombre: (x) => x.razónSocial || x.correo,
  fila: (x) => [
    { texto: x.razónSocial, secundario: x.correo, fuerte: true },
    { texto: x.nit },
    { estado: x.categoría },
    { texto: porcentaje(x.comisiónAplicable) },
    { estado: x.estado },
  ],
  pares: (x) => [
    ['Estado', { estado: x.estado }],
    ['Correo', { texto: x.correo }],
    ['NIT', { texto: x.nit }],
    ['Categoría', { estado: x.categoría }],
    ['Comisión aplicable', { texto: porcentaje(x.comisiónAplicable) }],
    ['Datos de contacto', { texto: x.datosDeContacto }, true],
  ],
  aFormulario: (x) => ({ correo: x.correo ?? '', razónSocial: x.razónSocial ?? '', nit: x.nit ?? '', datosDeContacto: x.datosDeContacto ?? '' }),
  valoresIniciales: { categoría: 'Básico' },
  // Comisión y categoría las recalcula el cierre mensual: la categoría solo se elige al crear.
  campos: ({ crear }) => [
    ...cuenta(crear),
    { tipo: 'titulo', etiqueta: 'Empresa' },
    { nombre: 'razónSocial', etiqueta: 'Razón social', obligatorio: true, max: 255, completo: true },
    { nombre: 'nit', etiqueta: 'NIT', obligatorio: true, max: 50 },
    { nombre: 'datosDeContacto', etiqueta: 'Datos de contacto', max: 255 },
    ...(crear ? [{ nombre: 'categoría', etiqueta: 'Categoría', tipo: 'opciones', opciones: CATEGORIAS, completo: true, ayuda: 'Por defecto, Básico.' }] : []),
  ],
  cuerpo: (v, { crear }) => {
    const o = { correo: limpio(v.correo).toLowerCase(), razónSocial: limpio(v.razónSocial), nit: limpio(v.nit) }
    opcional(o, 'datosDeContacto', v.datosDeContacto)
    if (crear) {
      o.contraseña = v.contraseña
      opcional(o, 'categoría', v.categoría)
    }
    return o
  },
}

export const GESTIONES = { clientes, personal, distribuidores }
