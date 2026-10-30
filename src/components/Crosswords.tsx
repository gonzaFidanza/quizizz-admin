import { crosswordUnits } from '../crucigramas'
import type { PuzzleDef } from '../lib/crossword'
import { formatTime, useCrosswords } from '../lib/crosswordProgress'

export function Crosswords() {
  const store = useCrosswords()
  const puzzles = crosswordUnits.flatMap((u) => u.puzzles)
  const words = puzzles.reduce((n, p) => n + p.words.length, 0)
  const solved = puzzles.filter((p) => store[p.id]?.solvedAt).length

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Sección 03 — Conceptos clave jugando</p>
          <h1 className="display">
            Crucigramas<span className="accent-dot">.</span>
          </h1>
          <p className="lede">
            Un crucigrama por cada mapa mental. Las pistas salen del resumen: definiciones, leyes, tipos y autores que
            tenés que tener en la punta de la lengua.
          </p>
        </div>
        <CrossArt />
      </section>

      <section className="stats">
        <div className="stat">
          <span className="stat-value">{puzzles.length}</span>
          <span className="stat-label">crucigramas</span>
        </div>
        <div className="stat">
          <span className="stat-value">{words}</span>
          <span className="stat-label">conceptos para memorizar</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {solved}/{puzzles.length}
          </span>
          <span className="stat-label">resueltos</span>
        </div>
      </section>

      {crosswordUnits.map((u) => (
        <section key={u.key} className="group">
          <div className="section-head">
            <h2 className="h2">
              <span className="unit">{u.unit}</span> {u.name}
            </h2>
            <span className="muted small">{u.puzzles.length} crucigramas</span>
          </div>
          <div className="cw-grid">
            {u.puzzles.map((p, i) => (
              <PuzzleCard key={p.id} def={p} index={i} />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}

function PuzzleCard({ def, index }: { def: PuzzleDef; index: number }) {
  const s = useCrosswords()[def.id]
  const total = s?.total ?? def.words.length
  const done = s?.done ?? 0
  const status = s?.solvedAt ? 'Resuelto' : done > 0 || (s && s.fills.trim()) ? 'En curso' : 'Sin empezar'

  return (
    <a className={`cw-card ${s?.solvedAt ? 'is-solved' : ''}`} href={`#/cruci/${def.id}`}>
      <span className="cw-card-n">{String(index + 1).padStart(2, '0')}</span>
      <h3 className="cw-card-title">{def.title}</h3>
      <div className="cw-card-foot">
        <div className="summary-bar">
          <span className={`summary-fill ${s?.solvedAt ? 'ok' : ''}`} style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <div className="cw-card-meta small">
          <span>
            {status} · {done}/{total} palabras
          </span>
          <span className="muted">{s?.best !== undefined ? `Mejor ${formatTime(s.best)}` : s?.solvedAt ? 'Con ayudas' : ''}</span>
        </div>
      </div>
    </a>
  )
}

function CrossArt() {
  // Pequeña grilla decorativa: dos palabras que se cruzan.
  const cells: [number, number, string][] = [
    ...[...'ENTRENA'].map((ch, i) => [2, i, ch] as [number, number, string]),
    ...[...'AREA'].map((ch, i) => [i, 4, ch] as [number, number, string]),
  ]
  const s = 46
  return (
    <svg className="hero-art cw-art" viewBox="-10 -10 360 260" aria-hidden>
      {cells.map(([r, c, ch], k) => (
        <g key={k} className={r === 2 && c >= 2 && c <= 4 ? 'cw-art-hot' : ''}>
          <rect x={c * s} y={r * s} width={s} height={s} className="cw-art-cell" />
          {!(r === 2 && c > 4) && (
            <text x={c * s + s / 2} y={r * s + s / 2 + 7} textAnchor="middle" className="cw-art-letter">
              {ch}
            </text>
          )}
        </g>
      ))}
      <rect x={5 * s} y={2 * s} width={2 * s} height={s} className="cw-art-cursor" />
    </svg>
  )
}
