"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { SniperScope } from "@/components/ui/sniper-scope";
import { entries } from "@/data/portfolio";

const targets = entries.map((e) => ({ label: e.label, sub: e.sub }));

export function SkillRange() {
  const [active, setActive] = useState<number | null>(null);
  const entry = active === null ? null : entries[active];

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <SniperScope homeHref="/" targets={targets} onHit={setActive} paused={active !== null} />

      <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center p-5 font-mono text-[12px] text-white/50">
        <Link href="/" className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-white/80 hover:underline">
          <ArrowLeft className="size-3.5" /> Volver al inicio
        </Link>
      </div>

      {entry && active !== null && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-title"
            className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[rgb(98,255,143)]/30 bg-neutral-950 p-6 text-neutral-100 shadow-[0_0_60px_rgba(98,255,143,0.12)] sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              onClick={() => setActive(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[rgb(98,255,143)]">
              Impacto confirmado · {entry.kind} · {String(active + 1).padStart(2, "0")}/{String(entries.length).padStart(2, "0")}
            </p>
            <h2 id="entry-title" className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
              {entry.title}
            </h2>

            {entry.lines.length > 0 && (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-300">
                {entry.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}

            {entry.links && (
              <div className="mt-5 flex flex-wrap gap-2">
                {entry.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/20 px-3 py-1.5 font-mono text-xs uppercase tracking-widest hover:border-white/60"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}

            {entry.projects && entry.projects.length > 0 && (
              <ul className="mt-6 space-y-3">
                {entry.projects.map((p) => (
                  <li key={p.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{p.title}</span>
                      {p.href && (
                        <a href={p.href} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white" aria-label={`Abrir ${p.title}`}>
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-neutral-400">{p.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.stack.map((t) => (
                        <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px] text-neutral-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setActive(null)}
              className="mt-6 w-full rounded-full bg-[rgb(98,255,143)] py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-black hover:brightness-110"
            >
              Seguir disparando
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
