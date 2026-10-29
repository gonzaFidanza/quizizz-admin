import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { levelOf } from '../lib/diagrams'
import type { Blank, Diagram, DiagramConfig } from '../lib/types'

type Drag = { kind: 'new' | 'move' | 'resize'; id: string; sx: number; sy: number; orig: Blank }

export function Editor({ diagram }: { diagram: Diagram }) {
  const [cfg, setCfg] = useState<DiagramConfig>(() => ({ title: diagram.title, ...structuredClone(diagram.config) }))
  const [sel, setSel] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)

  const W = natural?.w ?? cfg.width ?? 1
  const H = natural?.h ?? cfg.height ?? 1
  const selected = cfg.blanks.find((b) => b.id === sel)

  const setBlanks = (fn: (bs: Blank[]) => Blank[]) => {
    setCfg((c) => ({ ...c, blanks: fn(c.blanks) }))
    setDirty(true)
  }
  const patch = (id: string, p: Partial<Blank>) => setBlanks((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)))

  const toNative = (e: { clientX: number; clientY: number }) => {
    const r = boardRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(W, ((e.clientX - r.left) / r.width) * W)),
      y: Math.max(0, Math.min(H, ((e.clientY - r.top) / r.height) * H)),
    }
  }

  const newId = () => `b${Math.max(0, ...cfg.blanks.map((b) => Number(b.id.replace(/\D/g, '')) || 0)) + 1}`

  const onBoardDown = (e: RPointerEvent) => {
    if (e.button !== 0) return
    const { x, y } = toNative(e)
    const b: Blank = { id: newId(), x: Math.round(x), y: Math.round(y), w: 0, h: 0, answer: '', level: 'clave' }
    setBlanks((bs) => [...bs, b])
    setSel(b.id)
    drag.current = { kind: 'new', id: b.id, sx: x, sy: y, orig: b }
    boardRef.current!.setPointerCapture(e.pointerId)
  }

  const onRectDown = (e: RPointerEvent, b: Blank, kind: 'move' | 'resize') => {
    if (e.button !== 0) return
    e.stopPropagation()
    const { x, y } = toNative(e)
    setSel(b.id)
    drag.current = { kind, id: b.id, sx: x, sy: y, orig: b }
    boardRef.current!.setPointerCapture(e.pointerId)
  }

  const onMove = (e: RPointerEvent) => {
    const d = drag.current
    if (!d) return
    const { x, y } = toNative(e)
    const dx = x - d.sx
    const dy = y - d.sy
    const o = d.orig
    if (d.kind === 'new') {
      patch(d.id, { x: Math.round(Math.min(d.sx, x)), y: Math.round(Math.min(d.sy, y)), w: Math.round(Math.abs(dx)), h: Math.round(Math.abs(dy)) })
    } else if (d.kind === 'move') {
      patch(d.id, { x: Math.round(Math.max(0, Math.min(W - o.w, o.x + dx))), y: Math.round(Math.max(0, Math.min(H - o.h, o.y + dy))) })
    } else {
      patch(d.id, { w: Math.round(Math.max(6, o.w + dx)), h: Math.round(Math.max(6, o.h + dy)) })
    }
  }

  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (d?.kind === 'new') {
      const b = cfg.blanks.find((x) => x.id === d.id)
      if (!b || b.w < 5 || b.h < 5) {
        setBlanks((bs) => bs.filter((x) => x.id !== d.id))
        setSel(null)
      } else {
        requestAnimationFrame(() => document.getElementById('answer-input')?.focus())
      }
    }
  }

  const remove = (id: string) => {
    setBlanks((bs) => bs.filter((b) => b.id !== id))
    setSel(null)
  }

  const moveOrder = (id: string, dir: -1 | 1) =>
    setBlanks((bs) => {
      const i = bs.findIndex((b) => b.id === id)
      const j = i + dir
      if (j < 0 || j >= bs.length) return bs
      const next = [...bs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!sel || (e.target as HTMLElement).closest('input, textarea')) return
      const step = e.shiftKey ? 10 : 1
      const b = cfg.blanks.find((x) => x.id === sel)
      if (!b) return
      const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key]
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        remove(sel)
      } else if (delta) {
        e.preventDefault()
        const [dx, dy] = delta
        patch(sel, e.altKey ? { w: Math.max(6, b.w + dx), h: Math.max(6, b.h + dy) } : { x: b.x + dx, y: b.y + dy })
      } else if (e.key === 'Escape') setSel(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const output = (): DiagramConfig => ({
    title: cfg.title,
    topic: cfg.topic || undefined,
    width: W,
    height: H,
    ...(cfg.fontSize ? { fontSize: cfg.fontSize } : {}),
    ...(cfg.order !== undefined ? { order: cfg.order } : {}),
    blanks: cfg.blanks
      .filter((b) => b.answer.trim())
      .map((b) => ({ ...b, accept: b.accept?.filter((a) => a.trim()).length ? b.accept.filter((a) => a.trim()) : undefined })),
  })

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const save = async () => {
    try {
      const res = await fetch('/__save-grafico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: diagram.file, config: output() }),
      })
      if (!res.ok) throw new Error(await res.text())
      setDirty(false)
      flash(`Guardado en src/graficos/${diagram.file}.json`)
    } catch {
      await copy()
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(output(), null, 2))
    flash(`JSON copiado. Pegalo en src/graficos/${diagram.file}.json`)
  }

  return (
    <main className="page page-wide">
      <section className="view-head">
        <div>
          <a href={diagram.configured ? `#/g/${diagram.id}` : '#/'} className="back">
            ← {diagram.configured ? 'Volver al gráfico' : 'Gráficos'}
          </a>
          <h1 className="title">Editor de huecos</h1>
          <p className="muted">Arrastrá sobre la imagen para tapar un texto. Escribí la respuesta y guardá.</p>
        </div>
        <div className="head-actions">
          <button className="btn ghost" onClick={copy}>
            Copiar JSON
          </button>
          <button className="btn primary" onClick={save}>
            {dirty ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </section>

      <div className="workspace">
        <div className="board-wrap">
          <div className="board-scroll">
            <div
              ref={boardRef}
              className="board editor"
              onPointerDown={onBoardDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
            >
              <img
                src={diagram.image}
                alt=""
                draggable={false}
                onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              />
              {cfg.blanks.map((b, i) => (
                <div
                  key={b.id}
                  className={`edit-rect ${levelOf(b)} ${sel === b.id ? 'sel' : ''} ${b.answer.trim() ? '' : 'empty'}`}
                  style={{ left: `${(b.x / W) * 100}%`, top: `${(b.y / H) * 100}%`, width: `${(b.w / W) * 100}%`, height: `${(b.h / H) * 100}%` }}
                  onPointerDown={(e) => onRectDown(e, b, 'move')}
                  title={b.answer}
                >
                  <span className="badge">{i + 1}</span>
                  <span className="handle" onPointerDown={(e) => onRectDown(e, b, 'resize')} />
                </div>
              ))}
            </div>
          </div>
          <p className="kbd-hints">
            Arrastrá para crear · <kbd>←</kbd>
            <kbd>→</kbd>
            <kbd>↑</kbd>
            <kbd>↓</kbd> mover (<kbd>Shift</kbd> ×10, <kbd>Alt</kbd> redimensionar) · <kbd>Supr</kbd> borrar
          </p>
        </div>

        <aside className="panel">
          <label className="field">
            <span>Título</span>
            <input value={cfg.title ?? ''} onChange={(e) => (setCfg({ ...cfg, title: e.target.value }), setDirty(true))} />
          </label>
          <label className="field">
            <span>Tema</span>
            <input value={cfg.topic ?? ''} placeholder="Ej: Recursos Humanos" onChange={(e) => (setCfg({ ...cfg, topic: e.target.value }), setDirty(true))} />
          </label>

          {selected ? (
            <div className="edit-box">
              <div className="panel-head">
                <h2 className="panel-title">Hueco {cfg.blanks.indexOf(selected) + 1}</h2>
                <div className="mini-actions">
                  <button className="icon-btn" onClick={() => moveOrder(selected.id, -1)} title="Antes en el orden">
                    ↑
                  </button>
                  <button className="icon-btn" onClick={() => moveOrder(selected.id, 1)} title="Después en el orden">
                    ↓
                  </button>
                </div>
              </div>
              <label className="field">
                <span>Respuesta</span>
                <input id="answer-input" value={selected.answer} placeholder="Texto que hay que completar" onChange={(e) => patch(selected.id, { answer: e.target.value })} />
              </label>
              <label className="field">
                <span>También se acepta (una por línea)</span>
                <textarea
                  rows={2}
                  value={(selected.accept ?? []).join('\n')}
                  onChange={(e) => patch(selected.id, { accept: e.target.value.split('\n') })}
                />
              </label>
              <div className="field">
                <span>Importancia</span>
                <div className="segmented">
                  <button className={levelOf(selected) === 'clave' ? 'on' : ''} onClick={() => patch(selected.id, { level: 'clave' })}>
                    Clave
                  </button>
                  <button className={levelOf(selected) === 'extra' ? 'on' : ''} onClick={() => patch(selected.id, { level: 'extra' })}>
                    Extra
                  </button>
                </div>
              </div>
              <button className="btn danger" onClick={() => remove(selected.id)}>
                Borrar hueco
              </button>
            </div>
          ) : (
            <p className="muted small">Seleccioná un hueco para editarlo, o arrastrá sobre la imagen para crear uno nuevo.</p>
          )}

          <ol className="list compact">
            {cfg.blanks.map((b, i) => (
              <li key={b.id} className={`row ${sel === b.id ? 'current' : ''}`}>
                <button className="row-btn" onClick={() => setSel(b.id)}>
                  <span className="num">{i + 1}</span>
                  <span className="row-text">{b.answer || <span className="muted">Sin respuesta</span>}</span>
                  <span className={`tag ${levelOf(b)}`}>{levelOf(b)}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}
