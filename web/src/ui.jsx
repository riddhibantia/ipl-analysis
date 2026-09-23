/* Courtix-system primitives: glass cards, dual bars, count-ups. Dark only. */
import { useEffect, useState } from "react";

export function useCountUp(target, ms = 400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function CountUp({ value, format = (x) => Math.round(x).toLocaleString(), ms }) {
  return <span className="tnum">{format(useCountUp(value, ms))}</span>;
}

export function Logo({ team, size = 56 }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {team.logo ? (
        <img
          src={team.logo}
          alt={team.short}
          width={size}
          height={size}
          className="rounded-full border border-white/15 bg-white object-contain p-1.5"
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
          width: size, height: size, background: team.color, fontSize: size / 3.4,
        }}
      >
        {team.short}
      </span>
    </span>
  );
}

export function CodeChip({ team }) {
  return (
    <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-widest text-black"
      style={{ background: team.color === "#F9CD05" ? "#D8FF02" : team.color, color: "#000" }}>
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

/** Dual progress bars meeting at center: label left, bar, value right (spec 1.4/2.1). */
export function DualBar({ label, left, right, leftColor = "#D8FF02", rightColor = "#88A1FF", format = (x) => x }) {
  const a = Math.max(left, 0.0001);
  const p = Math.round((a / (a + Math.max(right, 0.0001))) * 100);
  return (
    <div className="py-1.5">
      <div className="mb-1 grid grid-cols-[1fr_auto] items-baseline text-sm">
        <span className="micro-label">{label}</span>
        <span className="tnum text-[13px]">
          <b style={{ color: leftColor }}>{format(left)}</b>
          <span className="opacity-40"> / </span>
          <b style={{ color: rightColor }}>{format(right)}</b>
        </span>
      </div>
      <div className="flex h-2 gap-1 overflow-hidden">
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-white/10">
          <div className="fill-in h-full rounded-full" style={{ width: `${p}%`, background: leftColor }} />
        </div>
        <div className="flex flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="fill-in h-full rounded-full" style={{ width: `${100 - p}%`, background: rightColor }} />
        </div>
      </div>
    </div>
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

export const pct1 = (x) => (x == null ? "–" : `${Math.round(x * 100)}%`);
