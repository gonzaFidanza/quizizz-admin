# Repaso ASI

App para repasar el parcial de Administración de Sistemas de Información.

```bash
npm install
npm run dev
```

## Secciones

1. **Gráficos.** Se completan los textos clave de cada gráfico, como en el parcial.
   - **Estudio:** el gráfico completo con los conceptos marcados. Tocás un concepto para taparlo y te autoevaluás.
   - **Práctica:** los textos desaparecen y los completás. La corrección es al instante y tenés segunda oportunidad, pistas progresivas y la opción de revelar.
   - **Simulacro:** sin ayudas y con cronómetro. Ves el resultado recién al entregar.
   - Filtros: **Clave** (lo que suele tomarse), **Todo** y **Mis errores**.
   - La corrección ignora mayúsculas, tildes, artículos y errores de tipeo chicos.
   - El progreso se guarda en el navegador: un concepto queda dominado cuando lo acertás 2 veces seguidas.
   - **Practicar en serie:** una unidad entera (U4, U5, U6) o todo junto, un gráfico atrás del otro y con un resumen al final. Se elige modo, huecos y orden (en orden o mezclado), y si salís podés seguir donde quedaste.
2. **Mapas mentales.** Los 21 mapas de `material/Mapas_Unidades_4_5_6_Impresion.pdf` con la misma estructura.
   - Tocás un concepto y se abre su definición tal como está en el apunte, con la página de referencia. Desde ahí podés ver la sección completa.
   - La rama o el centro del mapa muestran sus conceptos y las secciones del apunte relacionadas.
   - Con ← y → pasás de concepto en concepto, y con Esc cerrás.
   - Los datos están en `src/mapas/mapas.json` (cada concepto lista en `refs` los párrafos del apunte) y `src/mapas/apunte.json`.
3. **Crucigramas:** uno por mapa mental.
4. **Multiple choice:** próximamente.

## Dónde poner el material

| Qué | Dónde |
| --- | --- |
| PDFs o fotos crudas de gráficos | `material/graficos/` |
| PDFs o fotos de modelos de parcial (multiple choice) | `material/multiple-choice/` |
| Gráfico ya recortado (PNG/JPG/WEBP) | `src/graficos/` |

Cada imagen de `src/graficos/` aparece sola en la app. Sus huecos se definen en un `.json` con el mismo nombre, por ejemplo `proceso-entrenamiento-rrhh.png` y `proceso-entrenamiento-rrhh.json`.

Para crear o ajustar huecos, abrí el gráfico y entrá a **Editar huecos**. Arrastrás sobre el texto, escribís la respuesta y apretás **Guardar**, que escribe el `.json` directamente.
