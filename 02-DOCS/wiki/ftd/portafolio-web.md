---
author: faaf6
branch: none (sin git instalado)
status: in-progress
---

# Portafolio web (Next.js)

## Intent
Sitio de portafolio de ingeniero informático. Portada = preloader tipográfico
(`02-DOCS/portada_portafolio.txt`). Skills y desarrollos = campo de tiro
interactivo (`02-DOCS/tiro_blanco.txt`): cada botella es una skill; al romperla
se abre su ficha con nivel y proyectos.

## Scope
- App en `web/` (Next.js 16, TypeScript, Tailwind 4, estructura `components/ui`).
- `/` preloader → hero, proyectos, contacto.
- `/skills` mira telescópica: botellas = skills, placa INICIO vuelve a `/`, RESET repone.
- Contenido en un único archivo: `web/src/data/portfolio.ts`.
- Fuera: despliegue, dominio, contenido real (lo aporta el usuario).

## Checklist
- [x] Componentes copiados en `src/components/ui/` — prueba: archivos existen y compilan.
- [x] Sniper scope adaptado (targets, onHit, paused, textos ES) — prueba: `npm run build` OK.
- [x] Página `/` con preloader + hero — prueba: build + `/` responde 200.
- [x] Página `/skills` con panel de skill — prueba: build + `/skills` responde 200.
- [ ] Revisión visual en navegador (animaciones, disparo, panel) — prueba: la hace el usuario.

## Evidence
- 2026-11-08 `npm run build`: compiled, TypeScript OK, rutas `/` y `/skills` estáticas.
- 2026-11-08 `npm start` + peticiones HTTP: `/` 200, `/skills` 200.
- 2026-11-08 eslint sobre código propio: exit 0. Quedan 2 avisos de estilo
  (`react-hooks/refs`, `set-state-in-effect`) en `type-remix-preloader.tsx`, código original de la plantilla; no se tocó.

- 2026-11-08 Datos reales desde CV (`cv_aguilera.pdf`) + LinkedIn, GitHub y crival.cl en
  `web/src/data/portfolio.ts`. `npm run build` OK tras el cambio.
  Niveles de dominio (`level`) son estimaciones; el usuario debe ajustarlos.

- 2026-11-08 Home simplificado: se quitaron las secciones Proyectos, Skills y Contacto;
  el hero tiene fondo de blanco de tiro, botón "Pon a prueba mis skills" centrado y
  sin botón "Ver proyectos". Build OK, eslint de home.tsx exit 0.

- 2026-11-08 Fondo del hero cambiado del blanco de tiro a un video de YouTube
  (J3sfsP9W048, 0:24–0:44, en bucle, mudo) incrustado con youtube-nocookie.
  Build OK, eslint de home.tsx exit 0. No verificado en navegador.

- 2026-11-08 Hero: revertido a video a pantalla completa (sin marco). El nombre pasó a dos
  líneas y se mide en cqw respecto a la sección, para quedar dentro del ancho visible.
  Build OK, eslint de home.tsx exit 0. No verificado en navegador.

- 2026-11-08 Portada: el preloader usa solo la toma Cut-out (`takes={["cutout"]}`) y sin
  tablero final (`moodboard={false}`). Build OK, eslint de home.tsx exit 0. No verificado en navegador.

- 2026-11-08 Campo de tiro reorganizado: 11 botellas en 2 filas (5 arriba: perfil, contacto,
  FACH, analista, trayectoria; 6 abajo: título, 2 diplomados, cursos, inglés, proyectos).
  Tercera fila NO hecha: exige repintar el escenario (nuevo estante). Build OK, eslint exit 0.
  No verificado en navegador.

- 2026-11-08 Botella FACH renombrada a DESARROLLO / SOFTWARE ("Desarrollo de Software · FACH").
  Agregadas líneas sobre uso de Claude Code, metodología harness y MCP de Power BI Modeling,
  y un proyecto en la botella PROYECTOS. Build OK, eslint de src/data exit 0.

- 2026-11-08 Revisión de botellas aplicada: los dos diplomados van en una botella
  "DIPLOMADOS"; TÍTULO ya no dice que la especialización viene del título (viene de los
  diplomados, también corregido en la bio); PERFIL sin repetir la bio; proyectos con
  descripciones cortas. 10 botellas (5 arriba, 5 abajo). Build OK, eslint exit 0.

## Next
- Usuario: revisar en navegador (`npm run dev`) y ajustar niveles.
- Pendiente: más certificaciones (usuario las aportará).
- Pendiente: sección para dashboards de Power BI (embed por iframe, según cómo se publiquen).
