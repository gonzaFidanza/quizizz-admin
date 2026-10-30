import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  mindMaps,
  resolveRef,
  sectionsOf,
  type Block,
  type Branch,
  type Excerpt,
  type Leaf,
  type MindMapDef,
  type Section,
} from '../mapas'

type Side = 'left' | 'right'

/** Qué está abierto en el panel: un concepto ("l0/2"), una rama ("l0") o el centro del mapa. */
type Selection = { kind: 'leaf'; key: string } | { kind: 'branch'; key: string } | { kind: 'center' } | null

interface Item {
  key: string
  leaf: Leaf
  branch: Branch
  branchKey: string
  side: Side
}

interface Line {
  key: string
  d: string
  /** Rama a la que pertenece la línea, para resaltarla junto con lo seleccionado. */
  branchKey: string
  leafKey?: string
  dot?: [number, number]
}

const branchKeyOf = (side: Side, bi: number) => `${side[0]}${bi}`

export function MindMap({ map }: { map: MindMapDef }) {
  const items = useMemo<Item[]>(
    () =>
      (['left', 'right'] as const).flatMap((side) =>
        map[side].flatMap((branch, bi) =>
          branch.leaves.map((leaf, li) => ({
            key: `${branchKeyOf(side, bi)}/${li}`,
            leaf,
            branch,
            branchKey: branchKeyOf(side, bi),
            side,
          })),
        ),
      ),
    [map],
  )
  const [sel, setSel] = useState<Selection>(null)
  const nodes = useRef(new Map<string, HTMLElement>())
  const wrapRef = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<{ w: number; h: number; list: Line[] }>({ w: 0, h: 0, list: [] })

  const reg = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el)
      else nodes.current.delete(key)
    },
    [],
  )

  // Las líneas se dibujan midiendo dónde quedó cada elemento, así acompañan cualquier ancho de pantalla.
  const measure = useCallback(() => {
    const wrap = wrapRef.current
    const center = nodes.current.get('c')
    if (!wrap || !center) return
    const box = wrap.getBoundingClientRect()
    const rel = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return { l: r.left - box.left, r: r.right - box.left, cy: r.top - box.top + r.height / 2 }
    }
    const curve = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = (x2 - x1) / 2
      return `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`
    }
    const c = rel(center)
    const list: Line[] = []
    for (const side of ['left', 'right'] as const) {
      map[side].forEach((branch, bi) => {
        const bk = branchKeyOf(side, bi)
        const label = nodes.current.get(`b:${bk}`)
        const col = nodes.current.get(`col:${bk}`)
        if (!label || !col) return
        const b = rel(label)
        const k = rel(col)
        const trunkFrom = side === 'left' ? c.l : c.r
        const trunkTo = side === 'left' ? b.r + 8 : b.l - 8
        list.push({ key: `t:${bk}`, d: curve(trunkFrom, c.cy, trunkTo, b.cy), branchKey: bk })
        const from = side === 'left' ? b.l - 8 : b.r + 8
        const to = side === 'left' ? k.r + 6 : k.l - 6
        branch.leaves.forEach((_, li) => {
          const leafKey = `${bk}/${li}`
          const el = nodes.current.get(`f:${leafKey}`)
          if (!el) return
          const y = rel(el).cy
          list.push({ key: `f:${leafKey}`, d: curve(from, b.cy, to, y), branchKey: bk, leafKey, dot: [to, y] })
        })
      })
    }
    setLines({ w: box.width, h: box.height, list })
  }, [map])

  useLayoutEffect(() => {
    measure()
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(wrap)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [measure])

  const index = sel?.kind === 'leaf' ? items.findIndex((i) => i.key === sel.key) : -1
  const current = index >= 0 ? items[index] : undefined
  const step = useCallback(
    (d: number) => {
      if (index < 0) return
      const next = items[(index + d + items.length) % items.length]
      setSel({ kind: 'leaf', key: next.key })
      nodes.current.get(`f:${next.key}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    },
    [index, items],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') setSel(null)
      else if (index >= 0 && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
        e.preventDefault()
        step(1)
      } else if (index >= 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault()
        step(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, step])

  const activeBranch = sel?.kind === 'branch' ? sel.key : current?.branchKey
  const toggle = (next: Exclude<Selection, null>) =>
    setSel((s) => (s && s.kind === next.kind && (s.kind === 'center' || ('key' in next && s.key === next.key)) ? null : next))

  // El panel se abre del lado opuesto a lo que se tocó, para no tapar el concepto.
  const drawerSide: Side = sel?.kind === 'leaf' ? (current?.side === 'right' ? 'left' : 'right') : sel?.kind === 'branch' && sel.key.startsWith('r') ? 'left' : 'right'

  const pos = mindMaps.indexOf(map)
  const unitMaps = mindMaps.filter((m) => m.unit === map.unit)
  const prev = mindMaps[pos - 1]
  const next = mindMaps[pos + 1]

  const renderBranch = (side: Side, branch: Branch, bi: number) => {
    const bk = branchKeyOf(side, bi)
    const leaves = (
      <ul className="mm-leaves" ref={reg(`col:${bk}`)}>
        {branch.leaves.map((leaf, li) => {
          const key = `${bk}/${li}`
          const on = sel?.kind === 'leaf' && sel.key === key
          return (
            <li key={key}>
              <button
                ref={reg(`f:${key}`)}
                className={`mm-leaf ${on ? 'on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle({ kind: 'leaf', key })}
              >
                {leaf.term && <b>{leaf.term}</b>}
                {leaf.term ? ': ' : ''}
                {leaf.text}
              </button>
            </li>
          )
        })}
      </ul>
    )
    const label = (
      <button
        ref={reg(`b:${bk}`)}
        className={`mm-label ${activeBranch === bk ? 'on' : ''}`}
        aria-pressed={sel?.kind === 'branch' && sel.key === bk}
        onClick={() => toggle({ kind: 'branch', key: bk })}
      >
        {branch.label}
      </button>
    )
    return (
      <div key={bk} className={`mm-branch ${side}`}>
        {side === 'left' ? (
          <>
            {leaves}
            {label}
          </>
        ) : (
          <>
            {label}
            {leaves}
          </>
        )}
      </div>
    )
  }

  return (
    <main className="page page-wide mm-page">
      <div className="view-head mm-head">
        <div>
          <a className="back" href="#/mapas">
            ← Mapas mentales
          </a>
          <h1 className="title">
            <span className="mm-num">{map.num}</span> {map.title}
          </h1>
          <div className="view-meta">
            <span>{map.unit.toUpperCase()}</span>
            <span className="sep" />
            <span>
              Mapa {unitMaps.indexOf(map) + 1} de {unitMaps.length}
            </span>
            <span className="sep" />
            <span>{items.length} conceptos</span>
          </div>
        </div>
        <div className="head-actions">
          {prev && (
            <a className="btn" href={`#/mapas/${prev.id}`} title={prev.title}>
              ← Anterior
            </a>
          )}
          {next && (
            <a className="btn" href={`#/mapas/${next.id}`} title={next.title}>
              Siguiente →
            </a>
          )}
        </div>
      </div>

      <div className="toolbar mm-toolbar">
        <p className="mm-subtitle">{map.subtitle}</p>
        <p className="muted small mm-hint">
          Tocá un concepto para leer su definición del apunte. Con <kbd>←</kbd> <kbd>→</kbd> pasás al siguiente y con{' '}
          <kbd>Esc</kbd> cerrás.
        </p>
      </div>

      <div className="mm" ref={wrapRef}>
        <svg className="mm-lines" width={lines.w} height={lines.h} aria-hidden>
          {lines.list.map((l) => {
            const hot =
              sel?.kind === 'center' ||
              (sel?.kind === 'branch' && sel.key === l.branchKey) ||
              (sel?.kind === 'leaf' && (l.leafKey ? l.leafKey === sel.key : l.branchKey === current?.branchKey))
            return (
              <g key={l.key} className={hot ? 'hot' : ''}>
                <path d={l.d} />
                {l.dot && <circle cx={l.dot[0]} cy={l.dot[1]} r={2.2} />}
              </g>
            )
          })}
        </svg>
        <div className="mm-side left">{map.left.map((b, bi) => renderBranch('left', b, bi))}</div>
        <button
          ref={reg('c')}
          className={`mm-center ${sel?.kind === 'center' ? 'on' : ''}`}
          aria-pressed={sel?.kind === 'center'}
          onClick={() => toggle({ kind: 'center' })}
        >
          <span className="mm-kicker">{map.kicker}</span>
          <span className="mm-center-title">{map.center}</span>
        </button>
        <div className="mm-side right">{map.right.map((b, bi) => renderBranch('right', b, bi))}</div>
      </div>

      {map.recordar && (
        <p className="mm-recordar">
          <b>Para recordar</b> {map.recordar}
        </p>
      )}

      {sel && (
        <aside className={`mm-drawer ${drawerSide}`} role="dialog" aria-label="Detalle del apunte">
          {sel.kind === 'leaf' && current ? (
            <LeafDetail
              key={current.key}
              item={current}
              position={`${index + 1} / ${items.length}`}
              onStep={step}
              onClose={() => setSel(null)}
            />
          ) : sel.kind === 'branch' ? (
            <BranchDetail
              key={sel.key}
              branch={map[sel.key.startsWith('l') ? 'left' : 'right'][Number(sel.key.slice(1))]}
              onLeaf={(li) => setSel({ kind: 'leaf', key: `${sel.key}/${li}` })}
              onClose={() => setSel(null)}
            />
          ) : (
            <CenterDetail map={map} onBranch={(key) => setSel({ kind: 'branch', key })} onClose={() => setSel(null)} />
          )}
        </aside>
      )}
    </main>
  )
}

/* ───────────── Panel ───────────── */

function DrawerHead({ kicker, children, onClose }: { kicker: string; children?: ReactNode; onClose: () => void }) {
  return (
    <div className="mm-d-head">
      <span className="mm-d-kicker">{kicker}</span>
      <div className="mm-d-actions">
        {children}
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)">
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function LeafDetail({
  item,
  position,
  onStep,
  onClose,
}: {
  item: Item
  position: string
  onStep: (d: number) => void
  onClose: () => void
}) {
  const { leaf, branch } = item
  const excerpts = leaf.refs.map(resolveRef).filter((x): x is Excerpt => !!x)
  // Agrupa los fragmentos consecutivos de una misma sección bajo un solo encabezado.
  const groups: { section: Section; items: Excerpt[] }[] = []
  for (const x of excerpts) {
    const last = groups.at(-1)
    if (last?.section === x.section) last.items.push(x)
    else groups.push({ section: x.section, items: [x] })
  }
  const mark = leaf.term || leaf.text

  return (
    <>
      <DrawerHead kicker={branch.label} onClose={onClose}>
        <span className="mm-d-pos small muted">{position}</span>
        <button className="icon-btn" onClick={() => onStep(-1)} aria-label="Concepto anterior" title="Anterior (←)">
          ‹
        </button>
        <button className="icon-btn" onClick={() => onStep(1)} aria-label="Concepto siguiente" title="Siguiente (→)">
          ›
        </button>
      </DrawerHead>
      <div className="mm-d-body">
        <h2 className="mm-d-title">{leaf.term || leaf.text}</h2>
        {leaf.term && (
          <p className="mm-d-map">
            <span className="mm-d-tag">En el mapa</span> {leaf.text}
          </p>
        )}
        {groups.map((g) => (
          <SectionExcerpts key={g.section.id} section={g.section} items={g.items} mark={mark} />
        ))}
      </div>
    </>
  )
}

function SectionExcerpts({ section, items, mark }: { section: Section; items: Excerpt[]; mark: string }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="mm-x-group">
      <SourceLine section={section} />
      {open ? (
        <FullSection section={section} refs={items.map((x) => x.ref)} mark={mark} />
      ) : (
        items.map((x) => <ExcerptView key={x.ref} x={x} mark={mark} />)
      )}
      <button className="mm-more" onClick={() => setOpen((o) => !o)}>
        {open ? 'Ver solo lo del concepto' : 'Ver la sección completa del apunte'}
      </button>
    </section>
  )
}

function SourceLine({ section }: { section: Section }) {
  return (
    <p className="mm-src">
      <span className="mm-d-tag">Apunte</span> {section.title}
      <span className="muted">
        {' '}
        · p. {section.page}
        {section.orig && ` (original: ${section.orig})`}
      </span>
    </p>
  )
}

function BranchDetail({ branch, onLeaf, onClose }: { branch: Branch; onLeaf: (li: number) => void; onClose: () => void }) {
  return (
    <>
      <DrawerHead kicker="Rama" onClose={onClose} />
      <div className="mm-d-body">
        <h2 className="mm-d-title">{branch.label}</h2>
        <ul className="mm-d-list">
          {branch.leaves.map((l, li) => (
            <li key={li}>
              <button onClick={() => onLeaf(li)}>
                {l.term && <b>{l.term}</b>}
                {l.term ? ': ' : ''}
                {l.text}
              </button>
            </li>
          ))}
        </ul>
        <SectionList sections={sectionsOf(branch.leaves)} refs={branch.leaves.flatMap((l) => l.refs)} />
      </div>
    </>
  )
}

function CenterDetail({ map, onBranch, onClose }: { map: MindMapDef; onBranch: (key: string) => void; onClose: () => void }) {
  const all = [...map.left, ...map.right]
  return (
    <>
      <DrawerHead kicker={map.kicker} onClose={onClose} />
      <div className="mm-d-body">
        <h2 className="mm-d-title">{map.center}</h2>
        <p className="mm-d-map">{map.subtitle}</p>
        <ul className="mm-d-list">
          {(['left', 'right'] as const).flatMap((side) =>
            map[side].map((b, bi) => (
              <li key={`${side}${bi}`}>
                <button onClick={() => onBranch(branchKeyOf(side, bi))}>
                  <b>{b.label}</b>
                  <span className="muted"> · {b.leaves.length} conceptos</span>
                </button>
              </li>
            )),
          )}
        </ul>
        <SectionList sections={sectionsOf(all.flatMap((b) => b.leaves))} refs={all.flatMap((b) => b.leaves.flatMap((l) => l.refs))} />
      </div>
    </>
  )
}

function SectionList({ sections, refs }: { sections: Section[]; refs: string[] }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="mm-sec-list">
      <p className="mm-d-tag">Secciones del apunte</p>
      {sections.map((s) => (
        <section key={s.id} className="mm-x-group">
          <button className="mm-sec-btn" onClick={() => setOpen((o) => (o === s.id ? null : s.id))} aria-expanded={open === s.id}>
            <span>{s.title}</span>
            <span className="muted small">
              p. {s.page} {open === s.id ? '−' : '+'}
            </span>
          </button>
          {open === s.id && <FullSection section={s} refs={refs} />}
        </section>
      ))}
    </div>
  )
}

/* ───────────── Texto del apunte ───────────── */

function ExcerptView({ x, mark }: { x: Excerpt; mark: string }) {
  const { block, row } = x
  if (block.t !== 'table') return <BlockView block={block} mark={mark} />
  if (row === undefined) return <TableView block={block} mark={mark} />
  const cells = block.rows[row] ?? []
  const header = block.head ? block.rows[0] : []
  return (
    <dl className="mm-x mm-row">
      {cells.map((cell, i) =>
        cell ? (
          <Fragment key={i}>
            {header[i] ? <dt>{header[i].replace(/\*\*/g, '')}</dt> : null}
            <dd className={i === 0 ? 'first' : ''}>
              <Rich text={cell} mark={mark} />
            </dd>
          </Fragment>
        ) : null,
      )}
    </dl>
  )
}

function BlockView({ block, mark, hot }: { block: Exclude<Block, { t: 'table' }>; mark?: string; hot?: boolean }) {
  const cls = `mm-x ${block.t} ${hot ? 'hot' : ''}`
  if (block.t === 'h') return <h4 className={cls}>{block.text}</h4>
  return (
    <p className={cls}>
      <Rich text={block.text} mark={mark} />
    </p>
  )
}

function TableView({ block, mark, hotRows }: { block: Extract<Block, { t: 'table' }>; mark?: string; hotRows?: Set<number> }) {
  const head = block.head ? block.rows[0] : null
  const offset = block.head ? 1 : 0
  const body = block.rows.slice(offset)
  return (
    <div className="mm-x mm-table-wrap">
      <table className="mm-table">
        {head && (
          <thead>
            <tr>
              {head.map((c, i) => (
                <th key={i}>{c.replace(/\*\*/g, '')}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((r, k) => (
            <tr key={k} className={hotRows?.has(k + offset) ? 'hot' : ''}>
              {r.map((c, i) => (
                <td key={i}>
                  <Rich text={c} mark={mark} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FullSection({ section, refs, mark }: { section: Section; refs: string[]; mark?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector('.hot')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])
  const own = refs.filter((r) => r.startsWith(`${section.id}.`))
  const whole = new Set(own.filter((r) => !r.includes(':')))
  return (
    <div className="mm-full" ref={ref}>
      {section.blocks.map((b) => {
        if (b.t !== 'table') return <BlockView key={b.id} block={b} mark={mark} hot={whole.has(b.id)} />
        const rows = new Set(own.filter((r) => r.startsWith(`${b.id}:`)).map((r) => Number(r.split(':')[1])))
        if (whole.has(b.id)) b.rows.forEach((_, k) => rows.add(k))
        return <TableView key={b.id} block={b} mark={mark} hotRows={rows} />
      })}
    </div>
  )
}

// Resalta en el texto del apunte las palabras del concepto, sin importar tildes ni mayúsculas.
const STOP = new Set(['para', 'como', 'entre', 'segun', 'sobre', 'desde', 'hasta', 'cada', 'todo', 'toda', 'apunte'])
const fold = (s: string) =>
  s
    .split('')
    .map((ch) => ch.normalize('NFD')[0].toLowerCase())
    .join('')

function markPattern(term: string) {
  const stems = fold(term)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w))
    .map((w) => (w.length > 5 ? w.slice(0, w.length - 2) : w))
  return stems.length ? new RegExp(`(?<![a-z0-9])(?:${stems.join('|')})[a-z0-9]*`, 'g') : null
}

function Rich({ text, mark }: { text: string; mark?: string }) {
  const re = useMemo(() => (mark ? markPattern(mark) : null), [mark])
  const runs = text.split('**')
  return (
    <>
      {runs.map((run, i) => {
        if (!run) return null
        const parts: ReactNode[] = []
        if (re) {
          const folded = fold(run)
          let at = 0
          for (const m of folded.matchAll(re)) {
            const start = m.index ?? 0
            parts.push(run.slice(at, start), <mark key={start}>{run.slice(start, start + m[0].length)}</mark>)
            at = start + m[0].length
          }
          parts.push(run.slice(at))
        } else parts.push(run)
        return i % 2 ? <strong key={i}>{parts}</strong> : <Fragment key={i}>{parts}</Fragment>
      })}
    </>
  )
}

