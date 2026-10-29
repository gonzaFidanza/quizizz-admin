import { diagrams, levelOf } from '../lib/diagrams'
import { mastery, timeAgo, useProgress } from '../lib/storage'
import type { Diagram } from '../lib/types'
import { Ring } from './Ring'

export function Home() {
  const progress = useProgress()
  const configured = diagrams.filter((d) => d.configured)
  const totalBlanks = configured.reduce((n, d) => n + d.config.blanks.length, 0)
  const globalMastery = configured.length
    ? configured.reduce((n, d) => n + mastery(d, progress[d.id]), 0) / configured.length
    : 0

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Administración de Sistemas de Información — Parcial</p>
          <h1 className="display">
            Completá
            <br />
            los gráficos<span className="accent-dot">.</span>
          </h1>
          <p className="lede">
            Estudiá cada gráfico con todo su texto. Después los conceptos clave desaparecen y los tenés que escribir vos,
            como en el parcial.
          </p>
        </div>
        <HeroArt />
      </section>

      <section className="stats">
        <Stat value={configured.length} label="gráficos" />
        <Stat value={totalBlanks} label="huecos para completar" />
        <Stat value={`${Math.round(globalMastery * 100)}%`} label="dominio de conceptos clave" />
      </section>

      <section className="steps">
        <Step n="01" title="Estudiá" text="Mirá el gráfico completo. Tocá un concepto para taparlo y ponerte a prueba." />
        <Step n="02" title="Practicá" text="Completá los huecos con corrección al instante, pistas y segunda oportunidad." />
        <Step n="03" title="Rendí" text="Simulacro sin ayudas: completás todo y recién al final ves el resultado." />
      </section>

      {diagrams.length === 0 ? (
        <div className="empty">
          Todavía no hay gráficos. Agregá imágenes en <code>src/graficos/</code>.
        </div>
      ) : (
        groupByTopic(diagrams).map(([topic, items]) => {
          const [unit, name] = topic.split(' · ')
          const m = items.reduce((n, d) => n + mastery(d, progress[d.id]), 0) / items.length
          return (
            <section key={topic} className="group">
              <div className="section-head">
                <h2 className="h2">
                  {name ? (
                    <>
                      <span className="unit">{unit}</span> {name}
                    </>
                  ) : (
                    topic
                  )}
                </h2>
                <span className="muted small">
                  {items.length} gráficos · {Math.round(m * 100)}% dominado
                </span>
              </div>
              <div className="grid">
                {items.map((d, i) => (
                  <DiagramCard key={d.id} diagram={d} index={i} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </main>
  )
}

function groupByTopic(list: Diagram[]) {
  const groups = new Map<string, Diagram[]>()
  for (const d of list) {
    const key = d.config.topic || 'Otros'
    groups.set(key, [...(groups.get(key) ?? []), d])
  }
  return [...groups.entries()]
}

function DiagramCard({ diagram, index }: { diagram: Diagram; index: number }) {
  const progress = useProgress()[diagram.id]
  const { blanks, width, height } = diagram.config
  const keyCount = blanks.filter((b) => levelOf(b) === 'clave').length
  const m = mastery(diagram, progress)
  const last = progress?.sessions.at(-1)
  const best = progress?.sessions.length ? Math.max(...progress.sessions.map((s) => s.score / s.total)) : null

  return (
    <a className="card" href={diagram.configured ? `#/g/${diagram.id}` : `#/g/${diagram.id}/editar`}>
      <div className="card-thumb">
        <div className="thumb-box">
        <div
          className="thumb-inner"
          style={width && height ? { aspectRatio: `${width} / ${height}`, width: `min(100cqw, ${(100 * width) / height}cqh)` } : undefined}
        >
          <img src={diagram.image} alt="" loading="lazy" />
          {width &&
            height &&
            blanks.map((b) => (
              <span
                key={b.id}
                className={`thumb-blank ${levelOf(b)}`}
                style={{
                  left: `${(b.x / width) * 100}%`,
                  top: `${(b.y / height) * 100}%`,
                  width: `${(b.w / width) * 100}%`,
                  height: `${(b.h / height) * 100}%`,
                }}
              />
            ))}
        </div>
        </div>
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span className="index">{String(index + 1).padStart(2, '0')}</span>
          <span>{blanks.length} huecos</span>
        </div>
        <h3 className="card-title">{diagram.title}</h3>
        {diagram.configured ? (
          <div className="card-foot">
            <Ring value={m} size={36} />
            <div className="card-foot-text">
              <span>
                {keyCount} clave · {blanks.length - keyCount} extra
              </span>
              <span className="muted">
                {last ? `Mejor ${Math.round((best ?? 0) * 100)}% · ${timeAgo(last.at)}` : 'Sin practicar'}
              </span>
            </div>
          </div>
        ) : (
          <div className="card-foot">
            <span className="tag">Sin huecos</span>
            <span className="muted small">Abrir editor →</span>
          </div>
        )}
      </div>
    </a>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="step">
      <span className="step-n">{n}</span>
      <h3 className="step-title">{title}</h3>
      <p className="muted">{text}</p>
    </div>
  )
}

function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 420 360" aria-hidden>
      <circle cx="250" cy="170" r="150" className="art-line" />
      <circle cx="250" cy="170" r="96" className="art-line faint" />
      <line x1="40" y1="330" x2="400" y2="20" className="art-line faint" />
      <g className="art-blanks">
        <rect x="70" y="92" width="220" height="38" rx="19" className="art-blank b1" />
        <rect x="130" y="152" width="250" height="38" rx="19" className="art-blank b2" />
        <rect x="90" y="212" width="170" height="38" rx="19" className="art-blank b3" />
      </g>
      <circle cx="356" cy="276" r="14" className="art-dot" />
      <circle cx="64" cy="48" r="4" className="art-dot small" />
    </svg>
  )
}
