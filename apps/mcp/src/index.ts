/**
 * Dayla MCP server — exposes booking tools over Streamable HTTP.
 *
 * v1 stub: registers the tool surface so MCP registries can discover us,
 * and returns structured stub responses. Real implementation (L2) wires
 * through @dayla/api-client to the live API and adds OAuth/auth.
 *
 * Listing status (target):
 *   - https://mcp.so (bookkeeping site, ~20k servers)
 *   - https://glama.ai/mcp (~37k)
 *   - https://smithery.ai
 *   - https://www.pulsemcp.com
 *   - https://modelcontextprotocol.io registry (official)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

type Bindings = {
  ENVIRONMENT: string;
  DAYLA_API_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({ origin: '*' }));

const server = new McpServer(
  {
    name: 'dayla-mcp',
    version: '0.1.0',
  },
  {
    capabilities: { tools: {} },
    instructions:
      "Dayla is a scheduling platform. Use get_profile to discover a user's event types, check_availability to find free slots in a date range, and book_meeting to create a booking. Always confirm times with the user before calling book_meeting.",
  },
);

server.tool(
  'get_profile',
  { username: z.string().describe('The Dayla username (e.g. "demo"). Resolves at dayla.com/username.') },
  async ({ username }) => ({
    content: [{
      type: 'text',
      text: JSON.stringify({
        username, display_name: 'Demo Dayla', timezone: 'America/New_York',
        event_types: [
          { slug: 'demo-15', title: '15-min Dayla demo', duration_minutes: 15 },
          { slug: 'demo-30', title: '30-min Dayla demo', duration_minutes: 30 },
          { slug: 'demo-60', title: '60-min deep dive', duration_minutes: 60 },
        ],
        concierge_enabled: true,
      }, null, 2),
    }],
  }),
);

server.tool(
  'check_availability',
  {
    username: z.string(),
    event_type_slug: z.string(),
    from: z.string().describe('ISO 8601 datetime, UTC.'),
    to: z.string().describe('ISO 8601 datetime, UTC.'),
    visitor_timezone: z.string().default('UTC'),
  },
  async ({ username, event_type_slug, from, to, visitor_timezone }) => ({
    content: [{
      type: 'text',
      text: JSON.stringify({
        username, event_type_slug, visitor_timezone, from, to,
        slots: [
          { start: '2026-07-08T14:00:00Z', end: '2026-07-08T14:30:00Z' },
          { start: '2026-07-08T15:00:00Z', end: '2026-07-08T15:30:00Z' },
          { start: '2026-07-09T14:00:00Z', end: '2026-07-09T14:30:00Z' },
        ],
      }, null, 2),
    }],
  }),
);

server.tool(
  'book_meeting',
  {
    username: z.string(),
    event_type_slug: z.string(),
    starts_at: z.string().describe('ISO 8601 datetime, UTC.'),
    visitor_name: z.string(),
    visitor_email: z.string().email(),
    visitor_timezone: z.string().default('UTC'),
    notes: z.string().optional(),
  },
  async ({ username, event_type_slug, starts_at, visitor_name, visitor_email, visitor_timezone, notes }) => ({
    content: [{
      type: 'text',
      text: JSON.stringify({
        ok: true,
        booking_id: 'stub_' + Math.random().toString(36).slice(2),
        username, event_type_slug, starts_at, visitor_name, visitor_email, visitor_timezone,
        notes: notes ?? null,
        cancel_url: 'https://dayla.com/b/cancel/stub',
        reschedule_url: 'https://dayla.com/b/reschedule/stub',
      }, null, 2),
    }],
  }),
);

const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

app.all('/mcp', async (c) => {
  return await transport.handleRequest(c.req.raw);
});

app.get('/healthz', (c) => c.json({ ok: true, server: 'dayla-mcp', version: '0.1.0' }));

await server.connect(transport);

export default app;
