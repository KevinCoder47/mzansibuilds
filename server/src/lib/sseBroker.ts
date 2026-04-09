import { Response } from 'express';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SSEEventType = 'comment' | 'collab' | 'ping';

interface SSEClient {
  projectId: string;
  res: Response;
}

// ─── In-memory subscriber registry ───────────────────────────────────────────

const clients: Set<SSEClient> = new Set();

// ─── Subscribe a response stream to a project channel ────────────────────────

export function subscribe(projectId: string, res: Response): SSEClient {
  const client: SSEClient = { projectId, res };
  clients.add(client);
  return client;
}

// ─── Unsubscribe (call on close / error) ─────────────────────────────────────

export function unsubscribe(client: SSEClient): void {
  clients.delete(client);
}

// ─── Broadcast an event to every subscriber of a project ─────────────────────

export function broadcast(projectId: string, event: SSEEventType, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (client.projectId === projectId) {
      try {
        client.res.write(payload);
      } catch {
        // client disconnected mid-write — remove silently
        clients.delete(client);
      }
    }
  }
}

// ─── Heartbeat — keeps proxies / load-balancers from closing idle streams ────

setInterval(() => {
  const ping = `event: ping\ndata: {}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(ping);
    } catch {
      clients.delete(client);
    }
  }
}, 25_000);
