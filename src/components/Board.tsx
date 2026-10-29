import { useState, type MutableRefObject } from 'react'
import { hintMask } from '../lib/match'
import type { Diagram } from '../lib/types'
import { outcomeOf, type Cell, type Mode } from './DiagramView'

interface Props {
  diagram: Diagram
  mode: Mode
  ids: string[]
  cells: Record<string, Cell>
  covered: Set<string>
  hoverId: string | null
  focusId: string | null
  zoom: number
  submitted: boolean
  inputs: MutableRefObject<Record<string, HTMLTextAreaElement | null>>
  onToggleCover: (id: string) => void
  onChange: (id: string, value: string) => void
  onSubmit: (id: string) => void
  onHint: (id: string) => void
  onReveal: (id: string) => void
  onFocus: (id: string | null) => void
}

export function Board(p: Props) {
  const { config } = p.diagram
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const W = config.width ?? natural?.w
  const H = config.height ?? natural?.h
  const minH = Math.min(...config.blanks.map((b) => b.h), 40)
  const fs = config.fontSize ?? Math.min(14, Math.max(9, minH * 0.72))
  const size = W && H ? boardWidth(W, H, config.blanks, p.zoom) : `${p.zoom * 100}%`

  // Los huecos de la mitad derecha se anclan a la derecha, así al agrandarse con el foco no se salen de la imagen.
  const pos = (b: { x: number; y: number; w: number; h: number }) =>
    W && H
      ? {
          ...(b.x + b.w / 2 > W / 2 ? { right: `${((W - b.x - b.w) / W) * 100}%` } : { left: `${(b.x / W) * 100}%` }),
          top: `${(b.y / H) * 100}%`,
          width: `${(b.w / W) * 100}%`,
          height: `${(b.h / H) * 100}%`,
        }
      : { display: 'none' }

  const inSession = new Set(p.ids)

  return (
    <div className="board-scroll">
      <div
        className={`board mode-${p.mode}`}
        style={{ width: size, ['--fs' as string]: W ? `clamp(12px, ${(fs / W) * 100}cqw, 16px)` : '13px' }}
      >
        <img
          src={p.diagram.image}
          alt={p.diagram.title}
          draggable={false}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
        {config.blanks
          .filter((b) => inSession.has(b.id))
          .map((b) => {
            const n = p.ids.indexOf(b.id) + 1

            if (p.mode === 'study') {
              const isCovered = p.covered.has(b.id)
              return (
                <button
                  key={b.id}
                  className={`blank study ${isCovered ? 'covered' : ''} ${p.hoverId === b.id ? 'hover' : ''}`}
                  style={pos(b)}
                  onClick={() => p.onToggleCover(b.id)}
                  aria-label={isCovered ? `Mostrar concepto ${n}` : `Tapar concepto ${n}: ${b.answer}`}
                >
                  <span className="badge">{n}</span>
                  {isCovered && <span className="cover-q">?</span>}
                </button>
              )
            }

            const c = p.cells[b.id]
            const o = outcomeOf(c)
            const lockedExam = p.mode === 'exam' && p.submitted
            const final = c?.final || lockedExam
            const state = !final ? (c?.attempts && c.grade === 'bad' ? 'wrong' : 'open') : o === 'miss' ? 'miss' : c?.grade === 'close' || o === 'helped' ? 'close' : 'ok'

            return (
              <div
                key={b.id}
                className={`blank input ${state} ${p.focusId === b.id ? 'focus' : ''}`}
                style={pos(b)}
                onClick={() => p.inputs.current[b.id]?.focus()}
              >
                <span className="badge">{n}</span>
                <textarea
                  ref={(el) => (p.inputs.current[b.id] = el)}
                  className={c?.shake && state === 'wrong' ? `shake-${c.shake % 2}` : ''}
                  value={state === 'miss' ? b.answer : (c?.value ?? '')}
                  placeholder={c?.hint ? hintMask(b.answer, c.hint) : ''}
                  readOnly={final}
                  spellCheck={false}
                  autoComplete="off"
                  rows={1}
                  aria-label={`Hueco ${n}`}
                  onChange={(e) => p.onChange(b.id, e.target.value.replace(/\n/g, ''))}
                  onFocus={() => p.onFocus(b.id)}
                  onBlur={() => p.onFocus(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      p.onSubmit(b.id)
                    } else if (e.key === 'Escape') {
                      e.currentTarget.blur()
                    } else if (e.altKey && e.code === 'KeyP') {
                      e.preventDefault()
                      p.onHint(b.id)
                    } else if (e.altKey && e.code === 'KeyR') {
                      e.preventDefault()
                      p.onReveal(b.id)
                    }
                  }}
                />
                {(state === 'ok' || state === 'close') && (
                  <span className="tick" aria-hidden>
                    <svg viewBox="0 0 16 16" width="10" height="10">
                      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

/** Alto en pantalla al que apunta un hueco típico: grande para leer, sin que el input quede gigante. */
const TARGET_BLANK_PX = 44
const MIN_SCALE = 0.6
const MAX_SCALE = 2.5
/** Lo que ocupan barra superior, título y herramientas, para que el gráfico entre en pantalla. */
const CHROME_PX = 230
/** Ningún gráfico se muestra más angosto que esto (salvo en pantallas chicas). */
const MIN_PX = 440

/**
 * Ancho del gráfico en modo «Ajustar». Sirve para cualquier imagen, sea un recorte chico o un escaneo grande:
 * se escala según el tamaño de sus textos (no según el ancho disponible), y nunca pasa del ancho del panel
 * ni del alto de la pantalla. El zoom multiplica ese tamaño.
 */
function boardWidth(W: number, H: number, blanks: { h: number }[], zoom: number) {
  const hs = blanks.map((b) => b.h).sort((a, b) => a - b)
  const median = hs.length ? hs[Math.floor(hs.length / 2)] : 30
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, TARGET_BLANK_PX / median))
  const byText = Math.round(W * scale)
  const byHeight = `calc((100vh - ${CHROME_PX}px) * ${(W / H).toFixed(4)})`
  return `calc(max(min(${MIN_PX}px, 100%), min(${byText}px, 100%, ${byHeight})) * ${zoom})`
}
