import type { PuzzleDef } from '../lib/crossword'
import { u4 } from './u4'
import { u5 } from './u5'
import { u6 } from './u6'

export interface CrosswordUnit {
  key: string
  unit: string
  name: string
  puzzles: PuzzleDef[]
}

// Para sumar otra unidad: crear src/crucigramas/u7.ts con el mismo formato y agregarla acá.
export const crosswordUnits: CrosswordUnit[] = [
  { key: 'u4', unit: 'U4', name: 'Desarrollo y mantenimiento de los recursos humanos', puzzles: u4 },
  { key: 'u5', unit: 'U5', name: 'Subsistema de seguimiento', puzzles: u5 },
  { key: 'u6', unit: 'U6', name: 'Seguridad y auditoría de sistemas de información', puzzles: u6 },
]

const all = crosswordUnits.flatMap((u) => u.puzzles.map((p, i) => ({ def: p, unit: u, index: i })))

export const findPuzzle = (id: string) => all.find((p) => p.def.id === id)
