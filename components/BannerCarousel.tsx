"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, PanInfo, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getImageProps } from "next/image";
import { cn } from "@/lib/utils";
import type { Banner } from "@/lib/types";
import { getBannerAssetUrl, getBannerFallbackUrl, getBannerSrcSet, normalizePublicAssetUrl, type BannerManifestEntry, type LoadingPriority } from "@/lib/banner-schema";

type BannerVariant = "main" | "category" | "services";

const variantConfig = {
  main: {
    interval: 15000,
    duration: 0.55,
    sectionClass: "h-[clamp(336px,52svh,384px)] min-h-0 max-h-none sm:aspect-[9/5] sm:h-auto sm:min-h-[330px] md:aspect-auto md:h-[clamp(220px,18vw,250px)] md:min-h-0 2xl:h-[clamp(270px,15vw,290px)]",
    contentClass: "h-full justify-end px-4 pb-11 pt-[178px] sm:justify-center sm:px-8 sm:py-6 md:max-w-[45%] lg:px-9",
    titleClass: "text-[23px] leading-7 sm:text-4xl sm:leading-[1.08] lg:text-[40px]",
    bodyClass: "text-[13px] sm:text-[15px] lg:text-base",
    imageClass: "",
    imageWrapClass: "bottom-[45%] sm:bottom-0",
    overlayClass: "bg-gradient-to-b from-ink/10 via-ink/20 to-ink/96 sm:bg-gradient-to-r sm:from-ink/88 sm:via-ink/35 sm:to-ink/0",
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  },
  category: {
    interval: 15000,
    duration: 0.6,
    sectionClass: "aspect-[4/5] min-h-[260px] max-h-[min(54dvh,460px)] sm:aspect-[9/5] md:aspect-[21/9] lg:aspect-[32/9] md:min-h-[190px]",
    contentClass: "h-full px-5 py-6 sm:px-8",
    titleClass: "text-2xl sm:text-3xl",
    bodyClass: "text-sm sm:text-base",
    imageClass: "scale-100",
    imageWrapClass: "",
    overlayClass: "bg-gradient-to-r from-ink/90 via-ink/50 to-ink/10",
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  },
  services: {
    interval: 15000,
    duration: 0.8,
    sectionClass: "aspect-[4/5] min-h-[260px] max-h-[min(54dvh,480px)] sm:aspect-[5/3] md:aspect-[2/1] lg:aspect-[16/5] md:min-h-[210px]",
    contentClass: "h-full px-5 py-6 sm:px-8",
    titleClass: "text-2xl sm:text-4xl",
    bodyClass: "text-sm sm:text-base",
    imageClass: "scale-[1.02]",
    imageWrapClass: "",
    overlayClass: "bg-gradient-to-r from-ink/90 via-ink/50 to-ink/10",
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
      className={cn("relative isolate w-full max-w-full overflow-hidden rounded-lg border border-slate-300 bg-ink shadow-industrial", config.sectionClass, className)}
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
          <BannerImage banner={item} imageClass={config.imageClass} imageWrapClass={config.imageWrapClass} reduceMotion={Boolean(reduceMotion)} active={index === active} />
          <div className={cn("pointer-events-none absolute inset-0 z-10", config.overlayClass)} />
          <div className={cn("relative z-20 flex h-full max-w-4xl flex-col justify-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]", config.contentClass)}>
            {item.kicker ? <p className="text-[11px] font-bold uppercase tracking-normal text-teal-200 sm:text-sm">{item.kicker}</p> : null}
            <h1 className={cn("mt-2 max-w-[min(42rem,calc(100vw-3rem))] font-bold leading-tight text-balance md:mt-1", config.titleClass)}>{item.title}</h1>
            <p className={cn("mt-2 max-w-[min(36rem,calc(100vw-3rem))] leading-[18px] text-slate-100 sm:mt-2 sm:leading-6 md:line-clamp-1", config.bodyClass)}>{item.body}</p>
            {item.ctaLabel && item.ctaHref ? (
              <div className="mt-3 flex flex-wrap gap-3 sm:mt-4 md:mt-3">
                <Link href={item.ctaHref} className="inline-flex min-h-10 w-fit items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink shadow hover:bg-slate-100 sm:min-h-10 sm:px-4 sm:py-2 md:min-h-11">
                  {item.ctaLabel}
                </Link>
                {item.secondaryCtaLabel && item.secondaryCtaHref ? (
                  <Link href={item.secondaryCtaHref} className="inline-flex min-h-10 w-fit items-center rounded-md border border-white/80 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-white/25 sm:min-h-10 sm:px-4 sm:py-2 md:min-h-11">
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
          <button className="absolute left-3 top-[27%] z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-ink/70 text-white shadow backdrop-blur hover:bg-ink sm:top-1/2 sm:h-10 sm:w-10 sm:bg-white/92 sm:text-ink sm:hover:bg-white" onClick={() => move(-1)} aria-label="Previous banner" title="Previous banner">
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button className="absolute right-3 top-[27%] z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-ink/70 text-white shadow backdrop-blur hover:bg-ink sm:top-1/2 sm:h-10 sm:w-10 sm:bg-white/92 sm:text-ink sm:hover:bg-white" onClick={() => move(1)} aria-label="Next banner" title="Next banner">
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </>
      ) : null}

      <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 gap-1.5 sm:bottom-3 sm:gap-1.5">
        {visibleBanners.map((item, index) => (
          <button
            key={item.id}
            onClick={() => void moveTo(index, true)}
            className={cn("min-h-0 h-1.5 w-1.5 rounded-full bg-white/55 p-0 transition-colors hover:bg-white sm:h-2 sm:w-2", index === active && "bg-white ring-2 ring-white/30")}
            aria-label={`Go to banner ${index + 1}`}
            aria-current={index === active}
          />
        ))}
      </div>
    </section>
  );
}

function BannerImage({ banner, imageClass, imageWrapClass, reduceMotion, active }: { banner: Banner; imageClass: string; imageWrapClass: string; reduceMotion: boolean; active: boolean }) {
  const manifestBanner = hasResponsiveAssets(banner) ? banner : null;
  const variantImages = banner.imageVariants ?? [];
  const fallbackImage = normalizePublicAssetUrl(manifestBanner ? getBannerFallbackUrl(manifestBanner) : variantImages.find((variant) => variant.shape === "wide")?.url ?? variantImages[0]?.url ?? banner.image);
  const [imageMode, setImageMode] = useState<"responsive" | "fallback" | "hidden">("responsive");

  useEffect(() => {
    setImageMode("responsive");
  }, [banner.id, fallbackImage]);

  if (imageMode === "hidden" || !fallbackImage) return null;

  const useResponsiveSources = Boolean(manifestBanner && imageMode === "responsive");
  const priority = manifestBanner?.priority ?? "lazy";
  const focalPosition = banner.focalPoint ? `${banner.focalPoint.x}% ${banner.focalPoint.y}%` : "center";

  return (
    <picture className={cn("absolute inset-0 z-0 block w-full overflow-hidden bg-ink", imageWrapClass)}>
      <OptimizedBannerPicture
        banner={banner}
        manifestBanner={manifestBanner}
        variantImages={variantImages}
        useResponsiveSources={useResponsiveSources}
        fallbackImage={fallbackImage}
        focalPosition={focalPosition}
        imageClass={imageClass}
        priority={priority}
        active={active}
        reduceMotion={reduceMotion}
        onError={(failedUrl) => {
          setImageMode(useResponsiveSources && failedUrl !== new URL(fallbackImage, window.location.href).href ? "fallback" : "hidden");
        }}
      />
    </picture>
  );
}

function OptimizedBannerPicture({
  banner,
  manifestBanner,
  variantImages,
  useResponsiveSources,
  fallbackImage,
  focalPosition,
  imageClass,
  priority,
  active,
  reduceMotion,
  onError
}: {
  banner: Banner;
  manifestBanner: BannerManifestEntry | null;
  variantImages: Banner["imageVariants"];
  useResponsiveSources: boolean;
  fallbackImage: string;
  focalPosition: string;
  imageClass: string;
  priority: LoadingPriority;
  active: boolean;
  reduceMotion: boolean;
  onError: (failedUrl: string) => void;
}) {
  const wide = manifestBanner ? getBannerFallbackUrl(manifestBanner) : pickVariant(variantImages, "wide")?.url ?? normalizePublicAssetUrl(banner.image) ?? fallbackImage;
  const mid = manifestBanner ? getBannerAssetUrl(manifestBanner, "mid", manifestBanner.assets.mid.widths[manifestBanner.assets.mid.widths.length - 1]) : pickVariant(variantImages, "mid")?.url ?? normalizePublicAssetUrl(banner.laptopImage) ?? wide;
  const tall = manifestBanner ? getBannerAssetUrl(manifestBanner, "tall", manifestBanner.assets.tall.widths[manifestBanner.assets.tall.widths.length - 1]) : pickVariant(variantImages, "tall")?.url ?? normalizePublicAssetUrl(banner.mobileImage) ?? mid;
  const common = {
    alt: banner.alt,
    quality: 92,
    sizes: "100vw",
    priority: priority === "high"
  };
  const wideProps = getImageProps({ ...common, src: wide, width: 1920, height: 720 }).props;
  const midProps = getImageProps({ ...common, src: mid, width: 1280, height: 549 }).props;
  const tallProps = getImageProps({ ...common, src: tall, width: 1080, height: 1350 }).props;

  return (
    <>
      {manifestBanner && useResponsiveSources ? (
        <>
          <source media={manifestBanner.assets.wide.media} srcSet={wideProps.srcSet} sizes={wideProps.sizes} type="image/webp" />
          <source media={manifestBanner.assets.mid.media} srcSet={midProps.srcSet} sizes={midProps.sizes} type="image/webp" />
          <source media={manifestBanner.assets.tall.media} srcSet={tallProps.srcSet} sizes={tallProps.sizes} type="image/webp" />
        </>
      ) : (
        <>
          <source media="(min-width: 1280px)" srcSet={wideProps.srcSet} sizes={wideProps.sizes} />
          <source media="(min-width: 640px)" srcSet={midProps.srcSet} sizes={midProps.sizes} />
          <source srcSet={tallProps.srcSet} sizes={tallProps.sizes} />
        </>
      )}
      <motion.img
        src={tallProps.src}
        srcSet={tallProps.srcSet}
        sizes={tallProps.sizes}
        width={1080}
        height={1350}
        alt={banner.alt}
        onError={(event) => {
          const failedUrl = event.currentTarget.currentSrc || event.currentTarget.src;
          onError(failedUrl);
        }}
        className={cn("absolute inset-0 h-full w-full transform-gpu object-cover object-center [backface-visibility:hidden] will-change-transform", imageClass)}
        style={{ objectPosition: focalPosition }}
        loading={priority === "high" ? "eager" : "lazy"}
        fetchPriority={priority === "high" ? "high" : "auto"}
        decoding="async"
        initial={false}
        animate={{ scale: 1 }}
        transition={{ duration: reduceMotion || !active ? 0 : 0.2, ease: "easeOut" }}
      />
    </>
  );
}

function pickVariant(variants: Banner["imageVariants"], shape: "wide" | "mid" | "tall") {
  return (variants ?? []).filter((variant) => variant.shape === shape).sort((a, b) => b.width - a.width)[0];
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
