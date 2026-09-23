/* Shared presentational components. No external deps. */

export function Logo({ team, size = 92 }) {
  // team: {short, color, logo}
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      {team.logo ? (
        <img
          src={team.logo}
          alt={team.short}
          width={size}
          height={size}
          className="rounded-full border border-slate-200 bg-white object-contain p-2 shadow"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fb = e.currentTarget.nextElementSibling;
            if (fb) fb.style.display = "flex";
          }}
        />
      ) : null}
      <span
        className="items-center justify-center rounded-full font-extrabold text-white"
        style={{
          display: team.logo ? "none" : "flex",
          width: size,
          height: size,
          background: team.color,
          fontSize: size / 3.4,
        }}
      >
        {team.short}
      </span>
    </span>
  );
}

export function CodeChip({ team }) {
  return (
    <span
      className="mb-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-widest text-white"
      style={{ background: team.color }}
    >
      {team.short}
    </span>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <h3 className="mb-3 border-l-4 border-[var(--color-accent)] pl-2.5 text-xs font-extrabold uppercase tracking-[1.1px] text-slate-500">
      {children}
    </h3>
  );
}

/** Dual-sided compare row: left value | label | right value + team-color bar. */
export function CompareRow({ label, v1, v2, t1, t2, fmt = (x) => x }) {
  const a = Math.max(v1, 0.001);
  const p = Math.round((a / (a + Math.max(v2, 0.001))) * 100);
  return (
    <div className="mb-3">
      <div className="mb-1 grid grid-cols-[1fr_auto_1fr] text-sm">
        <b className="tnum">{fmt(v1)}</b>
        <span className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <b className="tnum text-right">{fmt(v2)}</b>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div style={{ width: `${p}%`, background: t1.color }} />
        <div style={{ width: `${100 - p}%`, background: t2.color }} />
      </div>
    </div>
  );
}

export function Meter({ pct }) {
  return (
    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent2)]"
        style={{ width: `${Math.round(pct)}%` }}
      />
    </div>
  );
}

export function Verdict({ icon = "T", title, children }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-violet-50 p-3.5">
      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent2)] text-lg font-extrabold text-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-[15px]">
        <b>{title}</b>
        {children}
      </div>
    </div>
  );
}

export function FormPills({ wins }) {
  // wins: array of bool
  return (
    <span>
      {wins.map((w, i) => (
        <span
          key={i}
          className={`mr-1 inline-block min-w-7 rounded-lg px-1.5 py-0.5 text-center text-xs font-extrabold text-white ${
            w ? "bg-[var(--color-win)]" : "bg-[var(--color-lose)]"
          }`}
        >
          {w ? "W" : "L"}
        </span>
      ))}
    </span>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 mt-2.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border-[1.5px] border-slate-200 bg-slate-50 px-3 py-2.5 text-[14.5px] text-slate-900 focus:border-[var(--color-accent)] focus:bg-white focus:outline-none";

export function PrimaryButton({ children, ...rest }) {
  return (
    <button
      className="mt-4 w-full rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent2)] p-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-blue-600/25 hover:brightness-110 active:translate-y-px"
      {...rest}
    >
      {children}
    </button>
  );
}

export function KV({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-slate-200 py-2 text-sm last:border-0">
      <span className="text-slate-600">{k}</span>
      <b className="tnum text-right">{v}</b>
    </div>
  );
}

export const pct1 = (x) => `${Math.round(x * 100)}%`;
