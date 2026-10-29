export type Level = 'clave' | 'extra'

/** Hueco a completar. Coordenadas en píxeles de la imagen original. */
export interface Blank {
  id: string
  x: number
  y: number
  w: number
  h: number
  answer: string
  /** Otras respuestas que también se aceptan como correctas. */
  accept?: string[]
  level?: Level
}

export interface DiagramConfig {
  title?: string
  topic?: string
  width?: number
  height?: number
  /** Tamaño de letra de los huecos, en píxeles de la imagen original. */
  fontSize?: number
  order?: number
  blanks: Blank[]
}

export interface Diagram {
  id: string
  /** Nombre del archivo sin extensión (se usa para guardar el .json). */
  file: string
  image: string
  title: string
  config: DiagramConfig
  configured: boolean
}

export type Grade = 'ok' | 'close' | 'bad'
