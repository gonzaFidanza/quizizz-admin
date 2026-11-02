import { grade, normalize } from './match'

export type UnitKey = 'u4' | 'u5' | 'u6'
export type Modalidad = 'parcial' | 'propia'
export type Formato = 'mc' | 'multi' | 'vf' | 'rel' | 'fill' | 'tabla' | 'dev'

/** Celda de un cuadro: texto fijo, hueco para escribir (r) o hueco con opciones (r + o). */
export type Celda = string | { r: string; alt?: string[]; o?: string[] }

interface Comun {
  tema: string
  /** Enunciado. */
  q: string
  /** Por qué es así. Se muestra al corregir. */
  e?: string
  /** Clave de un caso de `casos.ts` que se muestra arriba del enunciado. */
  ctx?: string
  /** De qué parcial salió (solo modalidad parcial). */
  src?: string
  /** La clave no está confirmada por una corrección: se dedujo del apunte o de resueltos de compañeros. */
  inf?: boolean
  /** Aclaración sobre la clave o la consigna original. */
  nota?: string
}

export type ItemDef = Comun &
  (
    | { t: 'mc'; o: string[]; a: number }
    | { t: 'multi'; o: string[]; a: number[] }
    /** [afirmación, es verdadera, por qué (opcional)] */
    | { t: 'vf'; i: [string, boolean, string?][] }
    /** [elemento, respuesta]; `extra` agrega distractores a las opciones. */
    | { t: 'rel'; i: [string, string][]; extra?: string[] }
    /** [texto con ___ o etiqueta, respuesta, otras respuestas válidas] */
    | { t: 'fill'; i: [string, string, string[]?][] }
    | { t: 'tabla'; c: string[]; f: Celda[][] }
    /** Consigna de desarrollo: respuesta modelo y puntos que tiene que tocar. */
    | { t: 'dev'; m: string; k?: string[] }
  )

export type Question = ItemDef & { id: string; unit: UnitKey; modalidad: Modalidad }

export interface Answer {
  /** mc */
  n?: number | null
  /** multi */
  ns?: number[]
  /** vf */
  bs?: (boolean | null)[]
  /** rel, fill, tabla (un valor por hueco) y dev (texto en la posición 0) */
  ss?: string[]
  /** dev: autocorrección (1, 0.5 o 0) */
  self?: number | null
}

export const formatoLabel: Record<Formato, string> = {
  mc: 'Choice',
  multi: 'Selección múltiple',
  vf: 'Verdadero o falso',
  rel: 'Relacionar',
  fill: 'Completar',
  tabla: 'Completar cuadro',
  dev: 'Desarrollo',
}

export const celdasHueco = (q: Extract<ItemDef, { t: 'tabla' }>) =>
  q.f.flat().filter((c): c is Exclude<Celda, string> => typeof c !== 'string')

/** Respuestas posibles de una consigna de relacionar, sin repetir. */
export const opcionesRel = (q: Extract<ItemDef, { t: 'rel' }>) =>
  [...new Set([...q.i.map(([, r]) => r), ...(q.extra ?? [])])].sort((a, b) => a.localeCompare(b, 'es'))

/** Opciones que dependen de su posición ("a y b son correctas") no se pueden mezclar. */
const fijas = /ningun|todas las|anteriores|\b[a-g] y [a-g]\b/i
export const sePuedeMezclar = (o: string[]) => !o.some((x) => fijas.test(x))

const ok = (input: string | undefined, answer: string, accept?: string[]) =>
  grade(input ?? '', { answer, accept }).grade !== 'bad'

/** Partes correctas de la respuesta y nota de 0 a 1. Multi es todo o nada, como en el parcial. */
export function corregir(q: Question, a: Answer | undefined): { score: number; parts: boolean[] } {
  let parts: boolean[]
  switch (q.t) {
    case 'mc':
      parts = [a?.n === q.a]
      break
    case 'multi': {
      const elegidas = [...(a?.ns ?? [])].sort((x, y) => x - y)
      parts = [elegidas.join() === [...q.a].sort((x, y) => x - y).join()]
      break
    }
    case 'vf':
      parts = q.i.map(([, v], i) => a?.bs?.[i] === v)
      break
    case 'rel':
      parts = q.i.map(([, r], i) => normalize(a?.ss?.[i] ?? '') === normalize(r))
      break
    case 'fill':
      parts = q.i.map(([, r, alt], i) => ok(a?.ss?.[i], r, alt))
      break
    case 'tabla':
      parts = celdasHueco(q).map((c, i) =>
        c.o ? normalize(a?.ss?.[i] ?? '') === normalize(c.r) : ok(a?.ss?.[i], c.r, c.alt),
      )
      break
    case 'dev':
      return { score: a?.self ?? 0, parts: [(a?.self ?? 0) === 1] }
  }
  return { score: parts.filter(Boolean).length / parts.length, parts }
}

/** Respondió algo: para avisar antes de entregar. */
export function respondida(q: Question, a: Answer | undefined) {
  if (!a) return false
  switch (q.t) {
    case 'mc':
      return a.n !== undefined && a.n !== null
    case 'multi':
      return !!a.ns?.length
    case 'vf':
      return q.i.every((_, i) => a.bs?.[i] !== undefined && a.bs?.[i] !== null)
    case 'dev':
      return !!a.ss?.[0]?.trim()
    default:
      return !!a.ss?.some((s) => s?.trim())
  }
}

/** Mezcla estable para que las opciones no cambien de lugar entre renders. */
export function ordenOpciones(id: string, n: number, intento: number) {
  let h = intento + 7
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const orden = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0
    const j = h % (i + 1)
    ;[orden[i], orden[j]] = [orden[j], orden[i]]
  }
  return orden
}

export function mezclar<T>(xs: T[]) {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
