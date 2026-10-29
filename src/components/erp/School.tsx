import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BRAND_LOGOS } from '@hooks/useErp';
import { brandAccent } from './BrandTheme';
import { cn } from '@utils/cn';

/**
 * MaxHub runs two separate schools whose students, courses and fees must not
 * mix: Kurios SAT ICT Training Center (KS) and Beadmax Design Vocational
 * School (BM). Every school page carries ?school=KS|BM and sends it to the API.
 */
export type School = 'KS' | 'BM';

export const SCHOOLS: Record<School, { name: string; short: string; logo: string }> = {
  KS: { name: 'Kurios SAT — ICT Training Center', short: 'Kurios SAT', logo: BRAND_LOGOS.KS },
  BM: { name: 'Beadmax Design Vocational School', short: 'BeadMax School', logo: BRAND_LOGOS.BM },
};

const KEY = 'maxhub-school';

export function useSchool() {
  const [params, setParams] = useSearchParams();
  const fromUrl = (params.get('school') || '').toUpperCase();
  let stored: string | null = null;
  try { stored = localStorage.getItem(KEY); } catch { /* ignore */ }
  const school: School = fromUrl === 'BM' || fromUrl === 'KS' ? fromUrl : stored === 'BM' ? 'BM' : 'KS';

  useEffect(() => {
    try { localStorage.setItem(KEY, school); } catch { /* ignore */ }
    if (fromUrl !== school) {
      const p = new URLSearchParams(params);
      p.set('school', school);
      setParams(p, { replace: true });
    }
  }, [school]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSchool = (s: School) => {
    const p = new URLSearchParams(params);
    p.set('school', s);
    setParams(p, { replace: true });
  };
  const { accent } = brandAccent(school);
  return { school, setSchool, info: SCHOOLS[school], style: { ['--brand' as any]: accent } as React.CSSProperties };
}

/** School header + switcher shown at the top of every school page. */
export function SchoolBar({ school, setSchool }: { school: School; setSchool: (s: School) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(SCHOOLS) as School[]).map((s) => {
        const active = s === school;
        return (
          <button key={s} onClick={() => setSchool(s)}
            style={{ ['--brand' as any]: brandAccent(s).accent }}
            className={cn('flex items-center gap-3 rounded-2xl border px-3 py-2 transition text-left',
              active ? 'brand-border bg-white dark:bg-gray-900 shadow-sm' : 'border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 opacity-70 hover:opacity-100')}>
            <img src={SCHOOLS[s].logo} alt="" className="h-9 w-20 object-contain rounded bg-white" />
            <span>
              <span className={cn('block text-sm font-semibold', active ? 'brand-text' : 'text-gray-700 dark:text-gray-300')}>{SCHOOLS[s].short}</span>
              <span className="block text-[11px] text-gray-500">{s === 'KS' ? 'ICT Training Center' : 'Vocational School'}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
