import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { daylaDefault, type PublicPage, type EventType, type Slot } from '@dayla/api-client';
import { MyDaylaPage } from './components/MyDaylaPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { detectVisitorTimezone } from './lib/timezone';

export function App() {
  const username = resolveUsername();
  const visitorTz = detectVisitorTimezone();
  const client = daylaDefault();

  const [page, setPage] = useState<PublicPage | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [slotsByEvent, setSlotsByEvent] = useState<Record<string, Slot[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await client.getPage(username);
        if (cancelled) return;
        setPage(p);
        const { event_types } = await client.getEventTypes(p.id);
        if (cancelled) return;
        setEventTypes(event_types);
        const slotMap: Record<string, Slot[]> = {};
        await Promise.all(event_types.map(async (et) => {
          const { slots } = await client.getAvailability({ pageId: p.id, slug: et.slug, tz: visitorTz });
          slotMap[et.id] = slots;
        }));
        if (!cancelled) setSlotsByEvent(slotMap);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold text-white">Couldn't load this page</h1>
        <p className="mt-2 text-dayla-muted">{error}</p>
      </div>
    );
  }

  if (!page) {
    return <div className="mx-auto max-w-md px-6 py-20 text-center text-dayla-muted"><p>Loading…</p></div>;
  }

  return (
    <ErrorBoundary>
      <MyDaylaPage
        page={page}
        eventTypes={eventTypes}
        slotsByEvent={slotsByEvent}
        visitorTimezone={visitorTz}
        onSelectSlot={async (et, slot) => {
          const local = DateTime.fromISO(slot.start, { zone: 'utc' }).setZone(visitorTz);
          alert(`Hold requested: ${et.title} at ${local.toFormat('ccc, LLL d · HH:mm ZZZZ')}`);
        }}
      />
    </ErrorBoundary>
  );
}

function resolveUsername(): string {
  if (typeof window === 'undefined') return 'demo';
  const m = window.location.pathname.match(/^\/([^/?#]+)/);
  if (m && m[1] && m[1] !== '') return decodeURIComponent(m[1]);
  return 'demo';
}
