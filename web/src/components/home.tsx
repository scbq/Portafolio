"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Crosshair } from "lucide-react";
import TypeRemixPreloader from "@/components/ui/type-remix-preloader";
import { profile } from "@/data/portfolio";

const SEEN_KEY = "portfolio:intro-seen";

const noopSubscribe = () => () => {};
function readSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Fondo: tramo 0:24–0:44 del video, en bucle, sin controles y silenciado. */
const BG_VIDEO =
  "https://www.youtube-nocookie.com/embed/J3sfsP9W048?start=24&end=44&autoplay=1&mute=1&loop=1&playlist=J3sfsP9W048&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1";

/** Video a pantalla completa (cubre la sección, sin marco). */
function BackgroundVideo() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Cubre toda la sección manteniendo proporción 16:9 */}
      <iframe
        src={BG_VIDEO}
        title=""
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        className="absolute left-1/2 top-1/2 h-[max(100svh,56.25vw)] w-[max(100vw,177.78svh)] -translate-x-1/2 -translate-y-1/2 border-0"
      />
      <div className="absolute inset-0 bg-black/55" />
    </div>
  );
}

function Hero() {
  return (
    // @container: las medidas cqw son respecto a la sección, así el nombre se ajusta al ancho visible.
    <section className="@container relative flex h-svh flex-col justify-between overflow-hidden bg-[#0d0d0d] px-[4cqw] py-6 text-[#f5f3ee] sm:py-8">
      <BackgroundVideo />

      <header className="relative flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
        <span>{profile.handle}</span>
      </header>

      <div className="relative flex flex-col items-center text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8f03c]">
          {profile.role} · {profile.location}
        </p>
        <h1 className="mt-4 font-display text-[7cqw] uppercase leading-[0.92] tracking-tight">
          <span className="block whitespace-nowrap">FELIPE AGUILERA</span>
          <span className="block whitespace-nowrap">FUENTEALBA</span>
        </h1>
        <Link
          href="/skills"
          className="mt-10 inline-flex items-center gap-3 rounded-full bg-[#d8f03c] px-10 py-5 font-mono text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_40px_rgba(216,240,60,0.35)] transition hover:scale-105 hover:brightness-110 sm:text-base"
        >
          <Crosshair className="size-5" /> QUIERES SABER MAS DE MI?
        </Link>
      </div>

      <div className="relative flex items-end justify-center font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
        <span>{profile.period}</span>
      </div>
    </section>
  );
}

export function Home() {
  // null = still deciding (first paint), true = play the intro, false = skip it.
  const seen = useSyncExternalStore(noopSubscribe, readSeen, () => null);
  const [finished, setFinished] = useState(false);
  const intro = seen === null ? null : !seen && !finished;

  useEffect(() => {
    document.documentElement.style.overflow = intro ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [intro]);

  const finish = () => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setFinished(true);
  };

  return (
    <main>
      {intro === null ? (
        <div className="h-svh bg-[#0b0b0b]" />
      ) : intro ? (
        <TypeRemixPreloader
          word="PORTAFOLIO"
          name={profile.name}
          discipline={profile.role}
          year={profile.year}
          period={profile.period}
          handle={profile.handle}
          roles={profile.roles}
          kicker="Un Ingeniero"
          tagline="Software · Web · Datos"
          motto="hecho con código"
          takes={["cutout"]}
          moodboard={false}
          onComplete={finish}
        >
          <Hero />
        </TypeRemixPreloader>
      ) : (
        <Hero />
      )}
    </main>
  );
}
