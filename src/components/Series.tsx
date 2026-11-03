import { useEffect, useState } from 'react'
import { findDiagram, levelOf, type Group } from '../lib/diagrams'
import { failedIds, useProgress, type DiagramProgress } from '../lib/storage'
import type { Diagram } from '../lib/types'
import { DiagramView, markClass, type Mode, type Scope } from './DiagramView'

type Order = 'orden' | 'mezcla'

interface Run {
  mode: Mode
  scope: Scope
  order: string[]
  index: number
  results: Record<string, { score: number; total: number }>
  startedAt: number
}

const MODES: [Mode, string, string][] = [
  ['study', 'Estudio', 'Recorrés los gráficos completos, uno atrás del otro.'],
  ['practice', 'Práctica', 'Completás cada gráfico con corrección al instante y pistas.'],
  ['exam', 'Simulacro', 'Sin ayudas: ves el resultado de cada gráfico al entregarlo.'],
]

const storeKey = (key: string) => `repaso-asi:serie:${key}`

function loadRun(key: string): Run | null {
  try {
    const run = JSON.parse(localStorage.getItem(storeKey(key)) ?? 'null') as Run | null
    return run && run.order.every((id) => findDiagram(id)) ? run : null
  } catch {
    return null
  }
}

function saveRun(key: string, run: Run | null) {
  try {
    if (run) localStorage.setItem(storeKey(key), JSON.stringify(run))
    else localStorage.removeItem(storeKey(key))
  } catch {}
}

const skippedKey = (key: string) => `repaso-asi:serie-excluidos:${key}`

/** Se guardan los excluidos, no los elegidos: así un gráfico nuevo entra por defecto. */
function loadSkipped(key: string): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(skippedKey(key)) ?? '[]')
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

function saveSkipped(key: string, ids: string[]) {
  try {
    localStorage.setItem(skippedKey(key), JSON.stringify(ids))
  } catch {}
}

/** Gráficos que entran en la serie y cuántos huecos tiene cada uno según el filtro. */
function blanksFor(d: Diagram, scope: Scope, p?: DiagramProgress) {
  if (scope === 'todo') return d.config.blanks.length
  if (scope === 'errores') return failedIds(d, p).length
  return d.config.blanks.filter((b) => levelOf(b) === 'clave').length
}

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function Series({ group }: { group: Group }) {
  const progress = useProgress()
  const [run, setRun] = useState<Run | null>(null)
  const [saved, setSaved] = useState<Run | null>(() => loadRun(group.key))

  useEffect(() => {
    if (run) saveRun(group.key, run)
  }, [run, group.key])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [run?.index, run?.startedAt])

  const begin = (mode: Mode, scope: Scope, order: Order, only?: string[]) => {
    const pool = group.diagrams.filter((d) => d.configured && blanksFor(d, scope, progress[d.id]) > 0 && (!only || only.includes(d.id)))
    const ids = pool.map((d) => d.id)
    setRun({ mode, scope, order: order === 'mezcla' ? shuffle(ids) : ids, index: 0, results: {}, startedAt: Date.now() })
  }

  if (!run) {
    return (
      <Setup
        group={group}
        progress={progress}
        saved={saved && saved.index < saved.order.length ? saved : null}
        onResume={() => saved && setRun(saved)}
        onStart={(mode, scope, order, only) => {
          setSaved(null)
          begin(mode, scope, order, only)
        }}
      />
    )
  }

  const label = group.unit ? `${group.unit} · ${group.name}` : group.name
  const titles = run.order.map((id) => findDiagram(id)?.title ?? id)

  if (run.index >= run.order.length) {
    return (
      <Summary
        run={run}
        label={label}
        titles={titles}
        onOpen={(i) => setRun({ ...run, index: i })}
        onAgain={() => begin(run.mode, run.scope, 'orden', run.order)}
        onPractice={() => begin('practice', run.scope === 'errores' ? 'clave' : run.scope, 'orden', run.order)}
        onErrors={(ids) => begin('practice', 'errores', 'orden', ids)}
      />
    )
  }

  const id = run.order[run.index]
  const diagram = findDiagram(id)!
  return (
    <DiagramView
      key={`${run.startedAt}-${run.index}`}
      diagram={diagram}
      initialMode={run.mode}
      initialScope={run.scope}
      series={{
        label,
        index: run.index,
        total: run.order.length,
        titles,
        marks: run.order.map((x) => {
          const r = run.results[x]
          return r ? r.score / r.total : null
        }),
        onGo: (i) => setRun((r) => (r ? { ...r, index: Math.max(0, Math.min(i, r.order.length)) } : r)),
        onDone: (score, total) => setRun((r) => (r ? { ...r, results: { ...r.results, [id]: { score, total } } } : r)),
      }}
    />
  )
}

function Setup(props: {
  group: Group
  progress: Record<string, DiagramProgress>
  saved: Run | null
  onResume: () => void
  onStart: (mode: Mode, scope: Scope, order: Order, only: string[]) => void
}) {
  const { group, progress, saved } = props
  const [mode, setMode] = useState<Mode>('practice')
  const [scope, setScope] = useState<Scope>('clave')
  const [order, setOrder] = useState<Order>('orden')
  const [skipped, setSkipped] = useState(() => loadSkipped(group.key))
  const [preview, setPreview] = useState<number | null>(null)

  const available = group.diagrams.filter((d) => d.configured)
  const chosen = available.filter((d) => !skipped.includes(d.id))
  const only = chosen.map((d) => d.id)

  const updateSkipped = (ids: string[]) => {
    setSkipped(ids)
    saveSkipped(group.key, ids)
  }
  const toggleDiagram = (id: string) => updateSkipped(skipped.includes(id) ? skipped.filter((x) => x !== id) : [...skipped, id])

  const stats = (s: Scope) => {
    const counts = chosen.map((d) => blanksFor(d, s, progress[d.id]))
    return { diagrams: counts.filter((n) => n > 0).length, blanks: counts.reduce((a, b) => a + b, 0) }
  }
  const current = stats(scope)
  const minutes = Math.max(1, Math.round(mode === 'study' ? current.diagrams * 0.75 : (current.blanks * 12) / 60))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (preview !== null) return
      if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button, a') && current.diagrams > 0) props.onStart(mode, scope, order, only)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <main className="page">
      <section className="series-hero">
        <a href="#/" className="back">
          ← Gráficos
        </a>
        <p className="eyebrow">Serie · {group.diagrams.length} gráficos seguidos</p>
        <h1 className="display">
          {group.unit || 'Todo'}
          <span className="accent-dot">.</span>
        </h1>
        <p className="lede">
          {group.unit ? group.name : 'Todas las unidades'}. Pasás de un gráfico al siguiente sin volver al inicio, y al final ves cómo te fue
          en cada uno.
        </p>
      </section>

      <section className="setup">
        <SetupRow label="Modo" hint={MODES.find((m) => m[0] === mode)![2]}>
          {MODES.map(([id, text]) => (
            <button key={id} className={mode === id ? 'on' : ''} onClick={() => setMode(id)}>
              {text}
            </button>
          ))}
        </SetupRow>
        <SetupRow
          label="Huecos"
          hint={
            scope === 'clave'
              ? 'Lo que suelen tomar en el parcial.'
              : scope === 'todo'
                ? 'Todos los textos marcados, incluidas las listas.'
                : 'Solo los huecos que fallaste la última vez.'
          }
        >
          {(
            [
              ['clave', 'Clave'],
              ['todo', 'Todo'],
              ['errores', 'Mis errores'],
            ] as const
          ).map(([id, text]) => {
            const n = stats(id).blanks
            return (
              <button key={id} className={scope === id ? 'on' : ''} disabled={n === 0} onClick={() => setScope(id)}>
                {text} <span className="count">{n}</span>
              </button>
            )
          })}
        </SetupRow>
        <SetupRow label="Orden" hint={order === 'orden' ? 'Como aparecen en la unidad.' : 'Mezclados, para no memorizar la secuencia.'}>
          <button className={order === 'orden' ? 'on' : ''} onClick={() => setOrder('orden')}>
            En orden
          </button>
          <button className={order === 'mezcla' ? 'on' : ''} onClick={() => setOrder('mezcla')}>
            Mezclado
          </button>
        </SetupRow>
        <div className="setup-row">
          <span className="setup-label">Gráficos</span>
          <div className="setup-control">
            <div className="pick-grid">
              {available.map((d, i) => {
                const on = !skipped.includes(d.id)
                return (
                  <div key={d.id} className={`pick-card ${on ? 'on' : ''}`}>
                    <button className="pick-card-main" onClick={() => toggleDiagram(d.id)} aria-pressed={on} title={on ? 'Quitar de la serie' : 'Agregar a la serie'}>
                      <span className="pick-thumb">
                        <img src={d.image} alt="" loading="lazy" />
                      </span>
                      <span className="pick-card-foot">
                        <span className="pick-check" aria-hidden="true">
                          {on ? '✓' : ''}
                        </span>
                        <span>{d.title}</span>
                      </span>
                    </button>
                    <button className="pick-zoom" onClick={() => setPreview(i)} aria-label={`Ver ${d.title} en grande`} title="Ver en grande">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-4-4M11 8v6M8 11h6" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="muted small">
              {chosen.length} de {available.length} elegidos. Tocá un gráfico para sacarlo o agregarlo, o la lupa para verlo en grande; la selección
              queda guardada ·{' '}
              <button className="pick-all" onClick={() => updateSkipped([])}>
                Todos
              </button>{' '}
              ·{' '}
              <button className="pick-all" onClick={() => updateSkipped(available.map((d) => d.id))}>
                Ninguno
              </button>
            </p>
          </div>
        </div>
      </section>

      <div className="setup-foot">
        <span className="muted">
          {current.diagrams} gráficos{mode !== 'study' && ` · ${current.blanks} huecos`} · ~{minutes} min
        </span>
        <div className="setup-actions">
          {saved && (
            <button className="btn ghost" onClick={props.onResume}>
              Seguir donde quedaste · {String(saved.index + 1).padStart(2, '0')}/{String(saved.order.length).padStart(2, '0')}
            </button>
          )}
          <button className="btn primary big" disabled={current.diagrams === 0} onClick={() => props.onStart(mode, scope, order, only)}>
            Empezar →
          </button>
        </div>
      </div>

      {preview !== null && available[preview] && (
        <Preview diagrams={available} index={preview} skipped={skipped} onToggle={toggleDiagram} onGo={setPreview} onClose={() => setPreview(null)} />
      )}
    </main>
  )
}

function Preview(props: {
  diagrams: Diagram[]
  index: number
  skipped: string[]
  onToggle: (id: string) => void
  onGo: (index: number) => void
  onClose: () => void
}) {
  const { diagrams, index } = props
  const d = diagrams[index]
  const on = !props.skipped.includes(d.id)
  const go = (i: number) => props.onGo((i + diagrams.length) % diagrams.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
      else if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        props.onToggle(d.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="overlay" onClick={props.onClose}>
      <div className="preview-sheet" role="dialog" aria-modal="true" aria-label={d.title} onClick={(e) => e.stopPropagation()}>
        <div className="preview-head">
          <div>
            <p className="eyebrow">
              {String(index + 1).padStart(2, '0')} / {String(diagrams.length).padStart(2, '0')} · {on ? 'En la serie' : 'Fuera de la serie'}
            </p>
            <h2 className="preview-title">{d.title}</h2>
          </div>
          <button className="btn ghost" onClick={props.onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="preview-img">
          <img src={d.image} alt={d.title} />
        </div>
        <div className="preview-foot">
          <button className="btn ghost" onClick={() => go(index - 1)} aria-label="Anterior">
            ←
          </button>
          <button className={`btn ${on ? 'ghost' : 'primary'}`} onClick={() => props.onToggle(d.id)}>
            {on ? 'Quitar de la serie' : 'Agregar a la serie'}
          </button>
          <button className="btn ghost" onClick={() => go(index + 1)} aria-label="Siguiente">
            →
          </button>
        </div>
        <p className="muted small preview-hint">← → para moverte · Espacio para agregar o quitar · Esc para cerrar</p>
      </div>
    </div>
  )
}

function SetupRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="setup-row">
      <span className="setup-label">{label}</span>
      <div className="setup-control">
        <div className="segmented big">{children}</div>
        <p className="muted small">{hint}</p>
      </div>
    </div>
  )
}

function Summary(props: {
  run: Run
  label: string
  titles: string[]
  onOpen: (index: number) => void
  onAgain: () => void
  onPractice: () => void
  onErrors: (ids: string[]) => void
}) {
  const { run, titles } = props
  const progress = useProgress()
  const done = run.order.filter((id) => run.results[id])
  const score = done.reduce((n, id) => n + run.results[id].score, 0)
  const total = done.reduce((n, id) => n + run.results[id].total, 0)
  const pct = total ? Math.round((score / total) * 100) : 0
  const minutes = Math.max(1, Math.round((Date.now() - run.startedAt) / 60000))
  const withErrors = run.order.filter((id) => {
    const d = findDiagram(id)
    return d && failedIds(d, progress[id]).length > 0
  })
  const verdict = !done.length ? 'Recorrido terminado.' : pct === 100 ? 'Perfecto.' : pct >= 80 ? 'Muy bien.' : pct >= 60 ? 'Vas bien.' : 'A repasar.'

  return (
    <main className="page">
      <section className="series-hero">
        <a href="#/" className="back">
          ← Gráficos
        </a>
        <p className="eyebrow">
          {props.label} · {minutes} min
        </p>
        {done.length > 0 ? (
          <div className="score">
            <span className="score-num">{pct}</span>
            <span className="score-pct">%</span>
          </div>
        ) : (
          <h1 className="display">
            Listo<span className="accent-dot">.</span>
          </h1>
        )}
        <p className="verdict">{verdict}</p>
        <p className="muted">
          {done.length
            ? `${done.length} de ${run.order.length} gráficos completados${done.length < run.order.length ? ` · ${run.order.length - done.length} salteados` : ''}.`
            : `Recorriste ${run.order.length} gráficos. Ahora probá completarlos.`}
        </p>
      </section>

      <ol className="summary-list">
        {run.order.map((id, i) => {
          const r = run.results[id]
          const m = r ? r.score / r.total : null
          return (
            <li key={id}>
              <button className="summary-row" onClick={() => props.onOpen(i)}>
                <span className="index">{String(i + 1).padStart(2, '0')}</span>
                <span className="summary-title">{titles[i]}</span>
                <span className="summary-bar">
                  <span className={`summary-fill ${markClass(m)}`} style={{ width: `${(m ?? 0) * 100}%` }} />
                </span>
                <span className={`summary-pct ${markClass(m)}`}>{m === null ? (run.mode === 'study' ? 'Visto' : 'Salteado') : `${Math.round(m * 100)}%`}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="setup-foot">
        <span className="muted small">Tocá un gráfico para volver a hacerlo.</span>
        <div className="setup-actions">
          <button className="btn ghost" onClick={props.onAgain}>
            Otra vez
          </button>
          {run.mode === 'study' ? (
            <button className="btn primary big" onClick={props.onPractice} autoFocus>
              Practicar esta serie →
            </button>
          ) : withErrors.length > 0 ? (
            <button className="btn primary big" onClick={() => props.onErrors(withErrors)} autoFocus>
              Repasar errores · {withErrors.length} gráficos →
            </button>
          ) : (
            <a className="btn primary big" href="#/">
              Volver al inicio
            </a>
          )}
        </div>
      </div>
    </main>
  )
}
