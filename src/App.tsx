import { useEffect, useState } from 'react'
import { findDiagram, findGroup } from './lib/diagrams'
import { Home } from './components/Home'
import { DiagramView } from './components/DiagramView'
import { Editor } from './components/Editor'
import { Series } from './components/Series'

const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)

export const go = (path: string) => {
  window.location.hash = `/${path}`
}

export function App() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const [section, id, sub] = route
  const diagram = section === 'g' && id ? findDiagram(id) : undefined
  const group = section === 'serie' && id ? findGroup(id) : undefined

  return (
    <div className="app">
      <TopBar section={section} />
      {diagram && sub === 'editar' ? (
        <Editor key={diagram.id} diagram={diagram} />
      ) : diagram ? (
        <DiagramView key={diagram.id} diagram={diagram} />
      ) : group ? (
        <Series key={group.key} group={group} />
      ) : section === 'mc' ? (
        <ComingSoon />
      ) : (
        <Home />
      )}
    </div>
  )
}

function TopBar({ section }: { section?: string }) {
  return (
    <header className="topbar">
      <a className="wordmark" href="#/">
        <span className="wordmark-mark" aria-hidden />
        repaso<span className="muted">/asi</span>
      </a>
      <nav className="topnav">
        <a href="#/" className={section !== 'mc' ? 'active' : ''}>
          Gráficos
        </a>
        <a href="#/mc" className={section === 'mc' ? 'active' : ''}>
          Multiple choice
        </a>
      </nav>
      <ThemeToggle />
    </header>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? '')
  const isDark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  const toggle = () => {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('repaso-asi:theme', next)
    } catch {}
    setTheme(next)
  }
  return (
    <button className="icon-btn" onClick={toggle} aria-label={isDark ? 'Modo claro' : 'Modo oscuro'} title={isDark ? 'Modo claro' : 'Modo oscuro'}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor" />
      </svg>
    </button>
  )
}

function ComingSoon() {
  return (
    <main className="page">
      <section className="hero hero-small">
        <p className="eyebrow">Sección 02</p>
        <h1 className="display">
          Multiple
          <br />
          choice.
        </h1>
        <p className="lede">Próximamente: preguntas sacadas de los modelos de parcial viejos.</p>
      </section>
    </main>
  )
}
