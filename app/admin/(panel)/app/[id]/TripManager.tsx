'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  addAppDocument,
  addAppMember,
  addHighlight,
  addScheduleItem,
  deleteAppDocument,
  deleteAppMember,
  deleteAppPost,
  deleteHighlight,
  deleteScheduleItem,
  sendPctReply,
  updateAppTrip,
} from '@/lib/admin/app-actions';
import { createClient } from '@/lib/supabase/client';

const inputCls =
  'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full';
const labelCls = 'text-xs font-semibold uppercase tracking-widest text-teal-deep';
const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors';

type Member = { id: number; role: string; name: string; loginCode: string; parentOf: number | null };
type Doc = { id: number; kind: string; title: string; fileUrl: string; scope: string; memberId: number | null };
type HighlightRow = { id: number; date: string; caption: string; imageUrl: string | null; sortOrder: number };
type ScheduleRow = {
  id: number; date: string; startTime: string; title: string; description: string;
  meetingPlace: string | null; meetingTime: string | null; educationalContent: string | null;
};

export default function TripManager({
  trip,
  members,
  documents,
  pctMessages,
  posts,
  highlights,
  schedule,
}: {
  trip: {
    id: number; title: string; destination: string; startDate: string | null; endDate: string | null;
    status: string; contacts: { label: string; phone: string }[]; confirmations: { label: string; ref: string }[];
  };
  members: Member[];
  documents: Doc[];
  pctMessages: { id: number; fromTeam: boolean; senderName: string; body: string; createdAt: string }[];
  posts: { id: number; memberName: string; imageUrl: string | null; caption: string | null; createdAt: string }[];
  highlights: HighlightRow[];
  schedule: ScheduleRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState(trip.contacts);
  const [confirmations, setConfirmations] = useState(trip.confirmations);
  const [savedMeta, setSavedMeta] = useState(false);
  const [reply, setReply] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docKind, setDocKind] = useState('flight');
  const [docScope, setDocScope] = useState<'all' | 'teacher'>('all');
  const [docMember, setDocMember] = useState<number | ''>('');
  const [newMemberRole, setNewMemberRole] = useState<'teacher' | 'student' | 'parent'>('student');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberParentOf, setNewMemberParentOf] = useState<number | ''>('');
  const [hlDate, setHlDate] = useState(trip.startDate ?? '');
  const [hlCaption, setHlCaption] = useState('');
  const [hlUploading, setHlUploading] = useState(false);
  const [sched, setSched] = useState({
    date: trip.startDate ?? '', startTime: '09:00', title: '', description: '',
    meetingPlace: '', meetingTime: '', educationalContent: '',
  });

  const students = members.filter((m) => m.role === 'student');
  const nameOf = (id: number | null) => members.find((m) => m.id === id)?.name ?? '';
  const codePrefix = members[0]?.loginCode.split('-')[0] ?? 'TRIP';
  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.error ?? 'Something went wrong.');
    else router.refresh();
  };

  function credentialsCsv() {
    const rows = [['Name', 'Role', 'Linked student', 'Access code', 'Login page']];
    for (const m of members) {
      rows.push([m.name, m.role, nameOf(m.parentOf), m.loginCode, `${window.location.origin}/app`]);
    }
    const csv = rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${trip.title.replace(/[^\w]+/g, '-')}-app-credentials.csv`;
    a.click();
  }

  async function uploadHighlight(file: File | null) {
    if (!hlDate || !hlCaption.trim()) {
      setError('Highlight needs a date and a caption.');
      return;
    }
    setHlUploading(true);
    setError(null);
    try {
      let url: string | null = null;
      if (file) {
        const supabase = createClient();
        const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
        const path = `app-highlights/${trip.id}/${Date.now()}-${clean}`;
        const { error: upErr } = await supabase.storage.from('trip-images').upload(path, file, { contentType: file.type });
        if (upErr) throw new Error(upErr.message);
        url = supabase.storage.from('trip-images').getPublicUrl(path).data.publicUrl;
      }
      const nextOrder = highlights.filter((h) => h.date === hlDate).length;
      await act(() => addHighlight({ tripId: trip.id, date: hlDate, caption: hlCaption, imageUrl: url, sortOrder: nextOrder }));
      setHlCaption('');
    } catch (e: any) {
      setError(`Upload failed: ${e.message}`);
    } finally {
      setHlUploading(false);
    }
  }

  async function uploadDoc(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      const path = `app-docs/${trip.id}/${Date.now()}-${clean}`;
      const { error: upErr } = await supabase.storage.from('trip-images').upload(path, file, { contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const url = supabase.storage.from('trip-images').getPublicUrl(path).data.publicUrl;
      await act(() =>
        addAppDocument({
          tripId: trip.id,
          memberId: docMember === '' ? null : Number(docMember),
          scope: docScope,
          kind: docKind,
          title: docTitle || file.name,
          fileUrl: url,
        })
      );
      setDocTitle('');
      setDocMember('');
    } catch (e: any) {
      setError(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl grid gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl">{trip.title}</h1>
          <p className="text-sm text-ink-soft mt-1">
            {trip.destination} · app login at <code>/app</code> · prefix {codePrefix}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={credentialsCsv} className={smallBtn}>Download credentials CSV</button>
          <button
            onClick={() => act(() => updateAppTrip(trip.id, { status: trip.status === 'active' ? 'archived' : 'active' }))}
            className={smallBtn}
          >
            {trip.status === 'active' ? 'Archive trip' : 'Reactivate trip'}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* members + credentials */}
      <div className="border border-line rounded p-6 grid gap-3">
        <span className={labelCls}>Members &amp; access codes ({members.length})</span>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line">
                <th className="py-2 pr-3 font-semibold">Name</th>
                <th className="py-2 pr-3 font-semibold">Role</th>
                <th className="py-2 pr-3 font-semibold">Linked student</th>
                <th className="py-2 pr-3 font-semibold">Access code</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3">{m.name}</td>
                  <td className="py-2 pr-3 capitalize">{m.role}</td>
                  <td className="py-2 pr-3 text-ink-soft">{nameOf(m.parentOf) || '—'}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{m.loginCode}</td>
                  <td className="py-2 text-right">
                    <button className={smallBtn} onClick={() => { if (window.confirm(`Remove ${m.name}?`)) act(() => deleteAppMember(m.id)); }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 flex-wrap items-end border-t border-line pt-4">
          <select className={`${inputCls} w-28`} value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as any)}>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
          <input className={`${inputCls} w-56`} placeholder="Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
          {newMemberRole === 'parent' && (
            <select className={`${inputCls} w-48`} value={newMemberParentOf} onChange={(e) => setNewMemberParentOf(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Link to student…</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          )}
          <button
            className={smallBtn}
            onClick={() => {
              if (!newMemberName.trim()) return;
              act(() => addAppMember(trip.id, newMemberRole, newMemberName, codePrefix, newMemberRole === 'parent' && newMemberParentOf !== '' ? Number(newMemberParentOf) : null));
              setNewMemberName('');
            }}
          >
            + Add member
          </button>
        </div>
      </div>

      {/* documents */}
      <div className="border border-line rounded p-6 grid gap-3">
        <span className={labelCls}>Documents ({documents.length})</span>
        {documents.map((d) => (
          <div key={d.id} className="flex items-center gap-3 text-sm border-b border-line last:border-0 pb-2">
            <span className="capitalize text-xs text-ink-soft w-20">{d.kind}</span>
            <a href={d.fileUrl} target="_blank" className="flex-1 font-medium hover:text-teal-deep truncate">{d.title}</a>
            <span className="text-xs text-ink-soft">{d.memberId ? nameOf(d.memberId) : d.scope === 'teacher' ? 'teachers only' : 'everyone'}</span>
            <button className={smallBtn} onClick={() => act(() => deleteAppDocument(d.id))}>✕</button>
          </div>
        ))}
        <div className="flex gap-2 flex-wrap items-end border-t border-line pt-4">
          <select className={`${inputCls} w-32`} value={docKind} onChange={(e) => setDocKind(e.target.value)}>
            {['flight', 'hotel', 'ticket', 'voucher', 'map', 'sightseeing', 'other'].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input className={`${inputCls} w-56`} placeholder="Title (defaults to filename)" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
          <select className={`${inputCls} w-36`} value={docScope} onChange={(e) => setDocScope(e.target.value as any)}>
            <option value="all">Everyone</option>
            <option value="teacher">Teachers only</option>
          </select>
          <select className={`${inputCls} w-48`} value={docMember} onChange={(e) => setDocMember(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Whole group</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>For: {st.name}</option>
            ))}
          </select>
          <label className={`${smallBtn} cursor-pointer`}>
            {uploading ? 'Uploading…' : '+ Upload file'}
            <input type="file" hidden disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }} />
          </label>
        </div>
      </div>

      {/* daily schedule (app Itinerary + Learning) */}
      <div className="border border-line rounded p-6 grid gap-3">
        <span className={labelCls}>Daily schedule ({schedule.length}) — app Itinerary &amp; Learning</span>
        {schedule.map((s) => (
          <div key={s.id} className="flex items-start gap-3 text-sm border-b border-line last:border-0 pb-2">
            <span className="text-xs text-ink-soft w-24 shrink-0">
              {new Date(s.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {s.startTime}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-ink-soft truncate">
                {s.meetingPlace && <>Meet: {s.meetingPlace}{s.meetingTime ? ` at ${s.meetingTime}` : ''} · </>}
                {s.description}
                {s.educationalContent && ' · 🎓 has learning note'}
              </div>
            </div>
            <button className={smallBtn} onClick={() => act(() => deleteScheduleItem(s.id))}>✕</button>
          </div>
        ))}
        {schedule.length === 0 && <p className="text-sm text-ink-soft">No timed entries yet — add the first below.</p>}
        <div className="grid gap-2 border-t border-line pt-4">
          <div className="flex gap-2 flex-wrap">
            <input type="date" className={`${inputCls} w-40`} value={sched.date} onChange={(e) => setSched({ ...sched, date: e.target.value })} />
            <input type="time" className={`${inputCls} w-28`} value={sched.startTime} onChange={(e) => setSched({ ...sched, startTime: e.target.value })} />
            <input className={`${inputCls} flex-1 min-w-[200px]`} placeholder="Activity title (Forbidden City guided tour)" value={sched.title} onChange={(e) => setSched({ ...sched, title: e.target.value })} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <input className={`${inputCls} flex-1 min-w-[200px]`} placeholder="Meeting place (Hotel lobby)" value={sched.meetingPlace} onChange={(e) => setSched({ ...sched, meetingPlace: e.target.value })} />
            <input type="time" className={`${inputCls} w-28`} value={sched.meetingTime} onChange={(e) => setSched({ ...sched, meetingTime: e.target.value })} />
          </div>
          <textarea rows={2} className={inputCls} placeholder="Description — what happens during this activity" value={sched.description} onChange={(e) => setSched({ ...sched, description: e.target.value })} />
          <textarea rows={2} className={inputCls} placeholder="Learning note (optional) — the educational story used during the tour" value={sched.educationalContent} onChange={(e) => setSched({ ...sched, educationalContent: e.target.value })} />
          <button
            className={`${smallBtn} justify-self-start`}
            onClick={() => {
              if (!sched.date || !sched.startTime || !sched.title.trim()) { setError('Schedule entries need a date, time and title.'); return; }
              act(() => addScheduleItem({
                tripId: trip.id, date: sched.date, startTime: sched.startTime, title: sched.title,
                description: sched.description, meetingPlace: sched.meetingPlace || null,
                meetingTime: sched.meetingTime || null, educationalContent: sched.educationalContent || null,
              }));
              setSched({ ...sched, title: '', description: '', meetingPlace: '', meetingTime: '', educationalContent: '' });
            }}
          >
            + Add schedule entry
          </button>
        </div>
      </div>

      {/* day highlights (app home rail) */}
      <div className="border border-line rounded p-6 grid gap-3">
        <span className={labelCls}>Day highlights ({highlights.length}) — “What’s happening today”</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {highlights.map((h) => (
            <div key={h.id} className="border border-line rounded overflow-hidden text-xs">
              {h.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.imageUrl} alt="" className="w-full h-24 object-cover" />
              )}
              <div className="p-2">
                <div className="text-ink-soft">{new Date(h.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                <div className="font-medium truncate">{h.caption}</div>
                <button className="text-danger font-semibold mt-1" onClick={() => act(() => deleteHighlight(h.id))}>Remove</button>
              </div>
            </div>
          ))}
          {highlights.length === 0 && <p className="text-sm text-ink-soft col-span-full">No highlights yet — they fill the image rail on the app home page.</p>}
        </div>
        <div className="flex gap-2 flex-wrap items-end border-t border-line pt-4">
          <input type="date" className={`${inputCls} w-40`} value={hlDate} onChange={(e) => setHlDate(e.target.value)} />
          <input className={`${inputCls} flex-1 min-w-[200px]`} placeholder="Caption (Morning at the Great Wall)" value={hlCaption} onChange={(e) => setHlCaption(e.target.value)} />
          <label className={`${smallBtn} cursor-pointer`}>
            {hlUploading ? 'Uploading…' : '+ Add with photo'}
            <input type="file" accept="image/*" hidden disabled={hlUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHighlight(f); e.target.value = ''; }} />
          </label>
          <button className={smallBtn} disabled={hlUploading} onClick={() => uploadHighlight(null)}>+ Add without photo</button>
        </div>
      </div>

      {/* contacts + confirmations */}
      <div className="border border-line rounded p-6 grid gap-4">
        <span className={labelCls}>Teacher layer: contacts &amp; confirmation numbers</span>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="grid gap-2">
            {contacts.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} placeholder="Label (24/7 PCT line)" value={c.label} onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className={inputCls} placeholder="+971…" value={c.phone} onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />
                <button className={smallBtn} onClick={() => setContacts(contacts.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className={`${smallBtn} justify-self-start`} onClick={() => setContacts([...contacts, { label: '', phone: '' }])}>+ Contact</button>
          </div>
          <div className="grid gap-2">
            {confirmations.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} placeholder="Label (Hotel Örk)" value={c.label} onChange={(e) => setConfirmations(confirmations.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className={inputCls} placeholder="Confirmation no." value={c.ref} onChange={(e) => setConfirmations(confirmations.map((x, j) => (j === i ? { ...x, ref: e.target.value } : x)))} />
                <button className={smallBtn} onClick={() => setConfirmations(confirmations.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className={`${smallBtn} justify-self-start`} onClick={() => setConfirmations([...confirmations, { label: '', ref: '' }])}>+ Confirmation</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="bg-teal text-ink font-semibold text-sm px-5 py-2 rounded-sm hover:bg-teal-hover transition-colors"
            onClick={async () => {
              setSavedMeta(false);
              await act(() => updateAppTrip(trip.id, {
                contacts: contacts.filter((c) => c.label || c.phone),
                confirmations: confirmations.filter((c) => c.label || c.ref),
              }));
              setSavedMeta(true);
            }}
          >
            Save teacher info
          </button>
          {savedMeta && <span className="text-sm text-teal-deep font-semibold">Saved ✓</span>}
        </div>
      </div>

      {/* PCT messages */}
      <div className="border border-line rounded p-6 grid gap-3">
        <span className={labelCls}>Teacher ↔ PCT messages</span>
        <div className="grid gap-2">
          {pctMessages.map((m) => (
            <div key={m.id} className={`rounded p-3 text-sm max-w-lg ${m.fromTeam ? 'bg-teal/10 justify-self-end' : 'bg-ink/5'}`}>
              <div className="text-xs text-ink-soft mb-1">
                {m.senderName} · {new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              {m.body}
            </div>
          ))}
          {pctMessages.length === 0 && <p className="text-sm text-ink-soft">No messages from the teachers yet.</p>}
        </div>
        <div className="flex gap-2">
          <textarea rows={2} className={inputCls} placeholder="Reply as PCT Team…" value={reply} onChange={(e) => setReply(e.target.value)} />
          <button
            className="bg-teal text-ink font-semibold text-sm px-5 rounded-sm hover:bg-teal-hover transition-colors"
            onClick={async () => { if (reply.trim()) { await act(() => sendPctReply(trip.id, reply)); setReply(''); } }}
          >
            Send
          </button>
        </div>
      </div>

      {/* feed moderation */}
      <div className="border border-line rounded p-6 grid gap-3">
        <span className={labelCls}>Photo feed (latest {posts.length}) — moderation</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {posts.map((p) => (
            <div key={p.id} className="border border-line rounded overflow-hidden text-xs">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="w-full h-24 object-cover" />
              )}
              <div className="p-2">
                <div className="font-medium truncate">{p.memberName}</div>
                {p.caption && <div className="text-ink-soft truncate">{p.caption}</div>}
                <button className="text-danger font-semibold mt-1" onClick={() => act(() => deleteAppPost(p.id))}>Remove</button>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-sm text-ink-soft col-span-full">Nothing posted yet.</p>}
        </div>
      </div>
    </div>
  );
}
