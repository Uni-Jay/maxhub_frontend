import type { CSSProperties, ReactNode } from 'react';
import { useBrands } from '@hooks/useErp';

/** Fallback brand colours (from the logos) used until the brand profile loads. */
export const BRAND_COLORS: Record<string, { primary: string; secondary: string }> = {
  VM: { primary: '#1d3a8f', secondary: '#c8102e' }, // VisaMax blue & red
  KS: { primary: '#4c9a2a', secondary: '#1f2a30' }, // Kurios SAT green & charcoal
  BM: { primary: '#7a1f33', secondary: '#c9a27a' }, // BeadMax wine & rose gold
  MF: { primary: '#2f7d32', secondary: '#f2a900' }, // Maxfood green & gold
};

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** The colour to use for buttons/highlights — a near-black primary (e.g. Kurios charcoal) uses its secondary colour instead so it stays visible in dark mode. */
export function brandAccent(code?: string | null, primary?: string, secondary?: string) {
  const fb = BRAND_COLORS[(code || '').split('-')[0].toUpperCase()];
  const p = primary || fb?.primary;
  const s = secondary || fb?.secondary;
  if (!p) return { accent: '#4f46e5', second: '#7c3aed' };
  return luminance(p) < 0.03 && s ? { accent: s, second: p } : { accent: p, second: s || p };
}

export function useBrandStyle(code?: string | null): CSSProperties {
  const { byCode } = useBrands();
  const b = code ? byCode(code) : undefined;
  const { accent, second } = brandAccent(code, b?.primaryColor, b?.secondaryColor);
  return { ['--brand' as any]: accent, ['--brand-2' as any]: second };
}

/** Wraps a brand's screens so buttons, tabs, chips and highlights use that brand's colours. */
export function BrandTheme({ code, children, header = false }: { code?: string | null; children: ReactNode; header?: boolean }) {
  const style = useBrandStyle(code);
  const { byCode, logo } = useBrands();
  const b = code ? byCode(code) : undefined;
  return (
    <div style={style} className="space-y-4">
      {header && b && (
        <div className="flex items-center gap-3 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="w-1.5 self-stretch brand-accent-bar" />
          {logo(b) && <img src={logo(b)} alt={b.displayName} className="h-12 max-w-[150px] object-contain my-2 rounded bg-white" />}
          <div className="py-2 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{b.displayName}</p>
            <p className="text-xs brand-text truncate">{b.tagline}</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
