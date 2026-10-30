import mapasData from './mapas.json'
import apunteData from './apunte.json'

// mapas.json y apunte.json se generan a partir de material/Mapas_Unidades_4_5_6_Impresion.pdf y
// material/Resumen_Unidades_4_5_y_6_corregido.pdf. Cada concepto del mapa guarda en `refs` los bloques del
// apunte que lo explican: "s03.2" es un párrafo y "s03.4:1" es la fila 1 de una tabla.

export interface Leaf {
  term: string
  text: string
  refs: string[]
}

export interface Branch {
  label: string
  leaves: Leaf[]
}

export interface MindMapDef {
  id: string
  unit: string
  num: string
  title: string
  subtitle: string
  kicker: string
  center: string
  recordar: string
  left: Branch[]
  right: Branch[]
}

export type Block =
  | { id: string; t: 'h' | 'p' | 'li' | 'callout'; text: string }
  | { id: string; t: 'table'; rows: string[][]; head: boolean }

export interface Section {
  id: string
  unit: string
  title: string
  /** Página del resumen. */
  page: number
  /** Páginas del apunte original que cubre la sección. */
  orig: string
  blocks: Block[]
}

export const mindMaps = mapasData as MindMapDef[]
export const sections = apunteData as Section[]

export const mapUnits = [
  { key: 'u4', unit: 'U4', name: 'Desarrollo y mantenimiento de los recursos humanos' },
  { key: 'u5', unit: 'U5', name: 'Subsistema de seguimiento' },
  { key: 'u6', unit: 'U6', name: 'Seguridad y auditoría de sistemas de información' },
].map((u) => ({ ...u, maps: mindMaps.filter((m) => m.unit === u.key) }))

export const findMindMap = (id: string) => mindMaps.find((m) => m.id === id)

const sectionById = new Map(sections.map((s) => [s.id, s]))
const blockById = new Map(sections.flatMap((s) => s.blocks.map((b) => [b.id, { section: s, block: b }] as const)))

export interface Excerpt {
  ref: string
  section: Section
  block: Block
  /** Fila de la tabla, si la referencia apunta a una sola fila. */
  row?: number
}

export function resolveRef(ref: string): Excerpt | undefined {
  const [id, row] = ref.split(':')
  const hit = blockById.get(id)
  if (!hit) return undefined
  return { ref, section: hit.section, block: hit.block, row: row === undefined ? undefined : Number(row) }
}

/** Conceptos en orden de lectura: ramas de la izquierda de arriba abajo y después las de la derecha. */
export const leavesOf = (m: MindMapDef) =>
  [...m.left.map((b) => ({ b, side: 'left' as const })), ...m.right.map((b) => ({ b, side: 'right' as const }))].flatMap(
    ({ b, side }) => b.leaves.map((leaf) => ({ leaf, branch: b, side })),
  )

/** Secciones del apunte que usa un grupo de conceptos, en el orden del apunte. */
export const sectionsOf = (leaves: Leaf[]) =>
  [...new Set(leaves.flatMap((l) => l.refs.map((r) => r.split('.')[0])))]
    .sort()
    .map((id) => sectionById.get(id)!)
    .filter(Boolean)
