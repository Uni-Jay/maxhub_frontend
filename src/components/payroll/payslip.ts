import { apiClient } from '@services/apiClient';

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const abs = (url?: string | null) => (!url ? '' : /^https?:|^data:/.test(url) ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`);
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function money(n: any, currency = 'NGN') {
  const sym: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };
  return `${sym[currency] || `${currency} `}${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words(n: number): string {
  n = Math.floor(n);
  if (n === 0) return 'zero';
  const chunk = (x: number): string => {
    const h = Math.floor(x / 100), r = x % 100;
    const t = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? `-${ONES[r % 10]}` : ''}`;
    return [h ? `${ONES[h]} hundred` : '', t].filter(Boolean).join(h && t ? ' and ' : '');
  };
  const scales: Array<[number, string]> = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand'], [1, '']];
  const parts: string[] = [];
  for (const [v, name] of scales) {
    const q = Math.floor(n / v);
    if (q) { parts.push(`${chunk(q)}${name ? ` ${name}` : ''}`); n -= q * v; }
  }
  return parts.join(', ');
}
function amountInWords(n: number, currency: string) {
  const main = Math.floor(n), minor = Math.round((n - main) * 100);
  const [a, b] = currency === 'NGN' ? ['naira', 'kobo'] : currency === 'USD' ? ['dollars', 'cents'] : currency === 'GBP' ? ['pounds', 'pence'] : [currency, 'cents'];
  const w = `${words(main)} ${a}${minor ? ` and ${words(minor)} ${b}` : ''} only`;
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** Opens the payslip, branded with the brand that employs the staff member. */
export async function openPayslip(salaryId: number | string) {
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) { alert('Please allow pop-ups for this site to open the payslip.'); return; }
  w.document.write('<p style="font-family:Segoe UI,Arial;padding:40px;color:#6b7280">Preparing your payslip…</p>');
  let p: any;
  try {
    p = await apiClient.get<any>(`/erp/payslip/${salaryId}`);
  } catch (e: any) {
    w.document.body.innerHTML = `<p style="font-family:Segoe UI,Arial;padding:40px;color:#b91c1c">${esc(e?.message || 'Could not load the payslip')}</p>`;
    return;
  }
  const c = p.employer?.color || '#1e3a8a';
  const cur = p.currency || 'NGN';
  const period = p.month ? `${MONTHS[p.month]} ${p.year}` : p.periodCode;
  const rows = (list: any[]) => list.map((l) => `<tr><td>${esc(l.name)}</td><td class="r">${money(l.amount, cur)}</td></tr>`).join('');
  const also = (p.alsoWorksFor || []).filter((b: any) => b.logoUrl);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Payslip — ${esc(p.staff?.name)} — ${esc(period)}</title>
<style>
*{box-sizing:border-box} body{margin:0;background:#eef0f4;font-family:'Segoe UI',Arial,sans-serif;color:#111827;font-size:13px}
.page{max-width:820px;margin:24px auto;background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.head{display:flex;justify-content:space-between;align-items:center;padding:26px 34px;border-bottom:4px solid ${c}}
.head img{max-height:74px;max-width:250px;object-fit:contain}
.head .co{text-align:right;font-size:11px;color:#4b5563;line-height:1.5}.head .co b{display:block;font-size:17px;color:${c}}
.band{background:${c};color:#fff;padding:14px 34px;display:flex;justify-content:space-between;align-items:center}
.band h1{margin:0;font-size:18px;letter-spacing:3px;text-transform:uppercase}.band span{font-size:13px;opacity:.9}
.body{padding:26px 34px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 32px;margin-bottom:22px}
.kv{display:flex;justify-content:space-between;border-bottom:1px solid #f0f1f4;padding:7px 0}.kv span{color:#6b7280}.kv b{font-weight:600;text-align:right}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}
table{width:100%;border-collapse:collapse}th{background:#f6f7f9;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;padding:9px 10px}
td{padding:9px 10px;border-bottom:1px solid #f0f1f4}.r{text-align:right;font-variant-numeric:tabular-nums}
tfoot td{font-weight:700;border-top:2px solid #e5e7eb;border-bottom:none}
.net{margin-top:22px;border:2px solid ${c};border-radius:10px;display:flex;justify-content:space-between;align-items:center;padding:16px 22px}
.net .lbl{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280}.net .amt{font-size:26px;font-weight:800;color:${c}}
.words{font-size:12px;color:#374151;margin-top:6px;font-style:italic}
.status{display:inline-block;padding:3px 12px;border-radius:999px;font-size:11px;font-weight:700;background:${p.status === 'Paid' ? '#dcfce7;color:#166534' : '#fef3c7;color:#92400e'}}
.also{margin-top:24px;padding-top:14px;border-top:1px dashed #e5e7eb;display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:11px;color:#6b7280}
.also img{height:26px;object-fit:contain;opacity:.85}
.foot{padding:14px 34px;background:#f9fafb;font-size:10.5px;color:#6b7280;text-align:center;border-top:1px solid #f0f1f4}
.btn{display:block;margin:0 auto 30px;padding:11px 30px;background:${c};color:#fff;border:0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;border-radius:0}.btn{display:none}}
</style></head><body>
<div class="page">
  <div class="head">
    ${p.employer?.logoUrl ? `<img src="${esc(abs(p.employer.logoUrl))}" alt="${esc(p.employer?.name)}">` : `<b style="font-size:22px;color:${c}">${esc(p.employer?.name)}</b>`}
    <div class="co"><b>${esc(p.employer?.name)}</b>${esc(p.employer?.address || '')}<br>${[p.employer?.phone, p.employer?.email, p.employer?.website].filter(Boolean).map(esc).join(' · ')}</div>
  </div>
  <div class="band"><h1>Payslip</h1><span>${esc(period)} &nbsp;·&nbsp; <span class="status">${esc(p.status)}</span></span></div>
  <div class="body">
    <div class="grid">
      <div>
        <div class="kv"><span>Employee</span><b>${esc(p.staff?.name)}</b></div>
        <div class="kv"><span>Staff ID</span><b>${esc(p.staff?.employeeId || '—')}</b></div>
        <div class="kv"><span>Position</span><b>${esc(p.staff?.position || '—')}</b></div>
        <div class="kv"><span>Department</span><b>${esc(p.staff?.department || '—')}</b></div>
      </div>
      <div>
        <div class="kv"><span>Pay period</span><b>${p.startDate ? `${esc(new Date(p.startDate).toLocaleDateString('en-GB'))} – ${esc(new Date(p.endDate).toLocaleDateString('en-GB'))}` : esc(period)}</b></div>
        <div class="kv"><span>Payment date</span><b>${p.paidOn ? esc(new Date(p.paidOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })) : 'Pending'}</b></div>
        <div class="kv"><span>Bank</span><b>${esc(p.staff?.bankName || '—')}</b></div>
        <div class="kv"><span>Account</span><b>${p.staff?.accountNumber ? `•••• ${esc(String(p.staff.accountNumber).slice(-4))}` : '—'}</b></div>
      </div>
    </div>
    <div class="cols">
      <table><thead><tr><th>Earnings</th><th class="r">Amount</th></tr></thead><tbody>${rows(p.earnings || [])}</tbody>
        <tfoot><tr><td>Gross pay</td><td class="r">${money(p.grossSalary, cur)}</td></tr></tfoot></table>
      <table><thead><tr><th>Deductions</th><th class="r">Amount</th></tr></thead><tbody>${(p.deductions || []).length ? rows(p.deductions) : '<tr><td colspan="2" style="color:#9ca3af">No deductions</td></tr>'}</tbody>
        <tfoot><tr><td>Total deductions</td><td class="r">${money(p.totalDeductions, cur)}</td></tr></tfoot></table>
    </div>
    <div class="net"><div><div class="lbl">Net pay</div><div class="words">${esc(amountInWords(p.netSalary, cur))}</div></div><div class="amt">${money(p.netSalary, cur)}</div></div>
    ${p.remarks ? `<p style="margin-top:14px;font-size:12px;color:#6b7280">Note: ${esc(p.remarks)}</p>` : ''}
    ${also.length ? `<div class="also"><span>Also works for</span>${also.map((b: any) => `<img src="${esc(abs(b.logoUrl))}" alt="${esc(b.name)}" title="${esc(b.name)}">`).join('')}</div>` : ''}
  </div>
  <div class="foot">This payslip is computer-generated by ${esc(p.employer?.name)} through MaxHub and does not need a signature. Please keep it private.</div>
</div>
<button class="btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
