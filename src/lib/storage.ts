import { useSyncExternalStore } from 'react'
import { levelOf } from './diagrams'
import type { Diagram } from './types'

export interface BlankStat {
  attempts: number
  correct: number
  /** Aciertos seguidos. Con 2 o más el hueco se considera dominado. */
  streak: number
  last?: 'ok' | 'bad'
  at?: number
}

export interface Session {
  at: number
  mode: 'practice' | 'exam'
  score: number
  total: number
}

export interface DiagramProgress {
  blanks: Record<string, BlankStat>
  sessions: Session[]
}

type Progress = Record<string, DiagramProgress>

const KEY = 'repaso-asi:progress:v1'
const subscribers = new Set<() => void>()

function load(): Progress {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

let cache: Progress = load()

function commit(next: Progress) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {}
  subscribers.forEach((fn) => fn())
}

const empty = (): DiagramProgress => ({ blanks: {}, sessions: [] })

export function useProgress() {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => cache,
  )
}

export function recordAttempt(diagramId: string, blankId: string, ok: boolean) {
  const d = cache[diagramId] ?? empty()
  const s = d.blanks[blankId] ?? { attempts: 0, correct: 0, streak: 0 }
  const next: BlankStat = {
    attempts: s.attempts + 1,
    correct: s.correct + (ok ? 1 : 0),
    streak: ok ? s.streak + 1 : 0,
    last: ok ? 'ok' : 'bad',
    at: Date.now(),
  }
  commit({ ...cache, [diagramId]: { ...d, blanks: { ...d.blanks, [blankId]: next } } })
}

export function recordSession(diagramId: string, session: Session) {
  const d = cache[diagramId] ?? empty()
  commit({ ...cache, [diagramId]: { ...d, sessions: [...d.sessions, session].slice(-50) } })
}

export function resetProgress(diagramId: string) {
  const { [diagramId]: _, ...rest } = cache
  commit(rest)
}

/** Porcentaje de huecos clave dominados (2 aciertos seguidos). */
export function mastery(diagram: Diagram, p?: DiagramProgress) {
  const keys = diagram.config.blanks.filter((b) => levelOf(b) === 'clave')
  if (!keys.length) return 0
  return keys.filter((b) => (p?.blanks[b.id]?.streak ?? 0) >= 2).length / keys.length
}

export function failedIds(diagram: Diagram, p?: DiagramProgress) {
  return diagram.config.blanks.filter((b) => p?.blanks[b.id]?.last === 'bad').map((b) => b.id)
}

export function timeAgo(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return 'recién'
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}
