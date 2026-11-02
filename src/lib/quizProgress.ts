import { useSyncExternalStore } from 'react'
import type { Answer } from './quiz'

export interface QuestionStat {
  /** Nota del último intento, de 0 a 1. */
  last: number
  best: number
  tries: number
  at: number
}

export type Modo = 'practica' | 'simulacro'

export interface Run {
  ids: string[]
  modo: Modo
  titulo: string
  idx: number
  answers: Record<string, Answer>
  /** Preguntas ya corregidas. */
  checked: Record<string, true>
  /** Cambia el orden de las opciones entre intentos. */
  intento: number
  elapsed: number
  submitted: boolean
}

type Store = Record<string, QuestionStat>

const KEY = 'repaso-asi:cuestionarios:v1'
const RUN_KEY = 'repaso-asi:cuestionarios:run:v1'
const subscribers = new Set<() => void>()

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

let cache: Store = read(KEY, {})

export function recordQuestion(id: string, score: number) {
  const prev = cache[id]
  cache = {
    ...cache,
    [id]: { last: score, best: Math.max(score, prev?.best ?? 0), tries: (prev?.tries ?? 0) + 1, at: Date.now() },
  }
  write(KEY, cache)
  subscribers.forEach((fn) => fn())
}

export function useQuizStats() {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => cache,
  )
}

export const loadRun = () => read<Run | null>(RUN_KEY, null)
export const saveRun = (run: Run | null) => write(RUN_KEY, run)
