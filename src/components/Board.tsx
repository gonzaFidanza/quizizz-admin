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
        style={{ width: `${p.zoom * 100}%`, ['--fs' as string]: W ? `max(10px, ${(fs / W) * 100}cqw)` : '13px' }}
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
