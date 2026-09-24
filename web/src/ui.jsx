/* IPL Pulse material primitives. Dark glass only. No ad-hoc team <img> outside TeamBadge. */
import { Component, useEffect, useRef } from "react";
import { animate, motion } from "framer-motion";

/** Error boundary: a bad data point must not blank the page (charts). */
export class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="glass p-6 text-center">
          <p className="font-semibold">Chart unavailable</p>
          <p className="micro-label mt-1 normal-case">The data behind this chart failed to render — the rest of the page is fine.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Fixed brand-color map (spec). Defunct franchises -> neutral gray. */
export const BRAND = {
  CSK: "#FFCB05", MI: "#004BA0", RCB: "#EC1C24", GT: "#1B2133", RR: "#EA1A85",
  KKR: "#3A225D", SRH: "#FF822A", PBKS: "#DD1F2D", LSG: "#00B4D8", DC: "#17479E",
};
const FALLBACK_GRAY = "#5b6472";

/** Resolve a team object to spec brand color (falls back to API color, then gray). */
export function brandOf(team) {
  if (!team) return FALLBACK_GRAY;
  return BRAND[team.short] || team.color || FALLBACK_GRAY;
}

/** IPL Pulse logomark: lime cricket ball with dark seam on a dark circle. */
export function Logomark({ size = 36 }) {
  const s = size, c = s / 2, r = s * 0.34;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} role="img" aria-label="IPL Pulse logo">
      <circle cx={c} cy={c} r={c - 1} fill="#0B1830" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <circle cx={c} cy={c} r={r} fill="#D8FF02" />
      <path d={`M ${c - r * 0.45} ${c - r * 0.89} Q ${c - r * 0.9} ${c} ${c - r * 0.45} ${c + r * 0.89}`}
        fill="none" stroke="#0B1830" strokeWidth={s * 0.045} strokeDasharray={`${s * 0.05} ${s * 0.04}`} strokeLinecap="round" />
      <path d={`M ${c + r * 0.45} ${c - r * 0.89} Q ${c + r * 0.9} ${c} ${c + r * 0.45} ${c + r * 0.89}`}
        fill="none" stroke="#0B1830" strokeWidth={s * 0.045} strokeDasharray={`${s * 0.05} ${s * 0.04}`} strokeLinecap="round" />
    </svg>
  );
}

/** The one TeamBadge(team, size) used everywhere. */
export function TeamBadge({ team, size = 56 }) {
  const bg = brandOf(team);
  const initials = (team.short || "?").slice(0, 3);
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {team.logo ? (
        <img
          src={team.logo}
          alt={team.short}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size, height: size, border: "1px solid rgba(255,255,255,0.25)" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fb = e.currentTarget.nextElementSibling;
            if (fb) fb.style.display = "flex";
          }}
        />
      ) : null}
      <span
        className="items-center justify-center rounded-full font-semibold text-white"
        style={{
          display: team.logo ? "none" : "flex",
          width: size, height: size, background: bg, fontSize: size / 3.2,
        }}
      >
        {initials}
      </span>
    </span>
  );
}

/** Count-up number (~600ms ease-out on mount/value change). */
export function CountUp({ value, format = (x) => Math.round(x).toLocaleString() }) {
  const ref = useRef(null);
  const prev = useRef(0);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.6, ease: "easeOut",
      onUpdate: (v) => { if (ref.current) ref.current.textContent = format(v); },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, format]);
  return <span ref={ref} className="tnum">{format(0)}</span>;
}

/** Progress fill (~400ms ease-out). */
export function FillBar({ pct, color, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-full bg-white/10 ${className}`}>
      <motion.div className="h-full rounded-full" style={{ background: color }}
        initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }} />
    </div>
  );
}

/** Skeleton shimmer for missing numeric stats. */
export function Skeleton({ width = 64, height = 20 }) {
  return <span className="skeleton inline-block" style={{ width, height }} />;
}

/** Missing progress value -> hide bar, 12px muted text. */
export function NoData({ text = "No data yet" }) {
  return <span className="text-[12px] font-medium text-white/60">{text}</span>;
}

/** Tiny SVG sparkline (no chart dep). values: numbers, lime stroke. */
export function Sparkline({ values, width = 220, height = 56, color = "#D8FF02", labels = [] }) {
  if (!values || values.length < 2) return <NoData />;
  const max = Math.max(...values), min = Math.min(...values);
  const span = Math.max(max - min, 1);
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * (width - 8) + 4},${height - 6 - ((v - min) / span) * (height - 14)}`);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible" role="img" aria-label="Trend chart">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={(i / (values.length - 1)) * (width - 8) + 4}
          cy={height - 6 - ((v - min) / span) * (height - 14)} r="3" fill={color}>
          <title>{labels[i] ? `${labels[i]}: ${v}` : v}</title>
        </circle>
      ))}
    </svg>
  );
}

export function CodeChip({ team }) {
  return (
    <span className="inline-block rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-widest text-white">
      {team.short}
    </span>
  );
}

export function Glass({ children, className = "" }) {
  return <div className={`glass ${className}`}>{children}</div>;
}

export function SectionHead({ title, sub, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {sub && <p className="micro-label mt-1 normal-case">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Dual progress bars: lime = left/primary, periwinkle = right/comparison. Never two limes. */
export function DualBar({ label, left, right, format = (x) => x, delay = 0 }) {
  if (left == null || right == null) return <NoData />;
  const a = Math.max(left, 0.0001);
  const p = Math.round((a / (a + Math.max(right, 0.0001))) * 100);
  const t = { duration: 0.4, ease: "easeOut", delay };
  return (
    <div className="py-1.5">
      <div className="mb-1 grid grid-cols-[1fr_auto] items-baseline text-sm">
        <span className="micro-label">{label}</span>
        <span className="tnum text-[13px]">
          <b className="text-[#D8FF02]">{format(left)}</b>
          <span className="opacity-40"> / </span>
          <b className="text-[#88A1FF]">{format(right)}</b>
        </span>
      </div>
      <div className="flex h-2 gap-1">
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-[#D8FF02]"
            initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={t} />
        </div>
        <div className="flex flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-[#88A1FF]"
            initial={{ width: 0 }} animate={{ width: `${100 - p}%` }} transition={t} />
        </div>
      </div>
    </div>
  );
}

/** Stagger child for grid entrances (~40ms apart, fade + slide). */
export function StaggerItem({ index, children, className = "" }) {
  return (
    <motion.div className={className}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(index, 12) * 0.04 }}>
      {children}
    </motion.div>
  );
}

export function FormPills({ wins }) {
  return (
    <span>
      {wins.map((w, i) => (
        <span key={i}
          className={`mr-1 inline-block min-w-7 rounded-lg px-1.5 py-0.5 text-center text-xs font-semibold ${
            w ? "bg-[#D8FF02] text-black" : "bg-white/15 text-white/70"}`}>
          {w ? "W" : "L"}
        </span>
      ))}
    </span>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="micro-label mb-1.5 mt-2.5 block">{label}</span>
      {children}
    </label>
  );
}

export function PrimaryButton({ children, ...rest }) {
  return (
    <button
      className="mt-4 w-full rounded-full bg-[#D8FF02] p-3.5 text-[15px] font-semibold text-black transition hover:brightness-110 active:translate-y-px"
      {...rest}>
      {children}
    </button>
  );
}

export function KV({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/10 py-2 text-sm last:border-0">
      <span className="micro-label normal-case">{k}</span>
      <b className="tnum text-right">{v}</b>
    </div>
  );
}

export const pct1 = (x) => (x == null ? null : `${Math.round(x * 100)}%`);
