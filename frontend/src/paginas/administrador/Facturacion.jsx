import { useState } from 'react'
import { facturacion, pagos, perfiles } from '../../api/servicios.js'
import { useSesion } from '../../api/sesion.js'
import { avisoDeError } from '../../componentes/avisos.js'
import Dialogo from '../../componentes/Dialogo.jsx'
import { cantidad, fecha, monto } from '../../componentes/formato.js'
import Formulario from '../../componentes/Formulario.jsx'
import { useDatos, useEnvio, useFormulario } from '../../componentes/ganchos.js'
import { Aviso, Cargando, ErrorDeCarga, Ficha, Pagina, Resumen, Tarjeta } from '../../componentes/Interfaz.jsx'
import { PERMISOS } from '../../componentes/valores.js'

const sinLista = () => Promise.resolve({ datos: [] })

// UC11 y RF4. El titular se elige de los listados que el rol puede consultar (hueco 3).
export default function Facturacion() {
  const { perfil } = useSesion()
  const permisos = perfil.permisos ?? []
  const puedeClientes = permisos.includes(PERMISOS.clientes)
  const puedeDistribuidores = permisos.includes(PERMISOS.distribuidores)
  const clientes = useDatos(() => (puedeClientes ? perfiles.clientes.listar() : sinLista()), [puedeClientes])
  const distribuidores = useDatos(() => (puedeDistribuidores ? perfiles.distribuidores.listar() : sinLista()), [puedeDistribuidores])
  const formulario = useFormulario()
  const [ocupado, ejecutar] = useEnvio()
  const [aviso, setAviso] = useState(null)
  const [factura, setFactura] = useState(null)
  const [cobros, setCobros] = useState(null)
  const [dialogo, setDialogo] = useState(null)

  const titulares = [
    ...(clientes.datos ?? []).map((x) => ({ valor: String(x.id), id: x.id, etiqueta: `Cliente · ${x.nombreCompleto} (${x.correo})` })),
    ...(distribuidores.datos ?? []).map((x) => ({ valor: String(x.id), id: x.id, etiqueta: `Distribuidor · ${x.razónSocial} (${x.correo})` })),
  ]
  const campos = [
    { nombre: 'titularId', etiqueta: 'Titular', tipo: 'seleccion', obligatorio: true, completo: true, marcador: 'Seleccione un titular', opciones: titulares },
    { nombre: 'período', etiqueta: 'Período', tipo: 'mes', obligatorio: true, formato: 'periodo', marcador: 'AAAA-MM' },
  ]

  const generar = () =>
    ejecutar('factura', async () => {
      if (!formulario.validar(campos)) return
      const titular = titulares.find((t) => t.valor === formulario.valores.titularId)
      try {
        const { datos } = await facturacion.generarFactura(titular?.id ?? formulario.valores.titularId, formulario.valores.período)
        setAviso(null)
        setFactura({ ...datos, titular: titular?.etiqueta })
      } catch (error) {
        formulario.marcarError(error)
        setAviso(avisoDeError(error))
      }
    })

  const ejecutarCobros = () =>
    ejecutar('cobros', async () => {
      try {
        const { datos } = await pagos.ejecutarCobros()
        setAviso(null)
        setCobros(datos ?? {})
      } catch (error) {
        setAviso(avisoDeError(error))
      }
    })

  const errorDeLista = clientes.error ?? distribuidores.error
  const cargandoListas = clientes.datos === undefined || distribuidores.datos === undefined

  let bloqueDeFactura
  if (!puedeClientes && !puedeDistribuidores) {
    bloqueDeFactura = <Aviso tipo="info" titulo="No hay titulares que pueda elegir" texto="Para generar una factura se elige un cliente o un distribuidor, y su rol no tiene permiso para listar ninguno de los dos." />
  } else if (errorDeLista && cargandoListas) {
    bloqueDeFactura = <ErrorDeCarga error={errorDeLista} alReintentar={() => { clientes.recargar(); distribuidores.recargar() }} />
  } else {
    bloqueDeFactura = (
      <Tarjeta mitad titulo="Generar factura" nota={puedeClientes && puedeDistribuidores ? '' : 'Solo aparecen los titulares que su rol puede listar.'}>
        {cargandoListas ? <Cargando /> : (
          <Formulario campos={campos} formulario={formulario} alEnviar={generar} enviando={ocupado.has('factura')} textoEnviar="Generar factura" textoEnviando="Generando…" />
        )}
      </Tarjeta>
    )
  }

  const cargos = factura?.cargos ?? {}

  return (
    <Pagina antetitulo="Administrador" titulo="Facturación y cobros" aviso={aviso} alCerrarAviso={() => setAviso(null)}>
      {bloqueDeFactura}
      <Tarjeta
        mitad
        titulo="Ejecutar cobros"
        nota="Recorre los cobros pendientes con el medio de pago de cada titular y muestra cuántos resultaron exitosos, fallidos o sin medio de pago."
      >
        <div className="acciones">
          <button
            type="button"
            className="boton boton-primario"
            disabled={ocupado.has('cobros')}
            onClick={() => setDialogo({ titulo: 'Ejecutar cobros', texto: 'Se procesarán todos los cobros pendientes.', textoConfirmar: 'Ejecutar', alConfirmar: () => { setDialogo(null); ejecutarCobros() } })}
          >
            {ocupado.has('cobros') ? 'Ejecutando…' : 'Ejecutar cobros'}
          </button>
        </div>
        {cobros && <Resumen items={[['Exitosos', cantidad(cobros.exitosos)], ['Fallidos', cantidad(cobros.fallidos)], ['Sin medio de pago', cantidad(cobros.sinMedioDePago)]]} />}
      </Tarjeta>
      {factura && (
        <>
          {/* Hueco 5: las facturas no se consultan después. */}
          <Aviso tipo="critico" titulo="Este es el único momento en que se ve la factura" texto="Las facturas no se pueden consultar después. Guarde o anote este resultado." />
          <Tarjeta mitad antetitulo="Factura generada" titulo={`Factura ${factura.número ?? factura.numero ?? ''}`}>
            <Ficha pares={[
              ['Monto total', <strong key="m">{monto(factura.monto)}</strong>],
              ['Titular', factura.titular, true],
              ['Período', factura.período],
              ['Estado', factura.estado],
              ['Emisión', fecha(factura.fechaEmisión)],
              ['Vencimiento', fecha(factura.fechaVencimiento)],
            ]} />
          </Tarjeta>
          <Tarjeta mitad titulo="Desglose de cargos">
            <Resumen items={[['Hosting', monto(cargos.hosting)], ['Dominios', monto(cargos.dominios)], ['Servicios', monto(cargos.servicios)]]} />
          </Tarjeta>
        </>
      )}
      {dialogo && <Dialogo {...dialogo} alCancelar={() => setDialogo(null)} />}
    </Pagina>
  )
}
