import type { Blank, Grade } from './types'

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'a', 'al', 'y', 'e', 'o', 'u', 'un', 'una', 'por', 'para', 'con'])

export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Palabras con significado: sin artículos ni preposiciones. */
const core = (s: string) =>
  normalize(s)
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .join(' ')

function levenshtein(a: string, b: string) {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

export interface GradeResult {
  grade: Grade
  /** La respuesta incorrecta se parece bastante a la correcta. */
  near: boolean
}

/**
 * Corrige sin importar mayúsculas, tildes, puntuación ni artículos/preposiciones.
 * Errores de tipeo chicos cuentan como "casi" (válido, pero se avisa).
 */
export function grade(input: string, blank: Blank): GradeResult {
  if (!normalize(input)) return { grade: 'bad', near: false }
  const given = core(input)
  let best = 0
  for (const target of [blank.answer, ...(blank.accept ?? [])]) {
    const t = core(target)
    if (normalize(target) === normalize(input) || t === given) return { grade: 'ok', near: false }
    best = Math.max(best, 1 - levenshtein(t, given) / Math.max(t.length, given.length, 1))
  }
  const threshold = core(blank.answer).length < 8 ? 0.9 : 0.84
  if (best >= threshold) return { grade: 'close', near: true }
  return { grade: 'bad', near: best >= 0.6 }
}

/** Pista progresiva: 1 = primera letra de cada palabra, 2 = la mitad de las letras. */
export function hintMask(answer: string, level: number) {
  return answer
    .split(' ')
    .map((word) =>
      STOP.has(normalize(word))
        ? word
        : [...word].map((c, i) => (i === 0 || (level >= 2 && i % 2 === 0) || !/\p{L}/u.test(c) ? c : '·')).join(''),
    )
    .join(' ')
}
