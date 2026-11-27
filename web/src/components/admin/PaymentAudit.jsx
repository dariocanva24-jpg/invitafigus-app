import { useEffect, useMemo, useState } from 'react'
import { CreditCard, RefreshCw, AlertCircle, Check, Wand2 } from 'lucide-react'

// Auditoría de pagos + ventas por origen (UTM).
// Solo lee; no modifica nada. Requiere sesión de admin.

const money = (value) => `$${Number(value || 0).toLocaleString('es-AR')}`

export default function PaymentAudit() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [reconciling, setReconciling] = useState(false)
  const [reconcileResult, setReconcileResult] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin-audit')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar')
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Reconciliar: busca en MP los pagos aprobados que no activaron el pedido.
  const reconcile = async () => {
    if (!window.confirm('Se van a consultar en Mercado Pago los pedidos pendientes y se activarán los que ya están pagados. ¿Seguir?')) return
    setReconciling(true)
    setReconcileResult(null)
    try {
      const res = await fetch('/api/admin-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconcile' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'No se pudo reconciliar')
      setReconcileResult(json)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setReconciling(false)
    }
  }

  const orders = data?.orders || []
  const logs = data?.logs || []
  const sources = data?.sources || []

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return orders
    return orders.filter((order) =>
      [order.slug, order.nombre, order.utm_source, order.utm_campaign, order.payment_id]
        .join(' ').toLowerCase().includes(needle))
  }, [orders, filter])

  const activas = orders.filter((o) => o.estado === 'ACTIVA').length
  const facturado = orders.filter((o) => o.estado === 'ACTIVA')
    .reduce((sum, o) => sum + (Number(o.monto) || 0), 0)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-black font-bebas tracking-wider text-white">
            <CreditCard size={20} className="text-[#FFD700]" /> Pagos y origen
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={reconcile}
              disabled={reconciling}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FFD700] px-3 py-1.5 text-xs font-bold text-[#0a0e27] hover:opacity-90 disabled:opacity-50"
              title="Consulta Mercado Pago y activa los pagos aprobados que quedaron sin procesar"
            >
              <Wand2 size={13} className={reconciling ? 'animate-spin' : ''} />
              {reconciling ? 'Reconciliando…' : 'Reconciliar pagos pendientes'}
            </button>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={14} /> {error}
          </p>
        )}

        {reconcileResult && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
            <p className="text-white/70">
              Revisados <span className="font-bold text-white">{reconcileResult.revisados}</span> ·
              Activados <span className="font-bold text-green-400">{reconcileResult.activados?.length || 0}</span>
            </p>
            {reconcileResult.activados?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {reconcileResult.activados.map((item) => (
                  <li key={item.slug} className="text-green-400">
                    ✅ {item.slug} · pago {item.payment_id} · ${(item.monto || 0).toLocaleString('es-AR')}
                  </li>
                ))}
              </ul>
            )}
            {reconcileResult.detalles?.length > 0 && (
              <ul className="mt-2 space-y-1 text-white/40">
                {reconcileResult.detalles.map((item, index) => (
                  <li key={index}>{item.slug}: {item.resultado}{item.detalle ? ` (${item.detalle})` : ''}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Pedidos con pago', value: orders.length },
            { label: 'Activas', value: activas },
            { label: 'Facturado', value: money(facturado) },
            { label: 'Orígenes', value: sources.length },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/40">{item.label}</p>
              <p className="text-lg font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ventas por origen */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm font-bold text-white/80">Ventas por origen (utm_source)</p>
        {sources.length === 0 ? (
          <p className="mt-3 text-xs text-white/30">Todavía no hay pedidos con origen registrado.</p>
        ) : (
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-white/40">
              <tr>
                <th className="pb-2 font-normal">Origen</th>
                <th className="pb-2 font-normal text-right">Pedidos</th>
                <th className="pb-2 font-normal text-right">Activas</th>
                <th className="pb-2 font-normal text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              {sources.map((source) => (
                <tr key={source.source} className="border-t border-white/5">
                  <td className="py-2 font-medium text-white/80">{source.source}</td>
                  <td className="py-2 text-right">{source.ventas}</td>
                  <td className="py-2 text-right text-green-400">{source.activas}</td>
                  <td className="py-2 text-right">{money(source.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pedidos */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-white/80">Pedidos con pago</p>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por nombre, slug, origen o pago…"
            className="w-full max-w-xs rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-[#FFD700]/60"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="mt-3 text-xs text-white/30">Sin resultados.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-white/40">
                <tr>
                  <th className="pb-2 font-normal">Pedido</th>
                  <th className="pb-2 font-normal">Estado</th>
                  <th className="pb-2 font-normal text-right">Monto</th>
                  <th className="pb-2 font-normal">Plan</th>
                  <th className="pb-2 font-normal">Origen</th>
                  <th className="pb-2 font-normal">Pago MP</th>
                  <th className="pb-2 font-normal">Vence</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {filtered.map((order) => (
                  <tr key={order.slug} className="border-t border-white/5">
                    <td className="py-2">
                      <p className="font-medium text-white/90">{order.nombre || order.slug}</p>
                      <p className="text-[10px] text-white/30">{order.slug}</p>
                    </td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${order.estado === 'ACTIVA' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
                        {order.estado || '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right">{order.monto ? money(order.monto) : '—'}</td>
                    <td className="py-2 text-white/50">{order.plan || '—'}</td>
                    <td className="py-2 text-white/50">
                      {order.utm_source || '(directo)'}
                      {order.utm_campaign ? <span className="text-white/25"> · {order.utm_campaign}</span> : null}
                    </td>
                    <td className="py-2 font-mono text-[10px] text-white/40">{order.payment_id || '—'}</td>
                    <td className="py-2 text-white/40">{order.expires_at || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log del webhook */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-white/80">
          <Check size={15} className="text-green-400" /> Últimos eventos del webhook
        </p>
        {logs.length === 0 ? (
          <p className="mt-3 text-xs text-white/30">Sin eventos todavía.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {logs.slice().reverse().map((log, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-1.5 text-[11px]">
                <span className={`rounded px-1.5 py-0.5 font-bold ${
                  log.resultado === 'activada' ? 'bg-green-500/15 text-green-400'
                    : log.resultado === 'duplicado' ? 'bg-white/10 text-white/50'
                      : 'bg-red-500/15 text-red-400'
                }`}>{log.resultado || '—'}</span>
                <span className="font-mono text-white/40">{log.payment_id || '—'}</span>
                <span className="text-white/30">{log.order_id || ''}</span>
                {log.monto ? <span className="text-white/40">{money(log.monto)}</span> : null}
                {log.detalle ? <span className="text-white/25">{log.detalle}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
