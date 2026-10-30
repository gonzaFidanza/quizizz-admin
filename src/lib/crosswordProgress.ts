import { useSyncExternalStore } from 'react'

export interface CrosswordState {
  /** Huella de la solución: si la grilla cambia, el progreso viejo se descarta. */
  sig: string
  /** Letras escritas, fila por fila; un espacio es una celda vacía. */
  fills: string
  /** Índices (fila * columnas + columna) de las celdas que se revelaron con ayuda. */
  revealed: number[]
  /** Palabras correctas sobre el total (para mostrar en el listado sin armar la grilla). */
  done: number
  total: number
  elapsed: number
  solvedAt?: number
  /** Mejor tiempo sin ayudas, en segundos. */
  best?: number
}

type Store = Record<string, CrosswordState>

const KEY = 'repaso-asi:crucigramas:v1'
const subscribers = new Set<() => void>()

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

let cache: Store = load()

export function saveCrossword(id: string, state: CrosswordState | null) {
  const { [id]: _, ...rest } = cache
  cache = state ? { ...rest, [id]: state } : rest
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {}
  subscribers.forEach((fn) => fn())
}

export const getCrossword = (id: string): CrosswordState | undefined => cache[id]

export function useCrosswords() {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => cache,
  )
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
