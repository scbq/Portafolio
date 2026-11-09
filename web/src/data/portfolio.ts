// ─────────────────────────────────────────────────────────────────────────────
// TU INFORMACIÓN. Edita solo este archivo para personalizar el portafolio.
// Datos tomados de tu CV. Cada entrada es una botella del campo de tiro (/skills).
// Fila de arriba: perfil, contacto y experiencia laboral (5 botellas).
// Fila de abajo: formación, cursos, idioma y proyectos (6 botellas).
// ─────────────────────────────────────────────────────────────────────────────

export type Project = {
  title: string;
  description: string;
  stack: string[];
  /** Enlace al repo o demo (opcional). */
  href?: string;
};

export type Entry = {
  /** Texto corto pintado en la etiqueta de la botella (máx. ~10 letras). */
  label: string;
  /** Segunda línea pequeña de la etiqueta. */
  sub: string;
  /** Categoría que aparece arriba en el panel. */
  kind: "Perfil" | "Contacto" | "Experiencia" | "Académico" | "Idioma" | "Proyectos";
  /** Título del panel. */
  title: string;
  /** Líneas de detalle (viñetas). */
  lines: string[];
  /** Enlaces (opcional). */
  links?: { label: string; href: string }[];
  /** Proyectos listados en el panel (opcional). */
  projects?: Project[];
};

export const profile = {
  name: "Felipe Aguilera Fuentealba",
  role: "Ingeniero en Informática",
  handle: "github.com/scbq",
  location: "Maipú, Chile",
  year: "2026",
  period: "Portafolio — 2026",
  bio: "Ingeniero en Informática con diplomados en Transformación Digital e Inteligencia Artificial. Desarrollo software y mejoro procesos analíticos y visuales, con foco en liderazgo proactivo, trabajo colaborativo con equipos multidisciplinarios y excelencia operativa.",
  email: "felipe.aguilera.fuentealba@gmail.com",
  phone: "+56 9 5411 5922",
  github: "https://github.com/scbq",
  linkedin: "https://www.linkedin.com/in/felipe-aguilera-fuentealba-961b37147",
  roles: ["Power BI", "Desarrollo Web", "Análisis de Datos", "Transformación Digital"],
};

/** Orden: primeras 5 = fila de arriba; las siguientes 6 = fila de abajo. Máximo 11. */
export const entries: Entry[] = [
  // ── Fila de arriba: personal, contacto y experiencia ──
  {
    label: "PERFIL",
    sub: "PERSONAL",
    kind: "Perfil",
    title: profile.name,
    lines: [`${profile.role} · ${profile.location}`],
  },
  {
    label: "CONTACTO",
    sub: "ESCRIBEME",
    kind: "Contacto",
    title: "Hablemos",
    lines: [profile.email, profile.phone],
    links: [
      { label: "GitHub", href: profile.github },
      { label: "LinkedIn", href: profile.linkedin },
      { label: "Correo", href: `mailto:${profile.email}` },
    ],
  },
  {
    label: "DESARROLLO",
    sub: "SOFTWARE",
    kind: "Experiencia",
    title: "Desarrollo de Software · Fuerza Aérea de Chile (2026)",
    lines: [
      "Desarrollo software web para la FACH, de alto estándar de seguridad y calidad, bajo estándares institucionales.",
      "Diseñé la propuesta de «Ficha Social Institucional», aprobada por el alto mando.",
      "Coordiné con la Contraloría General de la República la validación del sistema de análisis de intereses y patrimonio.",
      "Implementé indicadores estratégicos de apoyo social y económico para el personal.",
      "Stack: Angular y Spring Boot.",
      "Uso agentes de IA como Claude Code y Antigravity (Google), y la metodología harness, como en este mismo proyecto.",
    ],
  },
  {
    label: "ANALISTA",
    sub: "2025",
    kind: "Experiencia",
    title: "Analista de Datos",
    lines: [
      "Dashboards interactivos en Power BI y propuestas de diseño para mejorar la comprensión de los datos.",
      "Modelado y análisis con DAX y SQL Server, cuidando la integridad y eficiencia del procesamiento.",
      "Requerimientos del área de Riesgos de Cobranza transformados en soluciones analíticas.",
      "Conecté el MCP de Power BI Modeling para el análisis de datos, usando agentes de IA como Claude Code.",
    ],
  },
  {
    label: "TRAYECTORIA",
    sub: "2005–2024",
    kind: "Experiencia",
    title: "Soporte informático y control de tránsito aéreo",
    lines: [
      "Soporte informático (2014–2024): instalación, configuración y diagnóstico de hardware y software, con atención presencial y remota.",
      "Controlador de tránsito aéreo (2005–2013): comunicaciones aeronáuticas, coordinación precisa y toma de decisiones bajo presión.",
    ],
  },

  // ── Fila de abajo: formación, cursos, idioma y proyectos ──
  {
    label: "TÍTULO",
    sub: "UMAYOR",
    kind: "Académico",
    title: "Ingeniería en Informática · Universidad Mayor",
    lines: ["2022 – 2025"],
  },
  {
    label: "DIPLOMADOS",
    sub: "TD · IA",
    kind: "Académico",
    title: "Diplomados",
    lines: [
      "Gestión para la Transformación Digital · Universidad de Chile, Facultad de Economía y Negocios.",
      "Inteligencia Artificial · Universidad de Chile, Facultad de Ciencias Físicas y Matemáticas.",
    ],
  },
  {
    label: "CURSOS",
    sub: "PROGRAMACIÓN",
    kind: "Académico",
    title: "Bootcamp y cursos de programación",
    lines: [
      "Bootcamp Programación en Ruby on Rails · Instituto Inforcap (2024).",
      "Curso Programación en C# · Instituto Web CoderHouse (2022).",
      "Curso Programación Python · Cisco Networking Academy (2022).",
    ],
  },
  {
    label: "INGLÉS",
    sub: "IDIOMA",
    kind: "Idioma",
    title: "Idioma",
    lines: ["Inglés, nivel medio."],
  },
  {
    label: "PROYECTOS",
    sub: "DESARROLLOS",
    kind: "Proyectos",
    title: "Desarrollos realizados",
    lines: [],
    projects: [
      {
        title: "Dashboards de Riesgos de Cobranza",
        description: "Dashboards interactivos para el área de Riesgos de Cobranza.",
        stack: ["Power BI", "DAX", "SQL Server"],
      },
      {
        title: "Ficha Social Institucional",
        description: "Perfil socioeconómico del personal de la FACH.",
        stack: ["Spring Boot", "Angular"],
      },
      {
        title: "Flujo con agentes de IA y metodología harness",
        description: "Metodología de desarrollo con agentes de IA.",
        stack: ["Claude Code", "Antigravity", "Harness"],
      },
      {
        title: "crival.cl",
        description: "Sitio web desarrollado por mí.",
        stack: ["Web"],
        href: "https://crival.cl/",
      },
    ],
  },
];
