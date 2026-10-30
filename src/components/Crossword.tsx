import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { CrosswordUnit } from '../crucigramas'
import { buildPuzzle, cellsOf, normalize, type Dir, type Entry, type PuzzleDef } from '../lib/crossword'
import { formatTime, getCrossword, saveCrossword } from '../lib/crosswordProgress'

interface Cursor {
  idx: number
  dir: Dir
}

const other = (d: Dir): Dir => (d === 'H' ? 'V' : 'H')

export function Crossword({ def, unit, index }: { def: PuzzleDef; unit: CrosswordUnit; index: number }) {
  const puzzle = useMemo(() => buildPuzzle(def), [def])
  const { rows, cols, solution, numbers, entries } = puzzle
  const flat = useMemo(() => solution.flat(), [solution])
  const sig = useMemo(() => flat.map((ch) => ch ?? '#').join(''), [flat])

  // Para cada celda, las palabras que pasan por ella y sus índices dentro de cada una.
  const byCell = useMemo(() => {
    const map: Partial<Record<Dir, Entry>>[] = flat.map(() => ({}))
    const cells = new Map<string, number[]>()
    for (const e of entries) {
      const idxs = cellsOf(e).map(([r, c]) => r * cols + c)
      cells.set(e.key, idxs)
      for (const i of idxs) map[i][e.dir] = e
    }
    return { map, cells }
  }, [entries, flat, cols])
  const cellsFor = (e: Entry) => byCell.cells.get(e.key)!

  const saved = getCrossword(def.id)
  const init = saved?.sig === sig ? saved : undefined
  const [fills, setFills] = useState<string[]>(() => (init ? [...init.fills] : flat.map(() => ' ')))
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(init?.revealed))
  const [elapsed, setElapsed] = useState(init?.elapsed ?? 0)
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const [cursor, setCursor] = useState<Cursor>(() => {
    const first = entries.find((e) => e.dir === 'H') ?? entries[0]
    return { idx: first.row * cols + first.col, dir: first.dir }
  })
  const [note, setNote] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRefs = useRef<Record<Dir, HTMLOListElement | null>>({ H: null, V: null })

  const isRight = (e: Entry) => cellsFor(e).every((i) => fills[i] === flat[i])
  const doneCount = entries.filter(isRight).length
  const solved = flat.every((ch, i) => ch === null || fills[i] === ch)

  const active = byCell.map[cursor.idx][cursor.dir] ?? byCell.map[cursor.idx][other(cursor.dir)]!
  const activeCells = new Set(cellsFor(active))
  const crossing = byCell.map[cursor.idx][other(active.dir)]

  // Guardado automático.
  useEffect(() => {
    const prev = getCrossword(def.id)
    const best = solved && revealed.size === 0 ? Math.min(prev?.best ?? Infinity, elapsed) : prev?.best
    saveCrossword(def.id, {
      sig,
      fills: fills.join(''),
      revealed: [...revealed],
      done: doneCount,
      total: entries.length,
      elapsed,
      solvedAt: solved ? (prev?.solvedAt ?? Date.now()) : undefined,
      best,
    })
  }, [fills, revealed, elapsed, solved])

  // Cronómetro: corre solo con la pestaña visible y mientras no esté resuelto.
  useEffect(() => {
    if (solved) return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') setElapsed((s) => s + 1)
    }, 1000)
    return () => clearInterval(t)
  }, [solved])

  const wasSolved = useRef(solved)
  useEffect(() => {
    if (solved && !wasSolved.current) setShowDone(true)
    wasSolved.current = solved
  }, [solved])

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(null), 2600)
    return () => clearTimeout(t)
  }, [note])

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  // Mantiene visible la pista activa dentro de su lista.
  useEffect(() => {
    for (const dir of ['H', 'V'] as Dir[]) {
      const list = listRefs.current[dir]
      const item = list?.querySelector<HTMLElement>('.cw-clue.active, .cw-clue.cross')
      if (!list || !item) continue
      const top = item.offsetTop - list.offsetTop
      if (top < list.scrollTop || top + item.offsetHeight > list.scrollTop + list.clientHeight)
        list.scrollTo({ top: top - list.clientHeight / 3, behavior: 'smooth' })
    }
  }, [active.key, crossing?.key])

  const focus = () => inputRef.current?.focus({ preventScroll: true })

  const goToEntry = (e: Entry) => {
    const idxs = cellsFor(e)
    setCursor({ idx: idxs.find((i) => fills[i] === ' ') ?? idxs[0], dir: e.dir })
    focus()
  }

  const entryOrder = useMemo(() => [...entries.filter((e) => e.dir === 'H'), ...entries.filter((e) => e.dir === 'V')], [entries])
  const nextEntry = (from: Entry, step: 1 | -1, onlyPending: boolean, f = fills) => {
    const start = entryOrder.indexOf(from)
    for (let k = 1; k <= entryOrder.length; k++) {
      const e = entryOrder[(start + step * k + entryOrder.length * k) % entryOrder.length]
      if (!onlyPending || cellsFor(e).some((i) => f[i] === ' ')) return e
    }
    return null
  }

  /** Después de escribir: siguiente celda vacía de la palabra o, si se llenó, la próxima palabra pendiente. */
  const advance = (f: string[]) => {
    const idxs = cellsFor(active)
    const pos = idxs.indexOf(cursor.idx)
    const nextEmpty = idxs.slice(pos + 1).find((i) => f[i] === ' ') ?? idxs.find((i) => f[i] === ' ')
    if (nextEmpty !== undefined) return setCursor({ idx: nextEmpty, dir: active.dir })
    const e = nextEntry(active, 1, true, f)
    if (e) {
      const ei = cellsFor(e)
      setCursor({ idx: ei.find((i) => f[i] === ' ') ?? ei[0], dir: e.dir })
    }
  }

  const type = (letter: string) => {
    if (solved) return
    const next = [...fills]
    if (!revealed.has(cursor.idx)) next[cursor.idx] = letter
    setFills(next)
    if (wrong.has(cursor.idx)) setWrong((w) => new Set([...w].filter((i) => i !== cursor.idx)))
    advance(next)
  }

  const erase = () => {
    if (solved) return
    const idxs = cellsFor(active)
    const pos = idxs.indexOf(cursor.idx)
    let target = cursor.idx
    if ((fills[target] === ' ' || revealed.has(target)) && pos > 0) target = idxs[pos - 1]
    if (revealed.has(target)) return setCursor({ idx: target, dir: active.dir })
    setFills((f) => f.map((ch, i) => (i === target ? ' ' : ch)))
    setWrong((w) => new Set([...w].filter((i) => i !== target)))
    setCursor({ idx: target, dir: active.dir })
  }

  const move = (dr: number, dc: number) => {
    const dir: Dir = dr === 0 ? 'H' : 'V'
    if (dir !== active.dir && byCell.map[cursor.idx][dir]) return setCursor({ idx: cursor.idx, dir })
    let r = Math.floor(cursor.idx / cols) + dr
    let c = (cursor.idx % cols) + dc
    while (r >= 0 && r < rows && c >= 0 && c < cols) {
      const i = r * cols + c
      if (flat[i] !== null) return setCursor({ idx: i, dir: byCell.map[i][dir] ? dir : other(dir) })
      r += dr
      c += dc
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const letter = e.key.length === 1 ? normalize(e.key) : ''
    if (letter) {
      e.preventDefault()
      return type(letter)
    }
    const actions: Record<string, () => void> = {
      Backspace: erase,
      Delete: erase,
      ArrowLeft: () => move(0, -1),
      ArrowRight: () => move(0, 1),
      ArrowUp: () => move(-1, 0),
      ArrowDown: () => move(1, 0),
      Tab: () => {
        const n = nextEntry(active, e.shiftKey ? -1 : 1, false)
        if (n) goToEntry(n)
      },
      ' ': () => crossing && setCursor({ idx: cursor.idx, dir: crossing.dir }),
      Enter: () => crossing && setCursor({ idx: cursor.idx, dir: crossing.dir }),
    }
    const action = actions[e.key]
    if (action) {
      e.preventDefault()
      action()
    }
  }

  // Teclados de celular que no informan la tecla en keydown: se lee lo que quedó escrito en el input.
  const onInput = (e: React.FormEvent<HTMLInputElement>) => {
    const v = normalize(e.currentTarget.value)
    e.currentTarget.value = ''
    if (v) type(v.at(-1)!)
  }

  const clickCell = (i: number) => {
    if (i === cursor.idx && byCell.map[i][other(cursor.dir)]) setCursor({ idx: i, dir: other(cursor.dir) })
    else setCursor({ idx: i, dir: byCell.map[i][cursor.dir] ? cursor.dir : other(cursor.dir) })
    focus()
  }

  const check = () => {
    const bad = flat.flatMap((ch, i) => (ch !== null && fills[i] !== ' ' && fills[i] !== ch ? [i] : []))
    setWrong(new Set(bad))
    const empty = flat.filter((ch, i) => ch !== null && fills[i] === ' ').length
    setNote(
      bad.length
        ? `${bad.length} ${bad.length === 1 ? 'letra mal' : 'letras mal'}: quedaron marcadas en rojo`
        : empty
          ? 'Todo lo que escribiste está bien'
          : 'Todo correcto',
    )
    focus()
  }

  const reveal = (idxs: number[]) => {
    if (solved) return
    const next = fills.map((ch, i) => (idxs.includes(i) ? flat[i]! : ch))
    setFills(next)
    setRevealed((r) => new Set([...r, ...idxs.filter((i) => fills[i] !== flat[i])]))
    setWrong((w) => new Set([...w].filter((i) => !idxs.includes(i))))
    if (idxs.length === 1) advance(next)
    focus()
  }

  const reset = () => {
    if (!confirmReset) return setConfirmReset(true)
    setConfirmReset(false)
    setFills(flat.map(() => ' '))
    setRevealed(new Set())
    setWrong(new Set())
    setElapsed(0)
    setShowDone(false)
    saveCrossword(def.id, null)
    goToEntry(entryOrder[0])
  }

  const prev = unit.puzzles[index - 1]
  const next = unit.puzzles[index + 1]
  const cr = Math.floor(cursor.idx / cols)
  const cc = cursor.idx % cols

  return (
    <main className="page page-wide">
      <div className="view-head cw-head">
        <div>
          <a className="back" href="#/cruci">
            ← Crucigramas
          </a>
          <h1 className="title">{def.title}</h1>
          <div className="view-meta">
            <span>
              {unit.unit} · {index + 1} de {unit.puzzles.length}
            </span>
            <span className="sep" />
            <span>
              {doneCount}/{entries.length} palabras
            </span>
            <span className="sep" />
            <span className="timer">{formatTime(elapsed)}</span>
            {revealed.size > 0 && (
              <>
                <span className="sep" />
                <span>
                  {revealed.size} {revealed.size === 1 ? 'letra revelada' : 'letras reveladas'}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="head-actions">
          {prev && (
            <a className="btn" href={`#/cruci/${prev.id}`}>
              ← Anterior
            </a>
          )}
          {next && (
            <a className="btn" href={`#/cruci/${next.id}`}>
              Siguiente →
            </a>
          )}
        </div>
      </div>

      <div className="cw-clue-bar" aria-live="polite">
        <span className="cw-clue-key">
          {active.num}
          {active.dir}
        </span>
        <span className="cw-clue-text">{active.clue}</span>
        <span className="cw-clue-len muted">{active.answer.length} letras</span>
      </div>

      <div className="cw-layout">
        <div className="cw-board-col">
          <div
            className={`cw-board ${solved ? 'solved' : ''}`}
            style={{ '--cols': cols, '--rows': rows } as CSSProperties}
            onMouseDown={(e) => e.preventDefault()}
          >
            {flat.map((ch, i) => {
              if (ch === null) return <span key={i} className="cw-cell void" />
              const r = Math.floor(i / cols)
              const c = i % cols
              const cls = [
                'cw-cell',
                activeCells.has(i) && 'word',
                i === cursor.idx && 'cursor',
                wrong.has(i) && 'wrong',
                revealed.has(i) && 'revealed',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <span key={i} className={cls} onClick={() => clickCell(i)} style={{ animationDelay: `${(r + c) * 22}ms` }}>
                  {numbers[r][c] && <span className="cw-num">{numbers[r][c]}</span>}
                  <span className="cw-letter">{fills[i].trim()}</span>
                </span>
              )
            })}
            <input
              ref={inputRef}
              className="cw-input"
              style={{ top: `${(cr / rows) * 100}%`, left: `${(cc / cols) * 100}%` }}
              aria-label={`${active.num} ${active.dir === 'H' ? 'horizontal' : 'vertical'}: ${active.clue}`}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={onKeyDown}
              onInput={onInput}
            />
          </div>

          <div className="cw-tools">
            <button className="btn" onClick={check} disabled={solved}>
              Comprobar
            </button>
            <button className="btn" onClick={() => reveal([cursor.idx])} disabled={solved}>
              Revelar letra
            </button>
            <button className="btn" onClick={() => reveal(cellsFor(active))} disabled={solved}>
              Revelar palabra
            </button>
            <button className={`btn ${confirmReset ? 'danger' : ''}`} onClick={reset} onBlur={() => setConfirmReset(false)}>
              {confirmReset ? '¿Seguro? Borrar todo' : 'Reiniciar'}
            </button>
          </div>
          <p className="cw-hints muted small">
            Escribí directo sobre la grilla. <kbd>Espacio</kbd> cambia de dirección, <kbd>Tab</kbd> pasa a la siguiente
            palabra y las flechas te mueven.
          </p>
        </div>

        <div className="cw-clues">
          {(['H', 'V'] as Dir[]).map((dir) => (
            <section key={dir} className="cw-clue-col">
              <h2 className="cw-clue-title">{dir === 'H' ? 'Horizontales' : 'Verticales'}</h2>
              <ol className="cw-clue-list" ref={(el) => (listRefs.current[dir] = el)}>
                {entries
                  .filter((e) => e.dir === dir)
                  .map((e) => (
                    <li key={e.key}>
                      <button
                        className={[
                          'cw-clue',
                          e === active && 'active',
                          e === crossing && 'cross',
                          isRight(e) && 'done',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => goToEntry(e)}
                      >
                        <span className="cw-clue-n">{e.num}</span>
                        <span>{e.clue}</span>
                      </button>
                    </li>
                  ))}
              </ol>
            </section>
          ))}
        </div>
      </div>

      {note && <div className="toast">{note}</div>}

      {showDone && (
        <div className="overlay" onClick={() => setShowDone(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">
              {unit.unit} · Crucigrama {index + 1}
            </p>
            <h2 className="verdict cw-verdict">Resuelto.</h2>
            <div className="breakdown">
              <span>
                <span className="dot ok" /> {entries.length} palabras
              </span>
              <span>{formatTime(elapsed)}</span>
              <span>
                <span className={`dot ${revealed.size ? 'helped' : 'ok'}`} />
                {revealed.size ? `${revealed.size} letras reveladas` : 'Sin ayudas'}
              </span>
            </div>
            <div className="sheet-actions">
              <button className="btn" onClick={() => setShowDone(false)}>
                Ver grilla
              </button>
              <button className="btn" onClick={reset}>
                {confirmReset ? '¿Seguro?' : 'Hacerlo de nuevo'}
              </button>
              {next ? (
                <a className="btn primary" href={`#/cruci/${next.id}`}>
                  Siguiente →
                </a>
              ) : (
                <a className="btn primary" href="#/cruci">
                  Volver al listado
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
