export type Dir = 'H' | 'V'

/** Crucigrama tal como se escribe a mano: título y pares [respuesta, pista]. */
export interface PuzzleDef {
  id: string
  title: string
  words: [string, string][]
}

export interface Entry {
  /** Clave única dentro del crucigrama, p. ej. "3V". */
  key: string
  num: number
  dir: Dir
  row: number
  col: number
  answer: string
  clue: string
}

export interface Puzzle {
  id: string
  title: string
  rows: number
  cols: number
  /** Letra correcta de cada celda, o null si es un casillero negro. */
  solution: (string | null)[][]
  /** Número que se imprime en la esquina de la celda, si arranca alguna palabra. */
  numbers: (number | null)[][]
  entries: Entry[]
}

/** Mayúsculas sin tildes ni espacios. La Ñ se mantiene como letra propia. */
export const normalize = (s: string) =>
  s
    .toUpperCase()
    .replace(/Ñ/g, '\u0000')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0000/g, 'Ñ')
    .replace(/[^A-ZÑ]/g, '')

// Generador pseudoaleatorio con semilla: el mismo crucigrama siempre produce la misma grilla,
// así el progreso guardado sigue coincidiendo con las celdas.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Placed {
  word: string
  clue: string
  row: number
  col: number
  dir: Dir
}

type Cells = Map<string, { r: number; c: number; ch: string; dirs: Set<Dir> }>

const at = (r: number, c: number) => `${r},${c}`

function step(dir: Dir): [number, number] {
  return dir === 'H' ? [0, 1] : [1, 0]
}

/** Cantidad de cruces si la palabra entra en esa posición, o -1 si no entra. */
function fit(cells: Cells, word: string, row: number, col: number, dir: Dir) {
  const [dr, dc] = step(dir)
  const before = cells.get(at(row - dr, col - dc))
  const after = cells.get(at(row + dr * word.length, col + dc * word.length))
  if (before || after) return -1
  let crossings = 0
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i
    const c = col + dc * i
    const cell = cells.get(at(r, c))
    if (cell) {
      if (cell.ch !== word[i] || cell.dirs.has(dir)) return -1
      crossings++
    } else if (cells.has(at(r + dc, c + dr)) || cells.has(at(r - dc, c - dr))) {
      // Una letra nueva no puede quedar pegada de costado a otra palabra.
      return -1
    }
  }
  return crossings
}

function put(cells: Cells, p: Placed) {
  const [dr, dc] = step(p.dir)
  for (let i = 0; i < p.word.length; i++) {
    const r = p.row + dr * i
    const c = p.col + dc * i
    const k = at(r, c)
    const cell = cells.get(k) ?? { r, c, ch: p.word[i], dirs: new Set<Dir>() }
    cell.dirs.add(p.dir)
    cells.set(k, cell)
  }
}

function bounds(placed: Placed[]) {
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity
  for (const p of placed) {
    const [dr, dc] = step(p.dir)
    minR = Math.min(minR, p.row)
    minC = Math.min(minC, p.col)
    maxR = Math.max(maxR, p.row + dr * (p.word.length - 1))
    maxC = Math.max(maxC, p.col + dc * (p.word.length - 1))
  }
  return { minR, minC, rows: maxR - minR + 1, cols: maxC - minC + 1 }
}

function attempt(words: { word: string; clue: string }[], rand: () => number) {
  const order = [...words].sort((a, b) => b.word.length + rand() * 4 - (a.word.length + rand() * 4))
  const cells: Cells = new Map()
  const first = order.shift()!
  const placed: Placed[] = [{ ...first, row: 0, col: 0, dir: rand() < 0.5 ? 'H' : 'V' }]
  put(cells, placed[0])

  let pending = order
  // Se reintentan las palabras que no entraron mientras alguna nueva se siga sumando.
  for (let progress = true; pending.length && progress; ) {
    progress = false
    const left: typeof pending = []
    for (const w of pending) {
      const cur = bounds(placed)
      let best: { p: Placed; score: number } | null = null
      for (const { r, c, ...cell } of cells.values()) {
        for (let i = 0; i < w.word.length; i++) {
          if (w.word[i] !== cell.ch) continue
          for (const dir of ['H', 'V'] as Dir[]) {
            if (cell.dirs.has(dir)) continue
            const [dr, dc] = step(dir)
            const p = { ...w, row: r - dr * i, col: c - dc * i, dir }
            const crossings = fit(cells, w.word, p.row, p.col, dir)
            if (crossings < 1) continue
            const end = { r: p.row + dr * (w.word.length - 1), c: p.col + dc * (w.word.length - 1) }
            const rows = Math.max(cur.minR + cur.rows - 1, end.r) - Math.min(cur.minR, p.row) + 1
            const cols = Math.max(cur.minC + cur.cols - 1, end.c) - Math.min(cur.minC, p.col) + 1
            // Se premian los cruces y se castiga que la grilla crezca o quede muy alargada.
            const score = crossings * 10 - rows * cols * 0.06 - Math.abs(rows - cols) * 0.8 + rand()
            if (!best || score > best.score) best = { p, score }
          }
        }
      }
      if (best) {
        placed.push(best.p)
        put(cells, best.p)
        progress = true
      } else left.push(w)
    }
    pending = left
  }
  return { placed, missing: pending.length }
}

const cache = new Map<string, Puzzle>()

export function buildPuzzle(def: PuzzleDef, tries = 200): Puzzle {
  const hit = cache.get(def.id)
  if (hit) return hit

  const words = def.words.map(([answer, clue]) => ({ word: normalize(answer), clue }))
  const rand = rng([...def.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7))
  let best: { placed: Placed[]; score: number } | null = null
  for (let t = 0; t < tries; t++) {
    const { placed, missing } = attempt(words, rand)
    const b = bounds(placed)
    const score = missing * 1000 + b.rows * b.cols + Math.abs(b.rows - b.cols) * 6
    if (!best || score < best.score) best = { placed, score }
  }

  const { placed } = best!
  const { minR, minC, rows, cols } = bounds(placed)
  const solution: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null))
  const numbers: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null))
  for (const p of placed) {
    const [dr, dc] = step(p.dir)
    for (let i = 0; i < p.word.length; i++) solution[p.row - minR + dr * i][p.col - minC + dc * i] = p.word[i]
  }

  // Numeración clásica: de izquierda a derecha y de arriba hacia abajo, compartida entre H y V.
  const starts = placed
    .map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }))
    .sort((a, b) => a.row - b.row || a.col - b.col)
  let n = 0
  const entries: Entry[] = starts.map((p) => {
    const num = numbers[p.row][p.col] ?? (numbers[p.row][p.col] = ++n)
    return { key: `${num}${p.dir}`, num, dir: p.dir, row: p.row, col: p.col, answer: p.word, clue: p.clue }
  })

  const puzzle = { id: def.id, title: def.title, rows, cols, solution, numbers, entries }
  cache.set(def.id, puzzle)
  return puzzle
}

/** Celdas [fila, columna] que ocupa una palabra. */
export function cellsOf(e: Entry): [number, number][] {
  const [dr, dc] = step(e.dir)
  return Array.from({ length: e.answer.length }, (_, i) => [e.row + dr * i, e.col + dc * i])
}
