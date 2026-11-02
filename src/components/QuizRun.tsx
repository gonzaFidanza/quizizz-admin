import { useEffect, useMemo, useState } from 'react'
import { findQuestion } from '../cuestionarios'
import { corregir, respondida, type Answer, type Question } from '../lib/quiz'
import { formatTime } from '../lib/crosswordProgress'
import { recordQuestion, saveRun, type Run } from '../lib/quizProgress'
import { QuestionView } from './QuestionView'

interface Props {
  initial: Run
  onExit: () => void
  /** Empieza otra tanda con estas preguntas. */
  onRepeat: (ids: string[], titulo: string) => void
}

export function QuizRun({ initial, onExit, onRepeat }: Props) {
  const [run, setRun] = useState(initial)
  const items = useMemo(() => run.ids.map(findQuestion).filter((q): q is Question => !!q), [run.ids])

  useEffect(() => saveRun(run), [run])

  useEffect(() => {
    if (run.submitted) return
    const t = setInterval(() => setRun((r) => ({ ...r, elapsed: r.elapsed + 1 })), 1000)
    return () => clearInterval(t)
  }, [run.submitted])

  useEffect(() => {
    if (!run.submitted) window.scrollTo({ top: 0 })
  }, [run.idx, run.submitted])

  if (run.submitted) return <Resultado run={run} items={items} setRun={setRun} onExit={onExit} onRepeat={onRepeat} />

  const q = items[run.idx]
  const simulacro = run.modo === 'simulacro'
  const revealed = !simulacro && !!run.checked[q.id]
  const answer = run.answers[q.id]
  const ultimo = run.idx === items.length - 1
  const puedeCorregir = respondida(q, answer) || q.t === 'dev'

  const setAnswer = (a: Answer) => setRun((r) => ({ ...r, answers: { ...r.answers, [q.id]: a } }))
  const irA = (idx: number) => setRun((r) => ({ ...r, idx }))

  const corregirActual = () => {
    setRun((r) => ({ ...r, checked: { ...r.checked, [q.id]: true } }))
    if (q.t !== 'dev') recordQuestion(q.id, corregir(q, answer).score)
  }

  const autocorregir = (nota: number) => {
    setRun((r) => ({ ...r, answers: { ...r.answers, [q.id]: { ...r.answers[q.id], self: nota } } }))
    recordQuestion(q.id, nota)
  }

  const entregar = () => {
    if (simulacro) {
      for (const it of items) if (it.t !== 'dev') recordQuestion(it.id, corregir(it, run.answers[it.id]).score)
    }
    setRun((r) => ({ ...r, submitted: true, checked: Object.fromEntries(r.ids.map((id) => [id, true as const])) }))
  }

  const faltan = items.filter((it) => !respondida(it, run.answers[it.id])).length

  return (
    <main className="page qz-page">
      <div className="qz-top">
        <button className="back" onClick={onExit}>
          ← Cuestionarios
        </button>
        <span className="muted small">
          {run.titulo} · {simulacro ? 'Simulacro' : 'Práctica'} · {formatTime(run.elapsed)}
        </span>
      </div>
      <div className="summary-bar qz-progress" role="progressbar" aria-valuenow={run.idx + 1} aria-valuemax={items.length}>
        <span className="summary-fill" style={{ width: `${((run.idx + 1) / items.length) * 100}%` }} />
      </div>
      <p className="muted small qz-count">
        Pregunta {run.idx + 1} de {items.length}
      </p>

      <QuestionView
        key={q.id}
        q={q}
        answer={answer}
        onChange={setAnswer}
        revealed={revealed}
        intento={run.intento}
        onSelf={autocorregir}
      />

      {simulacro && (
        <nav className="qz-dots" aria-label="Preguntas">
          {items.map((it, i) => (
            <button
              key={it.id}
              className={`qz-dot ${i === run.idx ? 'current' : ''} ${respondida(it, run.answers[it.id]) ? 'done' : ''}`}
              onClick={() => irA(i)}
              aria-label={`Pregunta ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}

      <div className="qz-actions">
        <button className="btn ghost" onClick={() => irA(run.idx - 1)} disabled={run.idx === 0}>
          Anterior
        </button>
        <div className="setup-actions">
          {simulacro ? (
            <>
              {!ultimo && (
                <button className="btn" onClick={() => irA(run.idx + 1)}>
                  Siguiente
                </button>
              )}
              <button className={`btn ${ultimo ? 'primary' : ''}`} onClick={entregar}>
                Entregar{faltan ? ` (faltan ${faltan})` : ''}
              </button>
            </>
          ) : !revealed ? (
            <>
              {!ultimo && (
                <button className="btn" onClick={() => irA(run.idx + 1)}>
                  Saltear
                </button>
              )}
              <button className="btn primary" onClick={corregirActual} disabled={!puedeCorregir}>
                {q.t === 'dev' ? 'Ver respuesta modelo' : 'Corregir'}
              </button>
            </>
          ) : ultimo ? (
            <button className="btn primary" onClick={entregar}>
              Ver resultado
            </button>
          ) : (
            <button className="btn primary" onClick={() => irA(run.idx + 1)} autoFocus>
              Siguiente
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

function Resultado({
  run,
  items,
  setRun,
  onExit,
  onRepeat,
}: {
  run: Run
  items: Question[]
  setRun: (fn: (r: Run) => Run) => void
  onExit: () => void
  onRepeat: Props['onRepeat']
}) {
  const [abierta, setAbierta] = useState<string | null>(null)
  const filas = items.map((q) => ({ q, ...corregir(q, run.answers[q.id]) }))
  const conNota = filas.filter(({ q }) => q.t !== 'dev' || run.answers[q.id]?.self !== undefined)
  const pct = conNota.length ? Math.round((conNota.reduce((n, f) => n + f.score, 0) / conNota.length) * 100) : 0
  const pendientes = filas.length - conNota.length
  const errores = filas.filter((f) => f.score < 1)

  const porTema = useMemo(() => {
    const m = new Map<string, { suma: number; n: number }>()
    for (const f of conNota) {
      const s = m.get(f.q.tema) ?? { suma: 0, n: 0 }
      m.set(f.q.tema, { suma: s.suma + f.score, n: s.n + 1 })
    }
    return [...m].map(([tema, s]) => ({ tema, pct: s.suma / s.n, n: s.n })).sort((a, b) => a.pct - b.pct)
  }, [conNota])

  const verdict = pct >= 90 ? 'Estás para rendir.' : pct >= 60 ? 'Vas bien, repasá los temas de abajo.' : 'Volvé al apunte y repetí los errores.'

  return (
    <main className="page qz-page">
      <section className="series-hero">
        <button className="back" onClick={onExit}>
          ← Cuestionarios
        </button>
        <p className="eyebrow">
          {run.titulo} · {run.modo === 'simulacro' ? 'Simulacro' : 'Práctica'} · {formatTime(run.elapsed)}
        </p>
        <div className="score">
          <span className="score-num">{pct}</span>
          <span className="score-pct">%</span>
        </div>
        <p className="verdict">{verdict}</p>
        {pendientes > 0 && <p className="muted">Te faltan autocorregir {pendientes} consignas de desarrollo: abrilas en la lista.</p>}
      </section>

      {porTema.length > 1 && (
        <section className="group">
          <div className="section-head">
            <h2 className="h2">Por tema</h2>
          </div>
          <ul className="qz-temas">
            {porTema.map((t) => (
              <li key={t.tema}>
                <span>{t.tema}</span>
                <span className="summary-bar">
                  <span className={`summary-fill ${t.pct >= 0.6 ? 'ok' : 'miss'}`} style={{ width: `${t.pct * 100}%` }} />
                </span>
                <span className="summary-pct">{Math.round(t.pct * 100)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="group">
        <div className="section-head">
          <h2 className="h2">Revisión</h2>
          <span className="muted small">Tocá una pregunta para verla corregida</span>
        </div>
        <ol className="summary-list">
          {filas.map(({ q, score }, i) => {
            const sinNota = q.t === 'dev' && run.answers[q.id]?.self === undefined
            return (
              <li key={q.id}>
                <button className="summary-row" onClick={() => setAbierta(abierta === q.id ? null : q.id)} aria-expanded={abierta === q.id}>
                  <span className="index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="summary-title">{q.q}</span>
                  <span className="summary-pct">{sinNota ? '—' : `${Math.round(score * 100)}%`}</span>
                </button>
                {abierta === q.id && (
                  <div className="qz-review">
                    <QuestionView
                      q={q}
                      answer={run.answers[q.id]}
                      onChange={() => {}}
                      revealed
                      intento={run.intento}
                      onSelf={(nota) => {
                        setRun((r) => ({ ...r, answers: { ...r.answers, [q.id]: { ...r.answers[q.id], self: nota } } }))
                        recordQuestion(q.id, nota)
                      }}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <div className="setup-foot">
        <span className="muted small">
          {errores.length} de {filas.length} para repasar
        </span>
        <div className="setup-actions">
          <button className="btn ghost" onClick={() => onRepeat(run.ids, run.titulo)}>
            Repetir todo
          </button>
          {errores.length > 0 && (
            <button className="btn primary big" onClick={() => onRepeat(errores.map((f) => f.q.id), 'Mis errores')}>
              Practicar errores
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
