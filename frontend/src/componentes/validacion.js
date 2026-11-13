// Validaciones de formato, iguales a las del backend. Sirven para responder antes;
// el backend siempre decide.

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/
const DOMINIO = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/
export const LIMITE_ARCHIVO = 5 * 1024 * 1024

function edad(texto) {
  const [anio, mes, dia] = texto.split('-').map(Number)
  const hoy = new Date()
  let años = hoy.getFullYear() - anio
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) años -= 1
  return años
}

export function validarValor(campo, valor) {
  if (campo.tipo === 'archivo') {
    if (campo.obligatorio && !valor) return 'Seleccione un archivo.'
    if (valor && valor.tamaño > LIMITE_ARCHIVO) return 'El archivo supera el límite de 5 MB.'
    return ''
  }
  const crudo = valor == null ? '' : String(valor)
  const texto = crudo.trim()
  if (!texto) return campo.obligatorio ? 'Este campo es obligatorio.' : ''

  switch (campo.formato) {
    case 'correo':
      if (!CORREO.test(texto)) return 'Ingrese un correo con formato válido.'
      break
    case 'contraseña':
      if (crudo.length < 8) return 'Use al menos 8 caracteres.'
      if (new TextEncoder().encode(crudo).length > 72) return 'La contraseña supera 72 bytes.'
      break
    case 'fecha':
      if (!FECHA.test(texto)) return 'Use el formato AAAA-MM-DD.'
      break
    case 'periodo':
      if (!PERIODO.test(texto)) return 'Use el formato AAAA-MM.'
      break
    case 'dominio':
      if (!DOMINIO.test(texto.toLowerCase()) || texto.length > 253) return 'Ingrese un dominio válido, por ejemplo misitio.com.'
      break
    case 'mayorDeEdad':
      if (!FECHA.test(texto)) return 'Use el formato AAAA-MM-DD.'
      if (edad(texto) < 18) return 'Debe ser mayor de edad para registrarse.'
      break
    default:
  }
  if (campo.max && texto.length > campo.max) return `Máximo ${campo.max} caracteres.`
  return ''
}

export function validarCampos(campos, valores) {
  const errores = {}
  for (const campo of campos) {
    if (campo.tipo === 'titulo') continue
    const mensaje = validarValor(campo, valores[campo.nombre])
    if (mensaje) errores[campo.nombre] = mensaje
  }
  return errores
}

// Los motivos de `errores` pueden llegar como texto o como objeto.
export const textoDeMotivo = (motivo) =>
  typeof motivo === 'string' ? motivo : (motivo?.motivo ?? motivo?.mensaje ?? motivo?.error ?? JSON.stringify(motivo))
