'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setChecklistTick } from '@/lib/app/actions';
import type { ChecklistItem } from '@/lib/app/learning';

const due = (iso: string) => new Date(iso + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The family's list: tap a line to tick it off (or tap again to untick). */
export default function ChecklistTicks({ items, done }: { items: ChecklistItem[]; done: number[] }) {
  const router = useRouter();
  const [ticked, setTicked] = useState(() => new Set(done));
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: number) {
    const next = !ticked.has(id);
    setBusy(id);
    setError(null);
    // Show it straight away; put it back if the save fails.
    setTicked((s) => {
      const n = new Set(s);
      if (next) n.add(id);
      else n.delete(id);
      return n;
    });
    const r = await setChecklistTick(id, next);
    setBusy(null);
    if (!r.ok) {
      setError(r.error ?? 'Could not save — try again.');
      setTicked((s) => {
        const n = new Set(s);
        if (next) n.delete(id);
        else n.add(id);
        return n;
      });
      return;
    }
    router.refresh();
  }

  const count = items.filter((i) => ticked.has(i.id)).length;

  return (
    <>
      <section className="papp-card">
        <div className="papp-progress-head">
          <strong>
            {count} of {items.length} done
          </strong>
          {count === items.length && items.length > 0 && <span>All ready ✓</span>}
        </div>
        <div className="papp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={count}>
          <i style={{ width: `${items.length ? (count / items.length) * 100 : 0}%` }} />
        </div>
      </section>
      <section className="papp-card">
        <ul className="papp-ticks">
          {items.map((i) => {
            const on = ticked.has(i.id);
            return (
              <li key={i.id}>
                <button type="button" role="checkbox" aria-checked={on} className={on ? 'on' : undefined} disabled={busy === i.id} onClick={() => toggle(i.id)}>
                  <span className="papp-tick-box" aria-hidden="true">{on ? '✓' : ''}</span>
                  <span className="papp-tick-text">
                    <span className="papp-tick-title">{i.title}</span>
                    {i.detail && <span className="papp-tick-detail">{i.detail}</span>}
                    {i.dueDate && !on && <span className="papp-tick-due">By {due(i.dueDate)}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {error && <p className="papp-error">{error}</p>}
      </section>
    </>
  );
}
