import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Permite que el editor guarde los huecos directamente en src/graficos/<archivo>.json (solo en `npm run dev`).
function saveGraficos(): Plugin {
  return {
    name: 'save-graficos',
    configureServer(server) {
      server.middlewares.use('/__save-grafico', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            const { file, config } = JSON.parse(body)
            if (typeof file !== 'string' || !file || /[\\/]|\.\./.test(file)) throw new Error('Nombre de archivo inválido')
            writeFileSync(resolve(__dirname, 'src/graficos', `${file}.json`), JSON.stringify(config, null, 2) + '\n')
            res.end('ok')
          } catch (err) {
            res.statusCode = 400
            res.end(String(err))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), saveGraficos()],
})
