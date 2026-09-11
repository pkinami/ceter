"use client";

import { useMemo, useRef, useState } from "react";
import type { PointerEvent, TouchEvent, WheelEvent } from "react";
import type { DashboardSeries } from "@/lib/admin/workspace";

type DashboardPoint = { label: string; value: number; key?: string };
type ChartPoint = DashboardPoint & { x: number; y: number; index: number; visibleValue: number };
type Domain = { start: number; end: number };
type ActivePoint = { index: number; x: number; y: number };

const WIDTH = 860;
const HEIGHT = 240;
const MULTI_HEIGHT = 230;
const PAD = 34;
const CHART_COLORS = ["#0f766e", "#f97316", "#f5b301", "#14b8a6", "#0b1e39"];

export function MultiLineChart({ series }: { series: DashboardSeries[] }) {
  const pointCount = Math.max(...series.map((item) => item.points.length), 0);
  const chart = useInteractiveChart(pointCount);
  const values = series.flatMap((item) => item.points.map((point) => Math.max(0, point.value)));
  const max = niceMax(Math.max(...values, 1));
  const coordsBySeries = series.map((item) => pointsToCoords(item.points, chart.domain, max, MULTI_HEIGHT));
  const active = chart.activeIndex == null ? null : getActiveMultiPoint(coordsBySeries, chart.activeIndex);
  const activeLabel = chart.activeIndex == null ? "" : formatPeriodLabel(series[0]?.points[chart.activeIndex]?.label ?? "", series[0]?.points[chart.activeIndex]?.key);
  const tooltipRows = chart.activeIndex == null ? [] : series.map((item, index) => ({
    color: CHART_COLORS[index % CHART_COLORS.length],
    name: item.name,
    value: Math.max(0, item.points[chart.activeIndex!]?.value ?? 0)
  }));

  return (
    <div className="ceter-dashboard-chart ceter-dashboard-multi-chart">
      <div className="ceter-dashboard-chart-surface" ref={chart.ref} onPointerEnter={chart.onPointerEnter} onPointerMove={chart.onPointerMove} onPointerLeave={chart.onPointerLeave} onPointerDown={chart.onPointerDown} onPointerUp={chart.onPointerUp} onPointerCancel={chart.onPointerUp} onWheel={chart.onWheel} onTouchStart={chart.onTouchStart} onTouchMove={chart.onTouchMove} onTouchEnd={chart.onTouchEnd}>
        <svg viewBox={`0 0 ${WIDTH} ${MULTI_HEIGHT}`} role="img" aria-label="Business comparison chart">
          <defs>
            <clipPath id="ceterMultiChartClip"><rect x={PAD} y={PAD} width={WIDTH - PAD * 2} height={MULTI_HEIGHT - PAD * 2} /></clipPath>
          </defs>
          {gridLines(MULTI_HEIGHT)}
          <line className="ceter-chart-zero-line" x1={PAD} x2={WIDTH - PAD} y1={MULTI_HEIGHT - PAD} y2={MULTI_HEIGHT - PAD} />
          <g clipPath="url(#ceterMultiChartClip)">
            {coordsBySeries.map((coords, seriesIndex) => (
              <path key={series[seriesIndex].name} d={smoothPath(coords)} style={{ stroke: CHART_COLORS[seriesIndex % CHART_COLORS.length] }} />
            ))}
          </g>
          {active ? (
            <g className="ceter-chart-active-layer">
              <line className="ceter-chart-crosshair" x1={active.x} x2={active.x} y1={PAD} y2={MULTI_HEIGHT - PAD} />
              {coordsBySeries.map((coords, seriesIndex) => {
                const point = coords.find((item) => item.index === chart.activeIndex);
                return point ? <circle className="ceter-chart-hover-point" key={`${series[seriesIndex].name}-${point.index}`} cx={point.x} cy={point.y} r="5" style={{ fill: CHART_COLORS[seriesIndex % CHART_COLORS.length] }} /> : null;
              })}
            </g>
          ) : null}
        </svg>
        {active ? <ChartTooltip x={active.x} y={PAD + 8} height={MULTI_HEIGHT} title={activeLabel} rows={tooltipRows} /> : null}
      </div>
      <ChartLegend names={series.map((item) => item.name)} />
    </div>
  );
}

export function SalesAreaChart({ points }: { points: DashboardPoint[] }) {
  const chart = useInteractiveChart(points.length);
  const max = niceMax(Math.max(...points.map((point) => Math.max(0, point.value)), 1));
  const coords = pointsToCoords(points, chart.domain, max, HEIGHT);
  const active = chart.activeIndex == null ? null : coords.find((point) => point.index === chart.activeIndex) ?? nearestVisiblePoint(coords, chart.activeIndex);
  const line = smoothPath(coords);
  const area = areaPath(coords, HEIGHT - PAD);

  return (
    <div className="ceter-dashboard-chart">
      <div className="ceter-dashboard-chart-surface" ref={chart.ref} onPointerEnter={chart.onPointerEnter} onPointerMove={chart.onPointerMove} onPointerLeave={chart.onPointerLeave} onPointerDown={chart.onPointerDown} onPointerUp={chart.onPointerUp} onPointerCancel={chart.onPointerUp} onWheel={chart.onWheel} onTouchStart={chart.onTouchStart} onTouchMove={chart.onTouchMove} onTouchEnd={chart.onTouchEnd}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Sales area chart">
          <defs>
            <linearGradient id="ceterSalesFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity=".28" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity=".04" />
            </linearGradient>
            <clipPath id="ceterSalesChartClip"><rect x={PAD} y={PAD} width={WIDTH - PAD * 2} height={HEIGHT - PAD * 2} /></clipPath>
          </defs>
          {gridLines(HEIGHT)}
          <line className="ceter-chart-zero-line" x1={PAD} x2={WIDTH - PAD} y1={HEIGHT - PAD} y2={HEIGHT - PAD} />
          <text x="8" y={HEIGHT / 2} transform={`rotate(-90 8 ${HEIGHT / 2})`}>Sales Amount</text>
          <text x={WIDTH / 2 - 10} y={HEIGHT - 3}>Date</text>
          <g clipPath="url(#ceterSalesChartClip)">
            <path className="ceter-chart-area" d={area} />
            <path d={line} />
          </g>
          {coords.map((point, index) => index % 3 === 0 || index === coords.length - 1 ? <text key={`${point.label}-${point.index}`} x={point.x - 4} y={HEIGHT - 17}>{point.label}</text> : null)}
          {active ? (
            <g className="ceter-chart-active-layer">
              <line className="ceter-chart-crosshair" x1={active.x} x2={active.x} y1={PAD} y2={HEIGHT - PAD} />
              <circle className="ceter-chart-hover-point" cx={active.x} cy={active.y} r="5" />
            </g>
          ) : null}
        </svg>
        {active ? (
          <ChartTooltip
            x={active.x}
            y={Math.max(PAD + 8, active.y - 82)}
            height={HEIGHT}
            title={formatPeriodLabel(active.label, active.key)}
            rows={[{ color: CHART_COLORS[0], name: "Sales", value: active.visibleValue }]}
          />
        ) : null}
      </div>
      <ChartLegend names={["Sales"]} />
    </div>
  );
}

function useInteractiveChart(pointCount: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; domain: Domain } | null>(null);
  const pinch = useRef<{ distance: number; domain: Domain } | null>(null);
  const fullEnd = Math.max(pointCount - 1, 0);
  const [domain, setDomain] = useState<Domain>({ start: 0, end: fullEnd });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const normalizedDomain = useMemo(() => normalizeDomain(domain, fullEnd), [domain, fullEnd]);

  function clientToChartX(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return PAD;
    return Math.max(PAD, Math.min(WIDTH - PAD, ((clientX - rect.left) / rect.width) * WIDTH));
  }

  function setActiveFromClientX(clientX: number) {
    if (pointCount === 0) return;
    const x = clientToChartX(clientX);
    const ratio = (x - PAD) / (WIDTH - PAD * 2);
    const index = Math.round(normalizedDomain.start + ratio * Math.max(normalizedDomain.end - normalizedDomain.start, 1));
    setActiveIndex(Math.max(0, Math.min(fullEnd, index)));
  }

  function panByPixels(pixelDelta: number, baseDomain = normalizedDomain) {
    if (fullEnd <= 0) return;
    const rect = ref.current?.getBoundingClientRect();
    const span = Math.max(baseDomain.end - baseDomain.start, 1);
    const indexDelta = (pixelDelta / Math.max(rect?.width ?? WIDTH, 1)) * span;
    setDomain(normalizeDomain({ start: baseDomain.start + indexDelta, end: baseDomain.end + indexDelta }, fullEnd));
  }

  function zoomAt(clientX: number, factor: number, baseDomain = normalizedDomain) {
    if (fullEnd <= 0) return;
    const x = clientToChartX(clientX);
    const ratio = (x - PAD) / (WIDTH - PAD * 2);
    const span = baseDomain.end - baseDomain.start;
    const minSpan = Math.min(Math.max(3, pointCount > 1 ? 1 : 0), fullEnd || 1);
    const nextSpan = Math.max(minSpan, Math.min(fullEnd || 1, span * factor));
    const center = baseDomain.start + ratio * span;
    setDomain(normalizeDomain({ start: center - ratio * nextSpan, end: center + (1 - ratio) * nextSpan }, fullEnd));
  }

  return {
    ref,
    domain: normalizedDomain,
    activeIndex,
    onPointerEnter: (event: PointerEvent<HTMLDivElement>) => setActiveFromClientX(event.clientX),
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current && event.pointerType !== "touch") {
        panByPixels(drag.current.x - event.clientX, drag.current.domain);
        return;
      }
      setActiveFromClientX(event.clientX);
    },
    onPointerLeave: () => {
      drag.current = null;
      setActiveIndex(null);
    },
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      drag.current = { x: event.clientX, domain: normalizedDomain };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onWheel: (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        panByPixels(event.deltaX);
      } else {
        zoomAt(event.clientX, event.deltaY > 0 ? 1.18 : 0.82);
      }
      setActiveFromClientX(event.clientX);
    },
    onTouchStart: (event: TouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 2) {
        pinch.current = { distance: touchDistance(event.touches), domain: normalizedDomain };
      } else if (event.touches.length === 1) {
        drag.current = { x: event.touches[0].clientX, domain: normalizedDomain };
        setActiveFromClientX(event.touches[0].clientX);
      }
    },
    onTouchMove: (event: TouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 2 && pinch.current) {
        event.preventDefault();
        const distance = touchDistance(event.touches);
        zoomAt((event.touches[0].clientX + event.touches[1].clientX) / 2, pinch.current.distance / Math.max(distance, 1), pinch.current.domain);
      } else if (event.touches.length === 1 && drag.current) {
        event.preventDefault();
        panByPixels(drag.current.x - event.touches[0].clientX, drag.current.domain);
        setActiveFromClientX(event.touches[0].clientX);
      }
    },
    onTouchEnd: () => {
      drag.current = null;
      pinch.current = null;
    }
  };
}

function pointsToCoords(points: DashboardPoint[], domain: Domain, max: number, height: number): ChartPoint[] {
  const span = Math.max(domain.end - domain.start, 1);
  return points.map((point, index) => {
    const visibleValue = Math.max(0, point.value);
    const x = PAD + ((index - domain.start) / span) * (WIDTH - PAD * 2);
    const y = PAD + (1 - visibleValue / max) * (height - PAD * 2);
    return { ...point, index, visibleValue, x, y: Math.max(PAD, Math.min(height - PAD, y)) };
  });
}

function smoothPath(points: ChartPoint[]) {
  const visible = points.filter((point) => point.x >= PAD - 80 && point.x <= WIDTH - PAD + 80);
  if (!visible.length) return "";
  if (visible.length === 1) return `M ${visible[0].x} ${visible[0].y}`;
  const commands = [`M ${visible[0].x} ${visible[0].y}`];
  for (let index = 0; index < visible.length - 1; index++) {
    const current = visible[index];
    const next = visible[index + 1];
    const delta = next.x - current.x;
    commands.push(`C ${current.x + delta * 0.42} ${current.y}, ${next.x - delta * 0.42} ${next.y}, ${next.x} ${next.y}`);
  }
  return commands.join(" ");
}

function areaPath(points: ChartPoint[], baseline: number) {
  const visible = points.filter((point) => point.x >= PAD - 80 && point.x <= WIDTH - PAD + 80);
  if (!visible.length) return "";
  return `${smoothPath(points)} L ${visible[visible.length - 1].x} ${baseline} L ${visible[0].x} ${baseline} Z`;
}

function ChartTooltip({ x, y, height, title, rows }: { x: number; y: number; height: number; title: string; rows: Array<{ color: string; name: string; value: number }> }) {
  const left = `${(x / WIDTH) * 100}%`;
  const top = `${(y / height) * 100}%`;
  const transform = x > WIDTH - 220 ? "translate(calc(-100% - 12px), 0)" : "translate(12px, 0)";
  return (
    <div className="ceter-chart-tooltip" style={{ left, top, transform }}>
      <div className="ceter-chart-tooltip-title">{title}</div>
      {rows.map((row) => (
        <div className="ceter-chart-tooltip-row" key={row.name}>
          <i style={{ background: row.color }} />
          <span>{row.name}: {formatTooltipKes(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

function ChartLegend({ names }: { names: string[] }) {
  return <div className="ceter-dashboard-legend">{names.map((name, index) => <span key={name}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />{name}</span>)}</div>;
}

function gridLines(height: number) {
  return [1, 0.75, 0.5, 0.25, 0].map((tick) => {
    const y = PAD + (1 - tick) * (height - PAD * 2);
    return <line key={tick} x1={PAD} x2={WIDTH - PAD} y1={y} y2={y} />;
  });
}

function getActiveMultiPoint(series: ChartPoint[][], index: number): ActivePoint | null {
  const points = series.flatMap((coords) => coords.filter((point) => point.index === index));
  if (!points.length) return null;
  return { index, x: points[0].x, y: Math.min(...points.map((point) => point.y)) };
}

function nearestVisiblePoint(points: ChartPoint[], index: number) {
  return points.reduce<ChartPoint | null>((nearest, point) => {
    if (!nearest) return point;
    return Math.abs(point.index - index) < Math.abs(nearest.index - index) ? point : nearest;
  }, null);
}

function normalizeDomain(domain: Domain, fullEnd: number): Domain {
  if (fullEnd <= 0) return { start: 0, end: 0 };
  const span = Math.max(1, Math.min(fullEnd, domain.end - domain.start));
  let start = domain.start;
  let end = domain.start + span;
  if (start < 0) {
    start = 0;
    end = span;
  }
  if (end > fullEnd) {
    end = fullEnd;
    start = fullEnd - span;
  }
  return { start, end };
}

function niceMax(value: number) {
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  return Math.ceil(value / magnitude) * magnitude;
}

function touchDistance(touches: React.TouchList) {
  const first = touches[0];
  const second = touches[1];
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function formatPeriodLabel(label: string, key?: string) {
  if (key) {
    const value = new Date(`${key}T00:00:00`);
    if (!Number.isNaN(value.getTime())) {
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value);
    }
  }
  return label;
}

function formatTooltipKes(value: number) {
  return `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value)}`;
}
