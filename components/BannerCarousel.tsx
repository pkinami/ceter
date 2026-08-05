"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, PanInfo, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import type { Banner } from "@/lib/types";

type BannerVariant = "main" | "category" | "services";

const toneClass = [
  "from-blue-950 via-slate-900 to-slate-800",
  "from-teal-900 via-slate-900 to-slate-800",
  "from-slate-950 via-blue-950 to-teal-900",
  "from-slate-950 via-slate-800 to-amber-800"
];

const variantConfig = {
  main: {
    interval: 4500,
    duration: 0.85,
    sectionClass: "min-h-[360px] sm:min-h-[430px] lg:min-h-[480px]",
    contentClass: "min-h-[360px] sm:min-h-[430px] lg:min-h-[480px] px-5 py-8 sm:px-8 lg:px-12",
    titleClass: "text-3xl sm:text-5xl lg:text-6xl",
    bodyClass: "text-base sm:text-lg",
    imageClass: "scale-[1.04]",
    initial: { opacity: 0, x: 56 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -56 }
  },
  category: {
    interval: 3000,
    duration: 0.6,
    sectionClass: "min-h-[190px] sm:min-h-[230px]",
    contentClass: "min-h-[190px] sm:min-h-[230px] px-5 py-6 sm:px-8",
    titleClass: "text-2xl sm:text-3xl",
    bodyClass: "text-sm sm:text-base",
    imageClass: "scale-100",
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -28 }
  },
  services: {
    interval: 5000,
    duration: 0.8,
    sectionClass: "min-h-[210px] sm:min-h-[260px]",
    contentClass: "min-h-[210px] sm:min-h-[260px] px-5 py-6 sm:px-8",
    titleClass: "text-2xl sm:text-4xl",
    bodyClass: "text-sm sm:text-base",
    imageClass: "scale-[1.02]",
    initial: { opacity: 0, x: 40, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -40, scale: 1.02 }
  }
};

export function BannerCarousel({
  banners,
  compact = false,
  variant = compact ? "category" : "main",
  className
}: {
  banners: Banner[];
  compact?: boolean;
  variant?: BannerVariant;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const config = variantConfig[variant];
  const visibleBanners = banners.length ? banners : [fallbackBanner];

  useEffect(() => {
    setActive(0);
  }, [banners]);

  useEffect(() => {
    if (paused || visibleBanners.length <= 1) return;
    const id = window.setInterval(() => setActive((current) => (current + 1) % visibleBanners.length), config.interval);
    return () => window.clearInterval(id);
  }, [config.interval, paused, visibleBanners.length]);

  function move(direction: number) {
    setActive((current) => (current + direction + visibleBanners.length) % visibleBanners.length);
  }

  function onDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x > 50) move(-1);
    if (info.offset.x < -50) move(1);
  }

  const banner = visibleBanners[active] ?? visibleBanners[0];
  const transition = reduceMotion ? { duration: 0 } : { duration: config.duration, ease: [0.22, 1, 0.36, 1] };
  const motionState = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : { initial: config.initial, animate: config.animate, exit: config.exit };

  return (
    <section
      className={cn("relative isolate overflow-hidden rounded-lg border border-slate-300 bg-slate-950 shadow-industrial", config.sectionClass, className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          drag={reduceMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={onDragEnd}
          className={cn("absolute inset-0 cursor-grab overflow-hidden bg-gradient-to-br text-white", toneClass[active % toneClass.length])}
          initial={motionState.initial}
          animate={motionState.animate}
          exit={motionState.exit}
          transition={transition}
        >
          <BannerImage banner={banner} imageClass={config.imageClass} reduceMotion={Boolean(reduceMotion)} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/58 to-slate-950/18" />
          <div className="industrial-grid absolute inset-0 opacity-45" />
          <div className={cn("relative z-10 flex h-full max-w-4xl flex-col justify-center", config.contentClass)}>
            {banner.kicker ? <p className="text-xs font-bold uppercase tracking-normal text-teal-200 sm:text-sm">{banner.kicker}</p> : null}
            <h1 className={cn("mt-3 max-w-3xl font-black leading-tight text-balance", config.titleClass)}>{banner.title}</h1>
            <p className={cn("mt-3 max-w-2xl leading-7 text-slate-100", config.bodyClass)}>{banner.body}</p>
            {banner.ctaLabel && banner.ctaHref ? (
              <Link href={banner.ctaHref} className="mt-5 inline-flex w-fit rounded-md bg-white px-5 py-3 text-sm font-bold text-ink shadow hover:bg-slate-100">
                {banner.ctaLabel}
              </Link>
            ) : null}
          </div>
        </motion.div>
      </AnimatePresence>

      {visibleBanners.length > 1 ? (
        <>
          <Tooltip label="Previous banner">
            <button className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/92 p-2 text-ink shadow hover:bg-white" onClick={() => move(-1)} aria-label="Previous banner">
              <ChevronLeft className="h-5 w-5" />
            </button>
          </Tooltip>
          <Tooltip label="Next banner">
            <button className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/92 p-2 text-ink shadow hover:bg-white" onClick={() => move(1)} aria-label="Next banner">
              <ChevronRight className="h-5 w-5" />
            </button>
          </Tooltip>
        </>
      ) : null}

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {visibleBanners.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setActive(index)}
            className={cn("h-2.5 rounded-full bg-white/55 transition-all hover:bg-white", index === active ? "w-8 bg-white" : "w-2.5")}
            aria-label={`Go to banner ${index + 1}`}
            aria-current={index === active}
          />
        ))}
      </div>
    </section>
  );
}

function BannerImage({ banner, imageClass, reduceMotion }: { banner: Banner; imageClass: string; reduceMotion: boolean }) {
  const desktopImage = banner.image || "/product-placeholder.svg";
  const mobileImage = banner.mobileImage || desktopImage;

  return (
    <picture className="absolute inset-0">
      <source media="(max-width: 640px)" srcSet={mobileImage} />
      <motion.img
        src={desktopImage}
        alt=""
        aria-hidden="true"
        className={cn("h-full w-full object-cover object-center", imageClass)}
        loading="eager"
        decoding="async"
        initial={reduceMotion ? false : { scale: 1 }}
        animate={reduceMotion ? {} : { scale: 1.08 }}
        transition={{ duration: 8, ease: "easeOut" }}
      />
    </picture>
  );
}

const fallbackBanner: Banner = {
  id: "fallback",
  title: "Commercial technology for busy offices",
  kicker: "Ceter Technologies Limited",
  body: "Shop equipment, consumables and services for business operations.",
  ctaLabel: "Browse catalog",
  ctaHref: "/category",
  image: null,
  mobileImage: null,
  placement: "main",
  categoryId: null,
  sortOrder: 0
};
