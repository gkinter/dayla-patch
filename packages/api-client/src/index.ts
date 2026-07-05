/**
 * Minimal typed client for the Dayla API.
 * Consumed by apps/web (and the future embeddable widget).
 */

export interface PublicPage {
  id: string;
  username: string;
  headline: string | null;
  bio: string | null;
  photo_url: string | null;
  theme: string;
  concierge_enabled: boolean;
  knowledge_box: string | null;
  og_image_url: string | null;
  owner: { display_name: string | null; timezone: string };
}

export interface EventType {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  location_kind: string;
  location_custom: string | null;
  video_provider: string | null;
  color: string | null;
  custom_questions: Array<{ id: string; label: string; type: string; required: boolean }>;
}

export interface Slot {
  start: string;
  end: string;
}

export interface Hold {
  hold_id: string;
  page_id: string;
  event_type_slug: string;
  starts_at: string;
  ends_at: string;
  visitor_timezone: string;
  visitor_email: string;
  visitor_name: string | null;
  answers: Record<string, string>;
  hold_expires_at: string;
  cancel_token: string;
  reschedule_token: string;
}

export interface ConciergeAction {
  type: 'suggest_slots' | 'confirm_booking' | 'handoff';
  label: string;
  slots?: Array<{ start: string; duration_minutes: number }>;
}

export interface ConciergeReply {
  session_token: string;
  reply: string;
  actions: ConciergeAction[];
  cost_cents: number;
  model_tier: 'fast' | 'frontier';
  handoff_available: boolean;
}

export interface DaylaClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

export class DaylaClient {
  private base: string;
  private fetch: typeof globalThis.fetch;

  constructor(opts: DaylaClientOptions) {
    this.base = opts.baseUrl.replace(/\/$/, '');
    this.fetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async getPage(username: string): Promise<PublicPage> {
    const r = await this.fetch(`${this.base}/v1/pages/${encodeURIComponent(username)}`);
    if (!r.ok) throw new DaylaApiError(r.status, await r.text());
    return r.json();
  }

  async getEventTypes(pageId: string): Promise<{ event_types: EventType[] }> {
    const r = await this.fetch(`${this.base}/v1/event-types/${encodeURIComponent(pageId)}`);
    if (!r.ok) throw new DaylaApiError(r.status, await r.text());
    return r.json();
  }

  async getAvailability(opts: { pageId: string; slug: string; tz: string; from?: string; to?: string }): Promise<{ slots: Slot[]; timezone: string }> {
    const params = new URLSearchParams({ tz: opts.tz });
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    const r = await this.fetch(`${this.base}/v1/event-types/${encodeURIComponent(opts.pageId)}/${encodeURIComponent(opts.slug)}/availability?${params}`);
    if (!r.ok) throw new DaylaApiError(r.status, await r.text());
    return r.json();
  }

  async holdBooking(opts: { pageId: string; eventTypeSlug: string; startsAt: string; visitorTimezone: string; visitorEmail: string; visitorName?: string; answers?: Record<string, string> }): Promise<Hold> {
    const r = await this.fetch(`${this.base}/v1/bookings/hold`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        page_id: opts.pageId, event_type_slug: opts.eventTypeSlug, starts_at: opts.startsAt,
        visitor_timezone: opts.visitorTimezone, visitor_email: opts.visitorEmail,
        visitor_name: opts.visitorName, answers: opts.answers ?? {},
      }),
    });
    if (!r.ok) throw new DaylaApiError(r.status, await r.text());
    return r.json();
  }

  async chat(opts: { username: string; message: string; visitorTimezone: string; sessionToken?: string }): Promise<ConciergeReply> {
    const r = await this.fetch(`${this.base}/v1/concierge/${encodeURIComponent(opts.username)}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        page_username: opts.username, message: opts.message,
        visitor_timezone: opts.visitorTimezone, session_token: opts.sessionToken,
      }),
    });
    if (!r.ok) throw new DaylaApiError(r.status, await r.text());
    return r.json();
  }
}

export class DaylaApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Dayla API error ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

let _default: DaylaClient | null = null;
export function daylaDefault(): DaylaClient {
  if (_default) return _default;
  const base = (import.meta as any).env?.VITE_API_URL ?? '';
  _default = new DaylaClient({ baseUrl: base || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8787') });
  return _default;
}
