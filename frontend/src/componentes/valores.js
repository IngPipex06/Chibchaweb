export const PAQUETES = ['Chibcha-Plata', 'Chibcha-Oro', 'Chibcha-Platino']
export const PLANES = ['Mensual', 'Trimestral', 'Semestral', 'Anual']
export const FRANQUICIAS = ['Visa', 'Mastercard', 'Diners']
export const NIVELES = ['Nivel1', 'Nivel2', 'Nivel3']
export const PRIORIDADES = ['Alta', 'Media', 'Baja']
export const CATEGORIAS = ['Básico', 'Premium']
export const TIPOS_DE_PERSONAL = ['Administrador', 'TécnicoDeSoporte']
export const ESTADOS_DEL_TABLERO = ['Abierto', 'EnProgreso', 'Rezagado-SLAVencido']
// Fijos por semilla: la API no tiene listado de roles.
export const ROLES_DE_ADMINISTRADOR = ['Administrador de Clientes', 'Administrador de Personal', 'Administrador de Canales']
export const PLAZO_EN_HORAS = { Alta: 2, Media: 24, Baja: 48 }

export const PERMISOS = {
  clientes: 'GestionarPerfilDeClientes',
  personal: 'GestionarPerfilDePersonalInterno',
  distribuidores: 'GestionarPerfilDeDistribuidores',
  factura: 'GenerarFactura',
  cierre: 'EjecutarCierreMensual',
  migracion: 'MigrarDatosLegados',
}

// Los valores viajan tal cual; solo cambia cómo se muestran.
const ETIQUETAS = {
  Inhabilitado: 'Inactivo',
  EnProgreso: 'En progreso',
  'Rezagado-SLAVencido': 'Rezagado · SLA vencido',
  RevertidoPorErrorEstructural: 'Revertido por error estructural',
  Nivel1: 'Nivel 1',
  Nivel2: 'Nivel 2',
  Nivel3: 'Nivel 3',
  TécnicoDeSoporte: 'Técnico de soporte',
}
export const etiqueta = (valor) => ETIQUETAS[valor] ?? (valor == null || valor === '' ? 'Sin dato' : String(valor))

// Tono de apoyo para cada estado. El amarillo queda para lo crítico.
export const TONOS = {
  Activo: 'azul',
  Exitoso: 'azul',
  Enviada: 'azul',
  Resuelto: 'azul',
  Completado: 'azul',
  Fallido: 'rosa',
  Alta: 'rosa',
  RevertidoPorErrorEstructural: 'rosa',
  Media: 'vino',
  EnProgreso: 'vino',
  Premium: 'vino',
  'Rezagado-SLAVencido': 'amarillo',
}
