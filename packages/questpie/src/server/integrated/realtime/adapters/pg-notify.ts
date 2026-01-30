import type { Client, ClientConfig } from "pg";
import type { RealtimeAdapter } from "../adapter.js";
import type { RealtimeChangeEvent, RealtimeNotice } from "../types.js";

export type PgNotifyAdapterOptions = {
  channel?: string;
  client?: Client;
  connection?: ClientConfig;
  connectionString?: string;
};

export class PgNotifyAdapter implements RealtimeAdapter {
  private client: Client | null = null;
  private clientConfig?: ClientConfig;
  private connectionString?: string;
  private channel: string;
  private listeners = new Set<(notice: RealtimeNotice) => void>();
  private started = false;

  constructor(options: PgNotifyAdapterOptions = {}) {
    this.channel = options.channel ?? "questpie_realtime";

    if (!/^[a-zA-Z0-9_]+$/.test(this.channel)) {
      throw new Error(`Invalid pg notify channel name: "${this.channel}"`);
    }

    if (options.client) {
      this.client = options.client;
      return;
    }

    if (options.connection) {
      this.clientConfig = options.connection;
      return;
    }

    if (options.connectionString) {
      this.connectionString = options.connectionString;
      return;
    }
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    const client = await this.ensureClient();
    await client.connect();
    await client.query(`LISTEN ${this.channel}`);
    client.on("notification", (msg) => {
      if (!msg.payload) return;
      let notice: RealtimeNotice | null = null;
      try {
        notice = JSON.parse(msg.payload) as RealtimeNotice;
      } catch {
        return;
      }
      for (const listener of this.listeners) {
        listener(notice);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    const client = this.client;
    if (!client) return;
    try {
      await client.query(`UNLISTEN ${this.channel}`);
    } finally {
      await client.end();
    }
  }

  subscribe(handler: (notice: RealtimeNotice) => void): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  async notify(event: RealtimeChangeEvent): Promise<void> {
    const payload = JSON.stringify({
      seq: event.seq,
      resourceType: event.resourceType,
      resource: event.resource,
      operation: event.operation,
    });
    const client = await this.ensureClient();
    await client.query("select pg_notify($1, $2)", [this.channel, payload]);
  }

  private async ensureClient(): Promise<Client> {
    if (this.client) return this.client;
    const { Client: PgClient } = await import("pg");

    if (this.clientConfig) {
      this.client = new PgClient(this.clientConfig);
      return this.client;
    }

    if (this.connectionString) {
      this.client = new PgClient({ connectionString: this.connectionString });
      return this.client;
    }

    throw new Error(
      "PgNotifyAdapter requires a pg Client or connection config",
    );
  }
}

export const pgNotifyAdapter = (options: PgNotifyAdapterOptions = {}) =>
  new PgNotifyAdapter(options);
