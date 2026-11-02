import type { ItemDef, Modalidad, Question, UnitKey } from '../lib/quiz'
import { parcialesU4 } from './parciales-u4'
import { parcialesU5 } from './parciales-u5'
import { parcialesU6 } from './parciales-u6'
import { propiasU4 } from './propias-u4'
import { propiasU5 } from './propias-u5'
import { propiasU6 } from './propias-u6'

export { casos } from './casos'

export const quizUnits: { key: UnitKey; unit: string; name: string }[] = [
  { key: 'u4', unit: 'U4', name: 'Desarrollo y mantenimiento de RRHH' },
  { key: 'u5', unit: 'U5', name: 'Subsistema de Seguimiento' },
  { key: 'u6', unit: 'U6', name: 'Seguridad y Auditoría de SI' },
]

const armar = (unit: UnitKey, modalidad: Modalidad, items: ItemDef[]): Question[] =>
  items.map((item, i) => ({
    ...item,
    id: `${unit}-${modalidad === 'parcial' ? 'p' : 'n'}${String(i + 1).padStart(3, '0')}`,
    unit,
    modalidad,
  }))

export const questions: Question[] = [
  ...armar('u4', 'parcial', parcialesU4),
  ...armar('u5', 'parcial', parcialesU5),
  ...armar('u6', 'parcial', parcialesU6),
  ...armar('u4', 'propia', propiasU4),
  ...armar('u5', 'propia', propiasU5),
  ...armar('u6', 'propia', propiasU6),
]

const porId = new Map(questions.map((q) => [q.id, q]))
export const findQuestion = (id: string) => porId.get(id)
