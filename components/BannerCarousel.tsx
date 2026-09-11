"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { motion, PanInfo, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Banner } from "@/lib/types";
import { getBannerAssetUrl, getBannerFallbackUrl, normalizePublicAssetUrl, type BannerManifestEntry, type LoadingPriority } from "@/lib/banner-schema";

type BannerVariant = "main" | "category" | "services";

const variantConfig = {
  main: {
    interval: 15000,
    duration: 0.55,
    sectionClass: "h-[clamp(248px,64vw,284px)] min-h-0 sm:h-[clamp(258px,34vw,306px)] md:h-[268px] lg:h-[280px] min-[1366px]:h-[292px] min-[1600px]:h-[312px]",
    contentClass: "h-full w-[82%] max-w-[36rem] px-8 py-6 pb-10 sm:w-[68%] sm:max-w-[40rem] sm:px-10 sm:py-7 md:w-[62%] md:max-w-[42rem] md:px-11 lg:w-[58%] xl:w-[54%]",
    titleClass: "text-[clamp(18px,5vw,22px)] leading-[1.12] sm:text-[clamp(28px,3.25vw,35px)] sm:leading-[1.1] lg:text-[clamp(32px,2.25vw,37px)] lg:leading-[1.08] min-[1600px]:text-[39px]",
    bodyClass: "text-[clamp(12px,3.25vw,14px)] leading-[1.38] sm:text-[clamp(14px,1.45vw,16px)] md:text-[clamp(15px,1.05vw,16px)]",
    imageClass: "",
    imageWrapClass: "",
    overlayClass: "bg-gradient-to-r from-ink/86 via-ink/42 to-ink/8",
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  },
  category: {
    interval: 15000,
    duration: 0.6,
    sectionClass: "h-[clamp(240px,62vw,278px)] min-h-0 sm:h-[clamp(252px,32vw,298px)] md:h-[260px] lg:h-[272px] min-[1366px]:h-[286px] min-[1600px]:h-[304px]",
    contentClass: "h-full w-[82%] max-w-[36rem] px-8 py-6 pb-10 sm:w-[68%] sm:max-w-[40rem] sm:px-10 sm:py-7 md:w-[62%] md:max-w-[42rem] lg:w-[58%] xl:w-[54%]",
    titleClass: "text-[clamp(18px,4.9vw,22px)] leading-[1.12] sm:text-[clamp(28px,3.15vw,34px)] sm:leading-[1.1] lg:text-[clamp(31px,2.15vw,36px)] lg:leading-[1.08] min-[1600px]:text-[38px]",
    bodyClass: "text-[clamp(12px,3.2vw,14px)] leading-[1.38] sm:text-[clamp(14px,1.45vw,16px)] md:text-[clamp(15px,1vw,16px)]",
    imageClass: "scale-100",
    imageWrapClass: "",
    overlayClass: "bg-gradient-to-r from-ink/88 via-ink/44 to-ink/8",
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  },
  services: {
    interval: 15000,
    duration: 0.8,
    sectionClass: "h-[clamp(240px,62vw,278px)] min-h-0 sm:h-[clamp(252px,32vw,298px)] md:h-[260px] lg:h-[272px] min-[1366px]:h-[286px] min-[1600px]:h-[304px]",
    contentClass: "h-full w-[82%] max-w-[36rem] px-8 py-6 pb-10 sm:w-[68%] sm:max-w-[40rem] sm:px-10 sm:py-7 md:w-[62%] md:max-w-[42rem] lg:w-[58%] xl:w-[54%]",
    titleClass: "text-[clamp(18px,4.9vw,22px)] leading-[1.12] sm:text-[clamp(28px,3.15vw,34px)] sm:leading-[1.1] lg:text-[clamp(31px,2.15vw,36px)] lg:leading-[1.08] min-[1600px]:text-[38px]",
    bodyClass: "text-[clamp(12px,3.2vw,14px)] leading-[1.38] sm:text-[clamp(14px,1.45vw,16px)] md:text-[clamp(15px,1vw,16px)]",
    imageClass: "scale-[1.02]",
    imageWrapClass: "",
    overlayClass: "bg-gradient-to-r from-ink/88 via-ink/44 to-ink/8",
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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
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

  function onDragEnd(_: MouseEvent | globalThis.TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x > 50) move(-1);
    if (info.offset.x < -50) move(1);
  }

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    if (visibleBanners.length <= 1 || (event.target as HTMLElement).closest("a,button")) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    if (!touchStartRef.current || visibleBanners.length <= 1) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    move(deltaX > 0 ? -1 : 1);
  }

  if (!visibleBanners.length) return null;

  const transition = reduceMotion ? { duration: 0 } : { duration: config.duration, ease: [0.22, 1, 0.36, 1] };
  const motionState = reduceMotion ? { animate: { opacity: 1 } } : { animate: config.animate };

  return (
    <section
      className={cn("relative isolate w-full max-w-full overflow-hidden rounded-lg border border-slate-300 bg-ink shadow-industrial", config.sectionClass, className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-banner-carousel={variant}
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
          data-banner-slide={index}
        >
          {index === active ? <BannerImage banner={item} imageClass={config.imageClass} imageWrapClass={config.imageWrapClass} reduceMotion={Boolean(reduceMotion)} active={index === active} critical={variant === "main" && index === 0} /> : null}
          <div className="pointer-events-none absolute inset-0 z-10" style={bannerOverlayStyle(item)} />
          <BannerBadge banner={item} />
          <div className={cn("relative z-20 flex h-full max-w-4xl flex-col justify-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]", config.contentClass, isTopLeftBadge(item) && item.textPosition !== "right" && "justify-start pt-12 sm:pt-16 md:pt-16", bannerContentClass(item))}>
            {item.kicker ? <p className="line-clamp-1 text-[10px] font-bold uppercase leading-none tracking-normal text-teal-200 sm:text-[11px] md:text-xs">{item.kicker}</p> : null}
            <h1 className={cn("mt-2.5 line-clamp-3 w-full max-w-[min(620px,100%)] font-semibold tracking-normal sm:mt-3.5 sm:line-clamp-none", config.titleClass)}>
              {item.title}
            </h1>
            <p className={cn("mt-2.5 line-clamp-2 w-full max-w-[min(560px,100%)] text-slate-100 sm:mt-3.5 sm:line-clamp-none", config.bodyClass)}>
              {item.body}
            </p>
            {item.ctaLabel && item.ctaHref ? (
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-5 md:mt-5">
                <Link href={item.ctaHref} className="inline-flex h-9 min-h-9 w-fit items-center rounded-md bg-white px-3 text-xs font-semibold text-ink shadow hover:bg-slate-100 sm:h-10 sm:min-h-10 sm:px-4 sm:text-sm md:h-11 md:min-h-11">
                  {item.ctaLabel}
                </Link>
                {item.secondaryCtaLabel && item.secondaryCtaHref ? (
                  <Link href={item.secondaryCtaHref} className="inline-flex h-9 min-h-9 w-fit items-center rounded-md border border-white/80 bg-white/15 px-3 text-xs font-semibold text-white shadow hover:bg-white/25 sm:h-10 sm:min-h-10 sm:px-4 sm:text-sm md:h-11 md:min-h-11">
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
          <button className="group/banner-arrow absolute left-0.5 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center text-white opacity-45 hover:opacity-100 focus-visible:opacity-100 active:opacity-100 sm:left-1 md:left-2" onClick={() => move(-1)} aria-label="Previous banner" title="Previous banner" data-banner-prev>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/45 bg-ink/45 shadow backdrop-blur transition-colors group-hover/banner-arrow:bg-ink/75 group-focus-visible/banner-arrow:bg-ink/75 sm:h-8 sm:w-8">
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </button>
          <button className="group/banner-arrow absolute right-0.5 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center text-white opacity-45 hover:opacity-100 focus-visible:opacity-100 active:opacity-100 sm:right-1 md:right-2" onClick={() => move(1)} aria-label="Next banner" title="Next banner" data-banner-next>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/45 bg-ink/45 shadow backdrop-blur transition-colors group-hover/banner-arrow:bg-ink/75 group-focus-visible/banner-arrow:bg-ink/75 sm:h-8 sm:w-8">
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </button>
        </>
      ) : null}

      {visibleBanners.length > 1 ? (
        <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 gap-1.5 sm:bottom-3 sm:gap-1.5">
          {visibleBanners.map((item, index) => (
            <button
              key={item.id}
              onClick={() => void moveTo(index, true)}
              className={cn("h-3 min-h-0 w-3 rounded-full p-[3px]", index === active ? "bg-white/25" : "bg-transparent")}
              aria-label={`Go to banner ${index + 1}`}
              aria-current={index === active}
              data-banner-dot={index}
            >
              <span className={cn("block h-1.5 w-1.5 rounded-full bg-white/55 transition-colors hover:bg-white sm:h-2 sm:w-2", index === active && "bg-white")} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BannerImage({ banner, imageClass, imageWrapClass, reduceMotion, active, critical }: { banner: Banner; imageClass: string; imageWrapClass: string; reduceMotion: boolean; active: boolean; critical: boolean }) {
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
  const focalPosition = bannerObjectPosition(banner);

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
        critical={critical}
        reduceMotion={reduceMotion}
        onError={(failedUrl) => {
          setImageMode(useResponsiveSources && failedUrl !== new URL(fallbackImage, window.location.href).href ? "fallback" : "hidden");
        }}
      />
    </picture>
  );
}

function bannerObjectPosition(banner: Banner) {
  if (!banner.focalPoint) return "center center";
  if (banner.focalPoint.mode === "left") return `${Math.min(banner.focalPoint.x, 32)}% ${banner.focalPoint.y}%`;
  if (banner.focalPoint.mode === "right") return `${Math.max(banner.focalPoint.x, 68)}% ${banner.focalPoint.y}%`;
  return `${banner.focalPoint.x}% ${banner.focalPoint.y}%`;
}

function bannerContentClass(banner: Banner) {
  if (banner.textPosition === "center") return "mx-auto items-center text-center";
  if (banner.textPosition === "right") return "ml-auto items-end text-right";
  const x = banner.focalPoint?.x ?? 50;
  if (x < 45) return "ml-auto items-end text-right";
  return "items-start text-left";
}

function bannerOverlayStyle(banner: Banner) {
  const opacity = Math.min(95, Math.max(0, banner.overlayOpacity ?? 70)) / 100;
  const heavy = `rgba(11, 30, 57, ${opacity})`;
  const mid = `rgba(11, 30, 57, ${Math.max(0, opacity * 0.46)})`;
  const soft = `rgba(11, 30, 57, ${Math.max(0, opacity * 0.18)})`;
  const light = `rgba(11, 30, 57, ${Math.max(0, opacity * 0.06)})`;
  if (banner.textPosition === "center") {
    return { background: `linear-gradient(90deg, ${soft}, ${heavy}, ${soft})` };
  }
  if (banner.textPosition === "right" || (banner.textPosition !== "left" && (banner.focalPoint?.x ?? 50) < 45)) {
    return { background: `linear-gradient(270deg, ${heavy} 0%, ${heavy} 30%, ${mid} 54%, ${light} 78%)` };
  }
  return { background: `linear-gradient(90deg, ${heavy} 0%, ${heavy} 30%, ${mid} 54%, ${light} 78%)` };
}

function BannerBadge({ banner }: { banner: Banner }) {
  if (!banner.badge?.enabled) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-30 rounded-md px-2.5 py-1 text-[11px] font-black uppercase tracking-normal text-white shadow",
        banner.badge.position === "top-right" && "right-4 top-4",
        banner.badge.position === "bottom-left" && "bottom-4 left-4",
        banner.badge.position === "bottom-right" && "bottom-4 right-4",
        isTopLeftBadge(banner) && "left-4 top-2 md:left-auto md:right-4"
      )}
      style={{ backgroundColor: banner.badge.color }}
      data-banner-badge
    >
      {banner.badge.text}
    </div>
  );
}

function isTopLeftBadge(banner: Banner) {
  return Boolean(banner.badge?.enabled && banner.badge.position !== "top-right" && banner.badge.position !== "bottom-left" && banner.badge.position !== "bottom-right");
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
  critical,
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
  critical: boolean;
  reduceMotion: boolean;
  onError: (failedUrl: string) => void;
}) {
  const wide = manifestBanner ? getBannerFallbackUrl(manifestBanner) : pickVariant(variantImages, "wide")?.url ?? normalizePublicAssetUrl(banner.image) ?? fallbackImage;
  const mid = manifestBanner ? getBannerAssetUrl(manifestBanner, "mid", manifestBanner.assets.mid.widths[manifestBanner.assets.mid.widths.length - 1]) : pickVariant(variantImages, "mid")?.url ?? normalizePublicAssetUrl(banner.laptopImage) ?? wide;
  const tall = manifestBanner ? getBannerAssetUrl(manifestBanner, "tall", manifestBanner.assets.tall.widths[manifestBanner.assets.tall.widths.length - 1]) : pickVariant(variantImages, "tall")?.url ?? normalizePublicAssetUrl(banner.mobileImage) ?? mid;
  return (
    <>
      {manifestBanner && useResponsiveSources ? (
        <>
          <source media={manifestBanner.assets.wide.media} srcSet={wide} sizes="100vw" type="image/webp" />
          <source media={manifestBanner.assets.mid.media} srcSet={mid} sizes="100vw" type="image/webp" />
          <source media={manifestBanner.assets.tall.media} srcSet={tall} sizes="100vw" type="image/webp" />
        </>
      ) : (
        <>
          <source media="(min-width: 1280px)" srcSet={wide} sizes="100vw" />
          <source media="(min-width: 768px)" srcSet={mid} sizes="100vw" />
          <source srcSet={tall} sizes="100vw" />
        </>
      )}
      <motion.img
        src={tall}
        sizes="100vw"
        width={1080}
        height={1350}
        alt={banner.alt}
        onError={(event) => {
          const failedUrl = event.currentTarget.currentSrc || event.currentTarget.src;
          onError(failedUrl);
        }}
        className={cn("absolute inset-0 h-full w-full transform-gpu object-cover object-[var(--banner-focal)] [backface-visibility:hidden] will-change-transform max-sm:object-[38%_center]", imageClass)}
        style={{ "--banner-focal": focalPosition } as CSSProperties}
        loading={critical || priority === "high" ? "eager" : "lazy"}
        fetchPriority={critical || priority === "high" ? "high" : "auto"}
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
  const urls = getBannerImageUrlsForViewport(banner);
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

function getBannerImageUrlsForViewport(banner: Banner) {
  const width = typeof window === "undefined" ? 1280 : window.innerWidth;
  const variants = banner.imageVariants ?? [];
  const shape = width >= 1280 ? "wide" : width >= 768 ? "mid" : "tall";
  const responsive = pickVariant(variants, shape)?.url;
  const fallback = shape === "wide" ? banner.image : shape === "mid" ? banner.laptopImage ?? banner.image : banner.mobileImage ?? banner.laptopImage ?? banner.image;
  return [normalizePublicAssetUrl(responsive ?? fallback)].filter((url): url is string => Boolean(url));
}

function hasResponsiveAssets(banner: Banner): banner is BannerManifestEntry {
  return "assets" in banner && Boolean((banner as BannerManifestEntry).assets?.wide);
}
