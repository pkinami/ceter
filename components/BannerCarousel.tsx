"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, PanInfo, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import type { Banner } from "@/lib/types";
import { bannerVariantSrcSet, getBannerFallbackUrl, getBannerSrcSet, normalizePublicAssetUrl, type BannerManifestEntry } from "@/lib/banner-schema";

type BannerVariant = "main" | "category" | "services";

const variantConfig = {
  main: {
    interval: 15000,
    duration: 0.85,
    sectionClass: "aspect-[9/5] md:aspect-[2.33/1] xl:aspect-[32/9] min-h-[320px] md:min-h-[360px]",
    contentClass: "h-full px-5 py-8 sm:px-8 lg:px-12",
    titleClass: "text-3xl sm:text-5xl lg:text-6xl",
    bodyClass: "text-base sm:text-lg",
    imageClass: "scale-[1.04]",
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  },
  category: {
    interval: 15000,
    duration: 0.6,
    sectionClass: "aspect-[9/5] md:aspect-[21/9] lg:aspect-[32/9] min-h-[190px]",
    contentClass: "h-full px-5 py-6 sm:px-8",
    titleClass: "text-2xl sm:text-3xl",
    bodyClass: "text-sm sm:text-base",
    imageClass: "scale-100",
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  },
  services: {
    interval: 15000,
    duration: 0.8,
    sectionClass: "aspect-[5/3] md:aspect-[2/1] lg:aspect-[16/5] min-h-[210px]",
    contentClass: "h-full px-5 py-6 sm:px-8",
    titleClass: "text-2xl sm:text-4xl",
    bodyClass: "text-sm sm:text-base",
    imageClass: "scale-[1.02]",
    initial: { opacity: 0 },
    animate: { opacity: 1 }
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
  const [rotationResetKey, setRotationResetKey] = useState(0);
  const requestIdRef = useRef(0);
  const reduceMotion = useReducedMotion();
  const config = variantConfig[variant];
  const visibleBanners = useMemo(() => banners, [banners]);

  const moveTo = useCallback(async (index: number, manual = false) => {
    const nextIndex = (index + visibleBanners.length) % visibleBanners.length;
    if (nextIndex === active) return;

    if (manual) {
      setPaused(true);
      window.setTimeout(() => setPaused(false), 900);
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const ready = await preloadBanner(visibleBanners[nextIndex]);
    if (requestIdRef.current !== requestId || !ready) return;
    setActive(nextIndex);
    if (manual) setRotationResetKey((key) => key + 1);
  }, [active, visibleBanners]);

  useEffect(() => {
    setActive(0);
    requestIdRef.current += 1;
  }, [banners]);

  useEffect(() => {
    if (paused || visibleBanners.length <= 1) return;
    const id = window.setTimeout(() => {
      void moveTo((active + 1) % visibleBanners.length);
    }, config.interval);
    return () => window.clearTimeout(id);
  }, [active, config.interval, moveTo, paused, rotationResetKey, visibleBanners.length]);

  useEffect(() => {
    if (visibleBanners.length <= 1) return;
    void preloadBanner(visibleBanners[(active + 1) % visibleBanners.length]);
  }, [active, visibleBanners]);

  function move(direction: number) {
    void moveTo(active + direction, true);
  }

  function onDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x > 50) move(-1);
    if (info.offset.x < -50) move(1);
  }

  if (!visibleBanners.length) return null;

  const transition = reduceMotion ? { duration: 0 } : { duration: config.duration, ease: [0.22, 1, 0.36, 1] };
  const motionState = reduceMotion ? { animate: { opacity: 1 } } : { animate: config.animate };

  return (
    <section
      className={cn("relative isolate overflow-hidden rounded-lg border border-slate-300 bg-ink shadow-industrial", config.sectionClass, className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {visibleBanners.map((item, index) => (
        <motion.div
          key={item.id}
          drag={index === active && !reduceMotion ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={onDragEnd}
          className={cn("absolute inset-0 overflow-hidden bg-ink text-white will-change-opacity", index === active ? "z-10 cursor-grab" : "z-0 pointer-events-none")}
          initial={false}
          animate={index === active ? motionState.animate : { opacity: 0 }}
          transition={transition}
          aria-hidden={index !== active}
        >
          <BannerImage banner={item} imageClass={config.imageClass} reduceMotion={Boolean(reduceMotion)} active={index === active} />
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-ink/90 via-ink/50 to-ink/10" />
          <div className={cn("relative z-20 flex h-full max-w-4xl flex-col justify-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]", config.contentClass)}>
            {item.kicker ? <p className="text-xs font-bold uppercase tracking-normal text-teal-200 sm:text-sm">{item.kicker}</p> : null}
            <h1 className={cn("mt-3 max-w-3xl font-black leading-tight text-balance", config.titleClass)}>{item.title}</h1>
            <p className={cn("mt-3 max-w-2xl leading-7 text-slate-100", config.bodyClass)}>{item.body}</p>
            {item.ctaLabel && item.ctaHref ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={item.ctaHref} className="inline-flex w-fit rounded-md bg-white px-5 py-3 text-sm font-bold text-ink shadow hover:bg-slate-100">
                  {item.ctaLabel}
                </Link>
                {item.secondaryCtaLabel && item.secondaryCtaHref ? (
                  <Link href={item.secondaryCtaHref} className="inline-flex w-fit rounded-md border border-white/80 bg-white/15 px-5 py-3 text-sm font-bold text-white shadow hover:bg-white/25">
                    {item.secondaryCtaLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </motion.div>
      ))}

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
            onClick={() => void moveTo(index, true)}
            className={cn("h-2.5 rounded-full bg-white/55 transition-all hover:bg-white", index === active ? "w-8 bg-white" : "w-2.5")}
            aria-label={`Go to banner ${index + 1}`}
            aria-current={index === active}
          />
        ))}
      </div>
    </section>
  );
}

function BannerImage({ banner, imageClass, reduceMotion, active }: { banner: Banner; imageClass: string; reduceMotion: boolean; active: boolean }) {
  const manifestBanner = hasResponsiveAssets(banner) ? banner : null;
  const variantImages = banner.imageVariants ?? [];
  const hasVariantImages = variantImages.length > 0;
  const responsiveDbImages = !manifestBanner && banner.image && banner.laptopImage && banner.mobileImage;
  const fallbackImage = normalizePublicAssetUrl(manifestBanner ? getBannerFallbackUrl(manifestBanner) : variantImages.find((variant) => variant.shape === "wide")?.url ?? variantImages[0]?.url ?? banner.image);
  const [imageMode, setImageMode] = useState<"responsive" | "fallback" | "hidden">("responsive");

  useEffect(() => {
    setImageMode("responsive");
  }, [banner.id, fallbackImage]);

  if (imageMode === "hidden" || !fallbackImage) return null;

  const useResponsiveSources = Boolean(manifestBanner && imageMode === "responsive");
  const priority = manifestBanner?.priority ?? "lazy";

  return (
    <picture className="absolute inset-0 z-0 block h-full w-full overflow-hidden bg-ink">
      {manifestBanner && useResponsiveSources ? (
        <>
          <source media={manifestBanner.assets.wide.media} srcSet={getBannerSrcSet(manifestBanner, "wide")} sizes={manifestBanner.assets.wide.sizes} type="image/webp" />
          <source media={manifestBanner.assets.mid.media} srcSet={getBannerSrcSet(manifestBanner, "mid")} sizes={manifestBanner.assets.mid.sizes} type="image/webp" />
          <source media={manifestBanner.assets.tall.media} srcSet={getBannerSrcSet(manifestBanner, "tall")} sizes={manifestBanner.assets.tall.sizes} type="image/webp" />
        </>
      ) : hasVariantImages ? (
        <>
          <source media="(min-aspect-ratio: 28/10)" srcSet={bannerVariantSrcSet(variantImages, "wide")} sizes="100vw" />
          <source media="(min-aspect-ratio: 20/10)" srcSet={bannerVariantSrcSet(variantImages, "mid")} sizes="100vw" />
          <source srcSet={bannerVariantSrcSet(variantImages, "tall") || bannerVariantSrcSet(variantImages, "mid") || bannerVariantSrcSet(variantImages, "wide")} sizes="100vw" />
        </>
      ) : responsiveDbImages ? (
        <>
          <source media="(min-width: 1024px)" srcSet={normalizePublicAssetUrl(banner.image) ?? ""} />
          <source media="(min-width: 640px)" srcSet={normalizePublicAssetUrl(banner.laptopImage) ?? ""} />
          <source srcSet={normalizePublicAssetUrl(banner.mobileImage) ?? ""} />
        </>
      ) : null}
      <motion.img
        src={fallbackImage}
        alt={banner.alt}
        width={1920}
        height={720}
        onError={(event) => {
          const failedUrl = event.currentTarget.currentSrc || event.currentTarget.src;
          setImageMode(useResponsiveSources && failedUrl !== new URL(fallbackImage, window.location.href).href ? "fallback" : "hidden");
        }}
        className={cn("absolute inset-0 h-full w-full transform-gpu object-cover object-center [backface-visibility:hidden] will-change-transform", imageClass)}
        loading={priority === "high" ? "eager" : "lazy"}
        fetchPriority={priority === "high" ? "high" : "auto"}
        decoding="async"
        initial={false}
        animate={reduceMotion || !active ? { scale: 1.04 } : { scale: 1.08 }}
        transition={{ duration: 8, ease: "easeOut" }}
      />
    </picture>
  );
}

async function preloadBanner(banner: Banner) {
  const urls = getBannerImageUrls(banner);
  if (!urls.length) return true;
  const results = await Promise.allSettled(urls.map(preloadImage));
  return results.some((result) => result.status === "fulfilled");
}

function preloadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = reject;
    image.decoding = "async";
    image.src = src;
    if (image.decode) {
      image.decode().then(resolve).catch(() => {});
    }
  });
}

function getBannerImageUrls(banner: Banner) {
  const manifestBanner = hasResponsiveAssets(banner) ? banner : null;
  const urls = new Set<string>();
  const fallbackImage = normalizePublicAssetUrl(manifestBanner ? getBannerFallbackUrl(manifestBanner) : banner.image);
  if (fallbackImage) urls.add(fallbackImage);
  if (manifestBanner) {
    for (const variant of ["wide", "mid", "tall"] as const) {
      for (const entry of getBannerSrcSet(manifestBanner, variant).split(",")) {
        const [url] = entry.trim().split(/\s+/);
        if (url) urls.add(url);
      }
    }
  } else {
    for (const variant of banner.imageVariants ?? []) {
      if (variant.url) urls.add(variant.url);
    }
    for (const url of [banner.image, banner.laptopImage, banner.mobileImage]) {
      const normalized = normalizePublicAssetUrl(url);
      if (normalized) urls.add(normalized);
    }
  }
  return [...urls];
}

function hasResponsiveAssets(banner: Banner): banner is BannerManifestEntry {
  return "assets" in banner && Boolean((banner as BannerManifestEntry).assets?.wide);
}
