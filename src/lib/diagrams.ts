import type { Diagram, DiagramConfig } from './types'

const images = import.meta.glob('../graficos/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const configs = import.meta.glob('../graficos/*.json', { eager: true, import: 'default' }) as Record<string, DiagramConfig>

const baseName = (path: string) => path.split('/').pop()!.replace(/\.[^.]+$/, '')

const prettify = (file: string) => {
  const s = file.replace(/[-_]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const configByName = Object.fromEntries(Object.entries(configs).map(([p, c]) => [baseName(p), c]))

export const diagrams: Diagram[] = Object.entries(images)
  .map(([path, url]) => {
    const file = baseName(path)
    const config = configByName[file] ?? { blanks: [] }
    return {
      id: slug(file),
      file,
      image: url,
      title: config.title || prettify(file),
      config,
      configured: config.blanks.length > 0,
    }
  })
  // Por unidad (U4 antes que U6 y U10), después por orden dentro de la unidad.
  .sort(
    (a, b) =>
      Number(!a.config.topic) - Number(!b.config.topic) ||
      (a.config.topic ?? '').localeCompare(b.config.topic ?? '', 'es', { numeric: true }) ||
      (a.config.order ?? 999) - (b.config.order ?? 999) ||
      a.title.localeCompare(b.title, 'es'),
  )

export const findDiagram = (id: string) => diagrams.find((d) => d.id === id)

export const levelOf = (b: { level?: string }) => (b.level === 'extra' ? 'extra' : 'clave')

export interface Group {
  key: string
  unit: string
  name: string
  diagrams: Diagram[]
}

/** Gráficos agrupados por unidad («U4 · Nombre» → clave «u4»), en el orden en que aparecen. */
export const groups: Group[] = (() => {
  const map = new Map<string, Diagram[]>()
  for (const d of diagrams) {
    const topic = d.config.topic || 'Otros'
    map.set(topic, [...(map.get(topic) ?? []), d])
  }
  return [...map.entries()].map(([topic, items]) => {
    const [unit, name] = topic.split(' · ')
    return { key: slug(unit), unit: name ? unit : '', name: name ?? topic, diagrams: items }
  })
})()

export const allGroup: Group = { key: 'todo', unit: '', name: 'Todos los gráficos', diagrams: groups.flatMap((g) => g.diagrams) }

export const findGroup = (key: string) => (key === allGroup.key ? allGroup : groups.find((g) => g.key === key))
