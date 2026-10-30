import { leavesOf, mapUnits, mindMaps, type MindMapDef } from '../mapas'

export function MindMaps() {
  const concepts = mindMaps.reduce((n, m) => n + leavesOf(m).length, 0)

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Sección 04 — Repaso general</p>
          <h1 className="display">
            Mapas
            <br />
            mentales<span className="accent-dot">.</span>
          </h1>
          <p className="lede">
            Los mapas tal cual, compactos para repasar de un vistazo. Si un concepto no te acordás, lo tocás y leés su
            definición completa del apunte.
          </p>
        </div>
        <MapArt />
      </section>

      <section className="stats">
        <div className="stat">
          <span className="stat-value">{mindMaps.length}</span>
          <span className="stat-label">mapas</span>
        </div>
        <div className="stat">
          <span className="stat-value">{concepts}</span>
          <span className="stat-label">conceptos con su definición</span>
        </div>
        <div className="stat">
          <span className="stat-value">3</span>
          <span className="stat-label">unidades</span>
        </div>
      </section>

      {mapUnits.map((u) => (
        <section key={u.key} className="group">
          <div className="section-head">
            <h2 className="h2">
              <span className="unit">{u.unit}</span> {u.name}
            </h2>
            <span className="muted small">{u.maps.length} mapas</span>
          </div>
          <div className="cw-grid">
            {u.maps.map((m) => (
              <MapCard key={m.id} map={m} />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}

function MapCard({ map }: { map: MindMapDef }) {
  const branches = map.left.length + map.right.length
  return (
    <a className="cw-card mm-card" href={`#/mapas/${map.id}`}>
      <span className="cw-card-n">{map.num}</span>
      <h3 className="cw-card-title">{map.title}</h3>
      <p className="mm-card-sub muted small">{map.subtitle}</p>
      <div className="cw-card-foot">
        <div className="cw-card-meta small">
          <span>
            {branches} ramas · {leavesOf(map).length} conceptos
          </span>
          <span className="muted" aria-hidden>
            →
          </span>
        </div>
      </div>
    </a>
  )
}

function MapArt() {
  // Un mapa en miniatura: tronco central, ramas y hojas; una hoja resaltada como si estuviera abierta.
  const ys = [50, 130, 210]
  return (
    <svg className="hero-art mm-art" viewBox="0 0 420 260" aria-hidden>
      {ys.map((y) => (
        <g key={y}>
          <path d={`M170 130 C150 130 150 ${y} 128 ${y}`} className="art-line" />
          <path d={`M250 130 C270 130 270 ${y} 292 ${y}`} className="art-line" />
          {[-22, 0, 22].map((d) => (
            <g key={d}>
              <path d={`M92 ${y} C80 ${y} 80 ${y + d} 66 ${y + d}`} className="art-line faint" />
              <path d={`M328 ${y} C340 ${y} 340 ${y + d} 354 ${y + d}`} className="art-line faint" />
              <rect x={14} y={y + d - 4} width={48} height={8} rx={4} className="mm-art-leaf" />
              <rect
                x={358}
                y={y + d - 4}
                width={48}
                height={8}
                rx={4}
                className={y === 130 && d === 0 ? 'mm-art-leaf hot' : 'mm-art-leaf'}
              />
            </g>
          ))}
          <rect x={96} y={y - 6} width={30} height={12} rx={6} className="mm-art-branch" />
          <rect x={294} y={y - 6} width={30} height={12} rx={6} className="mm-art-branch" />
        </g>
      ))}
      <rect x={170} y={104} width={80} height={52} rx={10} className="mm-art-center" />
    </svg>
  )
}
