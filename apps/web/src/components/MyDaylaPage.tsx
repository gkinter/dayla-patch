import { DateTime } from 'luxon';
import type { PublicPage, EventType, Slot } from '@dayla/api-client';
import { ConciergeWidget } from './ConciergeWidget';

interface Props {
  page: PublicPage;
  eventTypes: EventType[];
  slotsByEvent: Record<string, Slot[]>;
  visitorTimezone: string;
  onSelectSlot: (eventType: EventType, slot: Slot) => void;
}

export function MyDaylaPage({ page, eventTypes, slotsByEvent, visitorTimezone, onSelectSlot }: Props) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:py-20">
      <header className="flex flex-col items-center text-center">
        {page.photo_url ? (
          <img src={page.photo_url} alt={page.owner.display_name ?? page.username} className="h-24 w-24 rounded-full border border-dayla-border object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dayla-border bg-dayla-panel text-3xl font-semibold text-white">
            {(page.owner.display_name ?? page.username).slice(0, 1).toUpperCase()}
          </div>
        )}
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
          {page.owner.display_name ?? page.username}
        </h1>
        {page.headline && <p className="mt-1 text-dayla-muted">{page.headline}</p>}
        {page.bio && <p className="mt-4 max-w-prose text-sm text-dayla-muted">{page.bio}</p>}
      </header>

      <section className="mt-12 space-y-4">
        {eventTypes.map((et) => {
          const slots = slotsByEvent[et.id] ?? [];
          const nextFew = slots.slice(0, 12);
          return (
            <div key={et.id} className="panel">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="text-base font-medium text-white">{et.title}</h2>
                  <p className="mt-0.5 text-sm text-dayla-muted">{et.duration_minutes} min · {labelForLocation(et)}</p>
                </div>
                {et.color && <span className="inline-block h-2 w-2 rounded-full" style={{ background: et.color }} />}
              </div>
              {nextFew.length === 0 ? (
                <p className="mt-4 text-sm text-dayla-muted">No availability in the next 14 days.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {nextFew.map((slot) => {
                    const local = DateTime.fromISO(slot.start, { zone: 'utc' }).setZone(visitorTimezone);
                    return (
                      <button key={slot.start} onClick={() => onSelectSlot(et, slot)} className="btn-ghost text-sm">
                        {local.toFormat('LLL d · HH:mm')}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {page.concierge_enabled && (
        <section className="mt-12">
          <ConciergeWidget pageUsername={page.username} visitorTimezone={visitorTimezone} />
        </section>
      )}

      <footer className="mt-16 text-center text-xs text-dayla-muted">
        Powered by{' '}
        <a href={`https://dayla.com/?utm_source=viral&utm_medium=footer&utm_campaign=${page.username}`} className="text-dayla-accent hover:underline">
          Dayla
        </a>{' '}
        — get your own page.
      </footer>
    </main>
  );
}

function labelForLocation(et: EventType): string {
  if (et.location_kind === 'video' && et.video_provider) {
    return et.video_provider === 'meet' ? 'Google Meet' : et.video_provider === 'zoom' ? 'Zoom' : 'Video';
  }
  if (et.location_kind === 'phone') return 'Phone';
  if (et.location_kind === 'in_person') return 'In person';
  return et.location_custom ?? '';
}
