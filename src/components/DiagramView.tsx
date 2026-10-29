import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { levelOf } from '../lib/diagrams'
import { grade, hintMask } from '../lib/match'
import { failedIds, mastery, recordAttempt, recordSession, resetProgress, useProgress } from '../lib/storage'
import type { Blank, Diagram, Grade } from '../lib/types'
import { Board } from './Board'
import { Ring } from './Ring'

export type Mode = 'study' | 'practice' | 'exam'
export type Scope = 'clave' | 'todo' | 'errores'

/** Contexto cuando el gráfico se practica dentro de una serie (una unidad o todo). */
export interface SeriesNav {
  label: string
  index: number
  total: number
  /** Resultado de cada gráfico de la serie (0–1), null si todavía no se hizo. */
  marks: (number | null)[]
  titles: string[]
  onGo: (index: number) => void
  onDone: (score: number, total: number) => void
}

export interface Cell {
  value: string
  grade?: Grade
  attempts: number
  hint: number
  revealed: boolean
  final: boolean
  /** Cambia en cada intento fallido para re-disparar la animación. */
  shake: number
}

export type Outcome = 'ok' | 'helped' | 'miss' | 'pending'

export function outcomeOf(c?: Cell): Outcome {
  if (!c || !c.final) return 'pending'
  if (c.revealed || c.grade === 'bad') return 'miss'
  return c.attempts > 1 || c.hint > 0 ? 'helped' : 'ok'
}

const newCell = (): Cell => ({ value: '', attempts: 0, hint: 0, revealed: false, final: false, shake: 0 })

const MODES: { id: Mode; label: string; key: string }[] = [
  { id: 'study', label: 'Estudio', key: '1' },
  { id: 'practice', label: 'Práctica', key: '2' },
  { id: 'exam', label: 'Simulacro', key: '3' },
]

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function DiagramView({
  diagram,
  series,
  initialMode = 'study',
  initialScope = 'clave',
}: {
  diagram: Diagram
  series?: SeriesNav
  initialMode?: Mode
  initialScope?: Scope
}) {
  const allProgress = useProgress()
  const progress = allProgress[diagram.id]
  const blanks = diagram.config.blanks
  const byId = useMemo(() => Object.fromEntries(blanks.map((b) => [b.id, b])), [blanks])
  const failedNow = failedIds(diagram, progress)

  const [mode, setMode] = useState<Mode>(initialMode)
  const [scope, setScope] = useState<Scope>(initialScope)
  const [ids, setIds] = useState<string[]>(() => blanks.filter((b) => levelOf(b) === 'clave').map((b) => b.id))
  const [cells, setCells] = useState<Record<string, Cell>>({})
  const [focusId, setFocusId] = useState<string | null>(null)
  const [covered, setCovered] = useState<Set<string>>(new Set())
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [bank, setBank] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const recorded = useRef(false)
  const inputs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const active = ids.map((id) => byId[id]).filter(Boolean) as Blank[]
  const numberOf = (id: string) => ids.indexOf(id) + 1

  const focusBlank = useCallback((id: string | null | undefined) => {
    if (!id) return
    const el = inputs.current[id]
    if (el) {
      el.focus({ preventScroll: true })
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }
  }, [])

  const start = useCallback(
    (nextMode: Mode, nextScope: Scope) => {
      if (nextScope === 'errores' && failedIds(diagram, progress).length === 0) nextScope = 'clave'
      const nextIds =
        nextScope === 'todo'
          ? blanks.map((b) => b.id)
          : nextScope === 'errores'
            ? failedIds(diagram, progress)
            : blanks.filter((b) => levelOf(b) === 'clave').map((b) => b.id)
      setMode(nextMode)
      setScope(nextScope)
      setIds(nextIds)
      setCells(Object.fromEntries(nextIds.map((id) => [id, newCell()])))
      setCovered(new Set())
      setSubmitted(false)
      setShowResults(false)
      setStartedAt(Date.now())
      recorded.current = false
      if (nextMode !== 'study') requestAnimationFrame(() => focusBlank(nextIds[0]))
    },
    [blanks, diagram, progress, focusBlank],
  )

  // Dentro de una serie se arranca directo en el modo elegido.
  const seriesRef = useRef(series)
  seriesRef.current = series
  useEffect(() => {
    if (initialMode !== 'study' || initialScope !== 'clave') start(initialMode, initialScope)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasNext = series && series.index + 1 < series.total
  const goNext = () => series?.onGo(series.index + 1)
  const nextLabel = hasNext ? 'Siguiente gráfico →' : 'Ver resumen →'

  const nextOpen = (from: string, state: Record<string, Cell>) => {
    const idx = ids.indexOf(from)
    for (let i = 1; i <= ids.length; i++) {
      const id = ids[(idx + i) % ids.length]
      if (!state[id]?.final) return id
    }
    return null
  }

  const update = (id: string, patch: Partial<Cell>) => setCells((prev) => ({ ...prev, [id]: { ...(prev[id] ?? newCell()), ...patch } }))

  const finalize = (id: string, cell: Cell) => {
    recordAttempt(diagram.id, id, outcomeOf(cell) === 'ok')
  }

  const submit = (id: string) => {
    const cell = cells[id] ?? newCell()
    if (mode === 'exam') {
      focusBlank(ids[(ids.indexOf(id) + 1) % ids.length])
      return
    }
    if (cell.final || !cell.value.trim()) {
      focusBlank(nextOpen(id, cells))
      return
    }
    const g = grade(cell.value, byId[id])
    const attempts = cell.attempts + 1
    const isRight = g.grade !== 'bad'
    const final = isRight || attempts >= 2
    const next: Cell = { ...cell, grade: g.grade, attempts, final, shake: isRight ? cell.shake : cell.shake + 1 }
    const nextCells = { ...cells, [id]: next }
    setCells(nextCells)
    if (final) {
      finalize(id, next)
      focusBlank(nextOpen(id, nextCells))
    } else {
      inputs.current[id]?.select()
    }
  }

  const giveHint = (id: string) => {
    const cell = cells[id]
    if (!cell || cell.final || mode !== 'practice') return
    update(id, { hint: Math.min(2, cell.hint + 1) })
    focusBlank(id)
  }

  const reveal = (id: string) => {
    const cell = cells[id]
    if (!cell || cell.final || mode !== 'practice') return
    const next: Cell = { ...cell, revealed: true, final: true, grade: 'bad' }
    const nextCells = { ...cells, [id]: next }
    setCells(nextCells)
    finalize(id, next)
    focusBlank(nextOpen(id, nextCells))
  }

  const checkAll = () => {
    const nextCells = { ...cells }
    for (const id of ids) {
      const cell = nextCells[id] ?? newCell()
      if (cell.final || (mode === 'practice' && !cell.value.trim())) continue
      const g = grade(cell.value, byId[id])
      nextCells[id] = { ...cell, grade: g.grade, attempts: cell.attempts + 1, final: true }
      finalize(id, nextCells[id])
    }
    setCells(nextCells)
    if (mode === 'exam') setSubmitted(true)
  }

  const fillFromBank = (answer: string) => {
    const target = focusId && !cells[focusId]?.final ? focusId : ids.find((id) => !cells[id]?.final && !cells[id]?.value)
    if (!target) return
    update(target, { value: answer })
    focusBlank(target)
  }

  // Fin de sesión: cuando todos los huecos tienen resultado final.
  const allFinal = mode !== 'study' && ids.length > 0 && ids.every((id) => cells[id]?.final)
  const outcomes = ids.map((id) => outcomeOf(cells[id]))
  const score = outcomes.reduce((n, o) => n + (o === 'ok' ? 1 : o === 'helped' ? 0.5 : 0), 0)

  useEffect(() => {
    if (!allFinal || recorded.current) return
    recorded.current = true
    recordSession(diagram.id, { at: Date.now(), mode: mode as 'practice' | 'exam', score, total: ids.length })
    seriesRef.current?.onDone(score, ids.length)
    const t = setTimeout(() => setShowResults(true), 650)
    return () => clearTimeout(t)
  }, [allFinal, diagram.id, ids.length, mode, score])

  useEffect(() => {
    if (mode !== 'exam' || submitted) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [mode, submitted])

  // Atajos globales (fuera de los huecos).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return
      const m = MODES.find((x) => x.key === e.key)
      if (m) start(m.id, scope)
      else if (e.key === 'z') setZoom((z) => (z === 1 ? 1.5 : z === 1.5 ? 2 : 1))
      else if (e.key === 'b' && mode !== 'study') setBank((b) => !b)
      else if (e.key === 'ArrowRight' && seriesRef.current) seriesRef.current.onGo(seriesRef.current.index + 1)
      else if (e.key === 'ArrowLeft' && seriesRef.current && seriesRef.current.index > 0) seriesRef.current.onGo(seriesRef.current.index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [start, scope, mode])

  // Se mezcla de nuevo en cada sesión.
  const bankWords = useMemo(() => shuffle([...new Set(ids.map((id) => byId[id]?.answer).filter(Boolean))]), [ids, byId, startedAt])
  const usedAnswers = new Set(ids.filter((id) => cells[id]?.final && outcomeOf(cells[id]) !== 'miss').map((id) => byId[id].answer))

  const done = ids.filter((id) => cells[id]?.final).length
  const filled = ids.filter((id) => cells[id]?.value.trim()).length
  const elapsed = Math.max(0, Math.floor(((submitted ? now : Date.now()) - startedAt) / 1000))
  const m = mastery(diagram, progress)
  const focusCell = focusId ? cells[focusId] : undefined

  return (
    <main className="page page-wide">
      {series && <SeriesBar series={series} />}
      <section className="view-head">
        <div>
          {!series && (
            <a href="#/" className="back">
              ← Gráficos
            </a>
          )}
          <h1 className="title">{diagram.title}</h1>
          <div className="view-meta">
            {diagram.config.topic && <span>{diagram.config.topic}</span>}
            <span className="sep" />
            <span className="meta-ring">
              <Ring value={m} size={22} stroke={2.5} /> dominio
            </span>
            <span className="sep" />
            <a href={`#/g/${diagram.id}/editar`} className="link-quiet">
              Editar huecos
            </a>
          </div>
        </div>
        <div className="segmented big" role="tablist" aria-label="Modo">
          {MODES.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={mode === x.id}
              className={mode === x.id ? 'on' : ''}
              onClick={() => start(x.id, scope)}
              title={`Atajo: ${x.key}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </section>

      <div className="toolbar">
        <div className="segmented" aria-label="Qué huecos">
          {(
            [
              ['clave', 'Clave', blanks.filter((b) => levelOf(b) === 'clave').length],
              ['todo', 'Todo', blanks.length],
              ['errores', 'Mis errores', failedNow.length],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              className={scope === id ? 'on' : ''}
              disabled={n === 0}
              onClick={() => start(mode, id)}
              title={id === 'clave' ? 'Lo que suelen tomar en el parcial' : id === 'errores' ? 'Huecos que fallaste la última vez' : 'Todos los textos marcados'}
            >
              {label} <span className="count">{n}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          {mode !== 'study' && (
            <button className={`chip-toggle ${bank ? 'on' : ''}`} onClick={() => setBank((b) => !b)} title="Atajo: B">
              Banco de palabras
            </button>
          )}
          <div className="segmented small" aria-label="Zoom">
            {[1, 1.5, 2].map((z) => (
              <button key={z} className={zoom === z ? 'on' : ''} onClick={() => setZoom(z)} title="Atajo: Z">
                {z === 1 ? 'Ajustar' : `${z}×`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="workspace">
        <div className="board-wrap">
          <Board
            diagram={diagram}
            mode={mode}
            ids={ids}
            cells={cells}
            covered={covered}
            hoverId={hoverId}
            focusId={focusId}
            zoom={zoom}
            submitted={submitted}
            inputs={inputs}
            onToggleCover={(id) =>
              setCovered((s) => {
                const n = new Set(s)
                n.has(id) ? n.delete(id) : n.add(id)
                return n
              })
            }
            onChange={(id, value) => update(id, { value })}
            onSubmit={submit}
            onHint={giveHint}
            onReveal={reveal}
            onFocus={setFocusId}
          />
          <p className="kbd-hints">
            {mode === 'study' ? (
              <>
                Tocá un concepto para taparlo · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> cambiar modo · <kbd>Z</kbd> zoom
                {series && (
                  <>
                    {' '}
                    · <kbd>←</kbd> <kbd>→</kbd> gráfico anterior / siguiente
                  </>
                )}
              </>
            ) : mode === 'practice' ? (
              <>
                <kbd>Enter</kbd> verificar · <kbd>Tab</kbd> siguiente · <kbd>Alt</kbd>+<kbd>P</kbd> pista · <kbd>Alt</kbd>+
                <kbd>R</kbd> revelar · <kbd>Esc</kbd> salir del hueco
              </>
            ) : (
              <>
                <kbd>Enter</kbd> o <kbd>Tab</kbd> siguiente hueco · sin correcciones hasta entregar
              </>
            )}
          </p>
        </div>

        <aside className="panel">
          {mode === 'study' ? (
            <>
              <div className="panel-head">
                <h2 className="panel-title">Conceptos</h2>
                <span className="muted small">{active.length}</span>
              </div>
              <ol className="list">
                {active.map((b) => (
                  <li
                    key={b.id}
                    className={`row ${covered.has(b.id) ? 'is-covered' : ''}`}
                    onMouseEnter={() => setHoverId(b.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    <button
                      className="row-btn"
                      onClick={() =>
                        setCovered((s) => {
                          const n = new Set(s)
                          n.has(b.id) ? n.delete(b.id) : n.add(b.id)
                          return n
                        })
                      }
                    >
                      <span className="num">{numberOf(b.id)}</span>
                      <span className="row-text">{covered.has(b.id) ? '· · ·' : b.answer}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="panel-actions">
                <button className="btn ghost" onClick={() => setCovered(covered.size === active.length ? new Set() : new Set(ids))}>
                  {covered.size === active.length ? 'Mostrar todo' : 'Tapar todo'}
                </button>
                {series ? (
                  <button className="btn primary" onClick={goNext}>
                    {nextLabel}
                  </button>
                ) : (
                  <button className="btn primary" onClick={() => start('practice', scope)}>
                    Empezar práctica →
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="panel-head">
                <h2 className="panel-title">{mode === 'exam' ? 'Simulacro' : 'Práctica'}</h2>
                {mode === 'exam' && !submitted ? (
                  <span className="timer">
                    {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
                  </span>
                ) : (
                  <span className="muted small">
                    {done}/{ids.length}
                  </span>
                )}
              </div>
              <div className="progress">
                {ids.map((id) => {
                  const o = outcomeOf(cells[id])
                  const isFilled = mode === 'exam' && !submitted && cells[id]?.value.trim()
                  return <span key={id} className={`seg ${o} ${isFilled ? 'filled' : ''} ${focusId === id ? 'current' : ''}`} />
                })}
              </div>

              <ol className="list">
                {active.map((b) => {
                  const c = cells[b.id]
                  const o = outcomeOf(c)
                  const showAnswer = c?.final
                  return (
                    <li key={b.id} className={`row ${o} ${focusId === b.id ? 'current' : ''}`}>
                      <button className="row-btn" onClick={() => focusBlank(b.id)}>
                        <span className="num">{numberOf(b.id)}</span>
                        <span className="row-text">
                          {showAnswer ? (
                            <>
                              <span className="answer">{b.answer}</span>
                              {c && note(c, o) && <span className="yours">{note(c, o)}</span>}
                            </>
                          ) : c?.hint ? (
                            <span className="hint">{hintMask(b.answer, c.hint)}</span>
                          ) : mode === 'exam' && c?.value.trim() ? (
                            <span>{c.value}</span>
                          ) : c?.attempts ? (
                            <span className="retry">Incorrecto — probá otra vez</span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </span>
                        <StatusIcon outcome={o} />
                      </button>
                    </li>
                  )
                })}
              </ol>

              {bank && (
                <div className="bank">
                  <span className="bank-label">Banco de palabras</span>
                  <div className="bank-chips">
                    {bankWords.map((w) => (
                      <button key={w} className={`bank-chip ${usedAnswers.has(w) ? 'used' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => fillFromBank(w)}>
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="panel-actions">
                {mode === 'practice' && !allFinal && (
                  <>
                    <button
                      className="btn ghost"
                      disabled={!focusId || !focusCell || focusCell.final || focusCell.hint >= 2}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => focusId && giveHint(focusId)}
                    >
                      Pista
                    </button>
                    <button
                      className="btn ghost"
                      disabled={!focusId || !focusCell || focusCell.final}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => focusId && reveal(focusId)}
                    >
                      Revelar
                    </button>
                    <button className="btn primary" disabled={filled === 0} onClick={checkAll}>
                      Verificar todo
                    </button>
                  </>
                )}
                {mode === 'exam' && !submitted && (
                  <button className="btn primary wide" onClick={checkAll}>
                    Entregar ({filled}/{ids.length})
                  </button>
                )}
                {allFinal && (
                  <>
                    <button className="btn ghost" onClick={() => start(mode, scope)}>
                      Otra vez
                    </button>
                    {series ? (
                      <button className="btn primary" onClick={goNext}>
                        {nextLabel}
                      </button>
                    ) : (
                      <button className="btn primary" onClick={() => setShowResults(true)}>
                        Ver resultado
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          {progress && (
            <button
              className="reset-link"
              onClick={() => {
                if (confirm('¿Borrar el progreso guardado de este gráfico?')) resetProgress(diagram.id)
              }}
            >
              Borrar progreso
            </button>
          )}
        </aside>
      </div>

      {showResults && (
        <Results
          score={score}
          total={ids.length}
          outcomes={outcomes}
          misses={active.filter((b) => outcomeOf(cells[b.id]) === 'miss')}
          cells={cells}
          numberOf={numberOf}
          elapsed={mode === 'exam' ? elapsed : null}
          onClose={() => setShowResults(false)}
          onRetry={() => start(mode, scope)}
          onErrors={() => start('practice', 'errores')}
          onStudy={() => start('study', scope)}
          hasErrors={failedIds(diagram, progress).length > 0}
          next={series ? { label: nextLabel, onClick: goNext } : undefined}
        />
      )}
    </main>
  )
}

function SeriesBar({ series }: { series: SeriesNav }) {
  const { index, total, marks, titles, onGo, label } = series
  return (
    <div className="series-bar">
      <div className="series-top">
        <a href="#/" className="back">
          ← Salir
        </a>
        <span className="series-label">{label}</span>
        <div className="series-nav">
          <span className="series-count">
            {String(index + 1).padStart(2, '0')} <span className="muted">/ {String(total).padStart(2, '0')}</span>
          </span>
          <button className="icon-btn" disabled={index === 0} onClick={() => onGo(index - 1)} aria-label="Gráfico anterior" title="Anterior (←)">
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
              <path d="M12 4.5L6.5 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="icon-btn" onClick={() => onGo(index + 1)} aria-label={index + 1 < total ? 'Gráfico siguiente' : 'Ver resumen'} title="Siguiente (→)">
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
              <path d="M8 4.5l5.5 5.5L8 15.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="series-strip">
        {marks.map((m, i) => (
          <button
            key={i}
            className={`series-seg ${markClass(m)} ${i === index ? 'current' : ''}`}
            onClick={() => onGo(i)}
            title={`${i + 1}. ${titles[i]}${m === null ? '' : ` · ${Math.round(m * 100)}%`}`}
            aria-label={`Ir al gráfico ${i + 1}: ${titles[i]}`}
          />
        ))}
      </div>
    </div>
  )
}

export const markClass = (m: number | null) => (m === null ? 'pending' : m >= 0.8 ? 'ok' : m >= 0.5 ? 'helped' : 'miss')

/** Aclaración debajo de la respuesta correcta en el panel. */
function note(c: Cell, o: Outcome) {
  if (c.revealed) return 'Revelada'
  if (o === 'miss') return c.value.trim() ? `Pusiste: «${c.value.trim()}»` : 'Sin responder'
  if (c.grade === 'close') return `Ojo con la ortografía: «${c.value.trim()}»`
  if (o === 'helped') return c.hint ? 'Con pista' : 'Al segundo intento'
  return null
}

function StatusIcon({ outcome }: { outcome: Outcome }) {
  if (outcome === 'pending') return <span className="status" />
  return (
    <span className={`status ${outcome}`} aria-label={outcome === 'ok' ? 'Correcto' : outcome === 'helped' ? 'Correcto con ayuda' : 'Incorrecto'}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
        {outcome === 'miss' ? (
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        ) : (
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  )
}

function Results(props: {
  score: number
  total: number
  outcomes: Outcome[]
  misses: Blank[]
  cells: Record<string, Cell>
  numberOf: (id: string) => number
  elapsed: number | null
  hasErrors: boolean
  onClose: () => void
  onRetry: () => void
  onErrors: () => void
  onStudy: () => void
  next?: { label: string; onClick: () => void }
}) {
  const pct = props.total ? Math.round((props.score / props.total) * 100) : 0
  const count = (o: Outcome) => props.outcomes.filter((x) => x === o).length
  const verdict = pct === 100 ? 'Perfecto.' : pct >= 80 ? 'Muy bien.' : pct >= 60 ? 'Vas bien.' : 'A repasar.'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  return (
    <div className="overlay" onClick={props.onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Resultado" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Resultado{props.elapsed !== null && ` · ${Math.floor(props.elapsed / 60)}m ${props.elapsed % 60}s`}</p>
        <div className="score">
          <span className="score-num">{pct}</span>
          <span className="score-pct">%</span>
        </div>
        <p className="verdict">{verdict}</p>
        <div className="breakdown">
          <span>
            <i className="dot ok" /> {count('ok')} de primera
          </span>
          <span>
            <i className="dot helped" /> {count('helped')} con ayuda
          </span>
          <span>
            <i className="dot miss" /> {count('miss')} a repasar
          </span>
        </div>
        {props.misses.length > 0 && (
          <ul className="misses">
            {props.misses.map((b) => (
              <li key={b.id}>
                <span className="num">{props.numberOf(b.id)}</span>
                <div>
                  <div>{b.answer}</div>
                  {props.cells[b.id]?.value.trim() && !props.cells[b.id]?.revealed && (
                    <div className="muted small strike">{props.cells[b.id].value}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="sheet-actions">
          <button className="btn ghost" onClick={props.onStudy}>
            Volver a estudiar
          </button>
          <button className="btn ghost" onClick={props.onRetry}>
            Otra vez
          </button>
          {props.next ? (
            <>
              {props.hasErrors && (
                <button className="btn ghost" onClick={props.onErrors}>
                  Repasar errores
                </button>
              )}
              <button className="btn primary" onClick={props.next.onClick} autoFocus>
                {props.next.label}
              </button>
            </>
          ) : props.hasErrors ? (
            <button className="btn primary" onClick={props.onErrors} autoFocus>
              Practicar errores →
            </button>
          ) : (
            <button className="btn primary" onClick={props.onClose} autoFocus>
              Listo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
