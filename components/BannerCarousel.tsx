"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { banners } from "@/data/mockBanners";
import { Tooltip } from "@/components/Tooltip";
import { cn } from "@/lib/utils";

const toneClass = {
  blue: "from-blue-900 via-slate-800 to-slate-700",
  teal: "from-teal-800 via-slate-800 to-slate-700",
  amber: "from-amber-700 via-slate-800 to-slate-700",
  slate: "from-slate-900 via-slate-700 to-blue-900"
};

export function BannerCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setActive((current) => (current + 1) % banners.length), 4500);
    return () => window.clearInterval(id);
  }, [paused]);

  function move(direction: number) {
    setActive((current) => (current + direction + banners.length) % banners.length);
  }

  function onDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x > 60) move(-1);
    if (info.offset.x < -60) move(1);
  }

  const banner = banners[active];

  return (
    <section className="relative overflow-hidden rounded-lg border border-slate-300 bg-slate-900 shadow-industrial" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={onDragEnd}
          className={cn("industrial-grid min-h-[310px] cursor-grab bg-gradient-to-br p-6 text-white sm:p-8", toneClass[banner.tone])}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ duration: 0.22 }}
        >
          <div className="grid min-h-[250px] items-center gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-normal text-teal-200">{banner.kicker}</p>
              <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">{banner.title}</h1>
              <p className="mt-4 max-w-xl text-base text-slate-200">{banner.body}</p>
              <button className="mt-6 rounded-md bg-white px-5 py-3 text-sm font-bold text-ink hover:bg-slate-100">{banner.cta}</button>
            </div>
            <div className="hidden min-h-[210px] items-center justify-center md:flex">
              <div className="relative h-48 w-72 rounded-lg border border-white/20 bg-white/10 p-5 shadow-2xl">
                <div className="absolute left-10 top-6 h-24 w-52 rounded-md bg-white/70" />
                <div className="absolute bottom-8 left-5 h-28 w-60 rounded-md bg-slate-100/95" />
                <div className="absolute bottom-14 right-12 h-5 w-5 rounded-full bg-teal-400" />
                <div className="absolute bottom-16 left-12 h-3 w-36 rounded bg-slate-400" />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <Tooltip label="Previous banner">
        <button className="absolute left-3 top-1/2 rounded-full bg-white/90 p-2 text-ink shadow hover:bg-white" onClick={() => move(-1)} aria-label="Previous banner">
          <ChevronLeft className="h-5 w-5" />
        </button>
      </Tooltip>
      <Tooltip label="Next banner">
        <button className="absolute right-3 top-1/2 rounded-full bg-white/90 p-2 text-ink shadow hover:bg-white" onClick={() => move(1)} aria-label="Next banner">
          <ChevronRight className="h-5 w-5" />
        </button>
      </Tooltip>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {banners.map((item, index) => (
          <button key={item.id} onClick={() => setActive(index)} className={cn("h-2.5 rounded-full transition-all", index === active ? "w-8 bg-white" : "w-2.5 bg-white/50")} aria-label={`Go to banner ${index + 1}`} />
        ))}
      </div>
    </section>
  );
}
