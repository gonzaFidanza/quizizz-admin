import { useMemo } from 'react'
import { casos } from '../cuestionarios'
import {
  celdasHueco,
  corregir,
  formatoLabel,
  opcionesRel,
  ordenOpciones,
  sePuedeMezclar,
  type Answer,
  type Celda,
  type Question,
} from '../lib/quiz'

interface Props {
  q: Question
  answer: Answer | undefined
  onChange: (a: Answer) => void
  /** Muestra la corrección y bloquea la respuesta. */
  revealed: boolean
  intento: number
  /** Autocorrección de las consignas de desarrollo. */
  onSelf?: (nota: number) => void
}

const LETRAS = 'abcdefghij'

export function QuestionView({ q, answer, onChange, revealed, intento, onSelf }: Props) {
  const parts = revealed ? corregir(q, answer).parts : []
  const caso = q.ctx ? casos[q.ctx] : undefined

  return (
    <article className="qz">
      <div className="qz-tags">
        <span className={`tag ${q.modalidad === 'parcial' ? 'clave' : ''}`}>{q.modalidad === 'parcial' ? 'Parcial real' : 'Pregunta nueva'}</span>
        <span className="tag">{formatoLabel[q.t]}</span>
        <span className="muted small">
          {q.unit.toUpperCase()} · {q.tema}
        </span>
      </div>
      {q.src && <p className="qz-src muted small">{q.src}</p>}

      {caso && (
        <details className="qz-case" open>
          <summary>Caso: {caso.titulo}</summary>
          <p>{caso.texto}</p>
        </details>
      )}

      <h2 className="qz-q">{q.q}</h2>

      {q.t === 'mc' && <Opciones q={q} answer={answer} onChange={onChange} revealed={revealed} intento={intento} />}
      {q.t === 'multi' && <Opciones q={q} answer={answer} onChange={onChange} revealed={revealed} intento={intento} />}
      {q.t === 'vf' && <VerdaderoFalso q={q} answer={answer} onChange={onChange} revealed={revealed} parts={parts} />}
      {q.t === 'rel' && <Relacionar q={q} answer={answer} onChange={onChange} revealed={revealed} parts={parts} />}
      {q.t === 'fill' && <Completar q={q} answer={answer} onChange={onChange} revealed={revealed} parts={parts} />}
      {q.t === 'tabla' && <Cuadro q={q} answer={answer} onChange={onChange} revealed={revealed} parts={parts} />}
      {q.t === 'dev' && <Desarrollo q={q} answer={answer} onChange={onChange} revealed={revealed} onSelf={onSelf} />}

      {revealed && (q.e || q.nota || q.inf) && (
        <div className="qz-feedback">
          {q.e && <p>{q.e}</p>}
          {q.inf && <p className="qz-inf">Clave inferida: no hay una corrección oficial que la confirme.</p>}
          {q.nota && <p className="muted small">{q.nota}</p>}
        </div>
      )}
    </article>
  )
}

type Sub<T extends Question['t']> = {
  q: Extract<Question, { t: T }>
  answer: Answer | undefined
  onChange: (a: Answer) => void
  revealed: boolean
}

function Opciones({ q, answer, onChange, revealed, intento }: Sub<'mc' | 'multi'> & { intento: number }) {
  const multiple = q.t === 'multi'
  const orden = useMemo(
    () => (sePuedeMezclar(q.o) ? ordenOpciones(q.id, q.o.length, intento) : q.o.map((_, i) => i)),
    [q.id, q.o, intento],
  )
  const correctas = q.t === 'multi' ? q.a : [q.a]
  const elegidas = multiple ? (answer?.ns ?? []) : answer?.n === undefined || answer.n === null ? [] : [answer.n]

  const elegir = (i: number) => {
    if (revealed) return
    if (!multiple) return onChange({ n: i })
    onChange({ ns: elegidas.includes(i) ? elegidas.filter((x) => x !== i) : [...elegidas, i] })
  }

  return (
    <>
      <p className="qz-hint muted small">{multiple ? 'Seleccione una o más de una.' : 'Seleccione una.'}</p>
      <ul className="qz-options">
        {orden.map((i, pos) => {
          const marcada = elegidas.includes(i)
          const estado = !revealed ? '' : correctas.includes(i) ? (marcada ? 'ok' : 'missed') : marcada ? 'bad' : ''
          return (
            <li key={i}>
              <button
                className={`qz-option ${marcada ? 'on' : ''} ${estado}`}
                onClick={() => elegir(i)}
                aria-pressed={marcada}
                disabled={revealed}
              >
                <span className={`qz-mark ${multiple ? 'square' : ''}`}>{LETRAS[pos]}</span>
                <span>{q.o[i]}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function VerdaderoFalso({ q, answer, onChange, revealed, parts }: Sub<'vf'> & { parts: boolean[] }) {
  const bs = answer?.bs ?? q.i.map(() => null)
  const set = (i: number, v: boolean) => {
    if (revealed) return
    onChange({ bs: bs.map((b, j) => (j === i ? v : b)) })
  }
  return (
    <ul className="qz-rows">
      {q.i.map(([texto, v, por], i) => (
        <li key={i} className={`qz-row ${revealed ? (parts[i] ? 'ok' : 'bad') : ''}`}>
          <div className="qz-row-text">
            <p>{texto}</p>
            {revealed && (
              <p className="small qz-explain">
                {v ? 'Verdadero' : 'Falso'}
                {por ? `. ${por}` : ''}
              </p>
            )}
          </div>
          <div className="segmented small">
            <button className={bs[i] === true ? 'on' : ''} onClick={() => set(i, true)} disabled={revealed}>
              V
            </button>
            <button className={bs[i] === false ? 'on' : ''} onClick={() => set(i, false)} disabled={revealed}>
              F
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Relacionar({ q, answer, onChange, revealed, parts }: Sub<'rel'> & { parts: boolean[] }) {
  const opciones = useMemo(() => opcionesRel(q), [q])
  const ss = answer?.ss ?? []
  const set = (i: number, v: string) => {
    const next = q.i.map((_, j) => (j === i ? v : (ss[j] ?? '')))
    onChange({ ss: next })
  }
  return (
    <ul className="qz-rows">
      {q.i.map(([texto, r], i) => (
        <li key={i} className={`qz-row wrap ${revealed ? (parts[i] ? 'ok' : 'bad') : ''}`}>
          <p className="qz-row-text">{texto}</p>
          <select className="qz-select" value={ss[i] ?? ''} onChange={(e) => set(i, e.target.value)} disabled={revealed}>
            <option value="">Elegir…</option>
            {opciones.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {revealed && !parts[i] && <p className="small qz-explain qz-full">Correcta: {r}</p>}
        </li>
      ))}
    </ul>
  )
}

function Completar({ q, answer, onChange, revealed, parts }: Sub<'fill'> & { parts: boolean[] }) {
  const ss = answer?.ss ?? []
  const set = (i: number, v: string) => onChange({ ss: q.i.map((_, j) => (j === i ? v : (ss[j] ?? ''))) })
  return (
    <ul className="qz-rows">
      {q.i.map(([texto, r], i) => {
        const [antes, despues] = texto.includes('___') ? texto.split('___') : [`${texto} `, '']
        return (
          <li key={i} className={`qz-row wrap ${revealed ? (parts[i] ? 'ok' : 'bad') : ''}`}>
            <p className="qz-fill">
              {antes}
              <input
                className="qz-input"
                value={ss[i] ?? ''}
                onChange={(e) => set(i, e.target.value)}
                disabled={revealed}
                aria-label={texto}
                autoComplete="off"
                spellCheck={false}
              />
              {despues}
            </p>
            {revealed && !parts[i] && <p className="small qz-explain qz-full">Correcta: {r}</p>}
          </li>
        )
      })}
    </ul>
  )
}

function Cuadro({ q, answer, onChange, revealed, parts }: Sub<'tabla'> & { parts: boolean[] }) {
  const ss = answer?.ss ?? []
  const total = celdasHueco(q).length
  const set = (i: number, v: string) => onChange({ ss: Array.from({ length: total }, (_, j) => (j === i ? v : (ss[j] ?? ''))) })

  let hueco = -1
  const celda = (c: Celda, key: number) => {
    if (typeof c === 'string') return <td key={key}>{c}</td>
    hueco += 1
    const i = hueco
    const estado = revealed ? (parts[i] ? 'ok' : 'bad') : ''
    return (
      <td key={key} className={`qz-cell ${estado}`}>
        {c.o ? (
          <select className="qz-select" value={ss[i] ?? ''} onChange={(e) => set(i, e.target.value)} disabled={revealed} aria-label="Completar celda">
            <option value="">Elegir…</option>
            {c.o.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="qz-input"
            value={ss[i] ?? ''}
            onChange={(e) => set(i, e.target.value)}
            disabled={revealed}
            aria-label="Completar celda"
            autoComplete="off"
            spellCheck={false}
          />
        )}
        {revealed && !parts[i] && <span className="small qz-explain">Correcta: {c.r}</span>}
      </td>
    )
  }

  return (
    <div className="qz-table-wrap">
      <table className="qz-table">
        <thead>
          <tr>
            {q.c.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.f.map((fila, r) => (
            <tr key={r}>{fila.map((c, k) => celda(c, k))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Desarrollo({ q, answer, onChange, revealed, onSelf }: Sub<'dev'> & { onSelf?: (n: number) => void }) {
  return (
    <div className="qz-dev">
      <textarea
        className="qz-textarea"
        rows={6}
        value={answer?.ss?.[0] ?? ''}
        onChange={(e) => onChange({ ...answer, ss: [e.target.value] })}
        disabled={revealed}
        placeholder="Escribí tu respuesta como en el parcial."
        aria-label="Tu respuesta"
      />
      {revealed && (
        <div className="qz-model">
          <h3>Respuesta modelo</h3>
          <p>{q.m}</p>
          {q.k && (
            <>
              <h3>Tiene que estar</h3>
              <ul>
                {q.k.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </>
          )}
          {onSelf && (
            <div className="qz-self">
              <span className="small muted">¿Cómo te fue?</span>
              <div className="segmented small">
                {[
                  ['Mal', 0],
                  ['A medias', 0.5],
                  ['Bien', 1],
                ].map(([label, nota]) => (
                  <button key={label} className={answer?.self === nota ? 'on' : ''} onClick={() => onSelf(nota as number)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
