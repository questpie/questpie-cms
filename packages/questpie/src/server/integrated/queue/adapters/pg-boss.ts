import { PgBoss, type ConstructorOptions } from "pg-boss";
import type { QueueAdapter } from "../adapter.js";
import type { PublishOptions } from "../types.js";

export type PgBossAdapterOptions = ConstructorOptions;

export class PgBossAdapter implements QueueAdapter {
  private boss: PgBoss;
  private started = false;
  private createdQueues = new Set<string>();

  constructor(options: PgBossAdapterOptions) {
    this.boss = new PgBoss(options);
  }

  async start(): Promise<void> {
    if (!this.started) {
      await this.boss.start();
      this.started = true;
    }
  }

  async stop(): Promise<void> {
    if (this.started) {
      await this.boss.stop();
      this.started = false;
    }
  }

  private async ensureQueue(jobName: string): Promise<void> {
    if (!this.createdQueues.has(jobName)) {
      await this.boss.createQueue(jobName);
      this.createdQueues.add(jobName);
    }
  }

  async publish(
    jobName: string,
    payload: any,
    options?: PublishOptions,
  ): Promise<string | null> {
    await this.start();
    await this.ensureQueue(jobName);
    // pg-boss specific options mapping could happen here if needed
    // but PublishOptions closely mirrors pg-boss options
    return this.boss.send(jobName, payload, options as any);
  }

  async schedule(
    jobName: string,
    cron: string,
    payload: any,
    options?: Omit<PublishOptions, "startAfter">,
  ): Promise<void> {
    await this.start();
    await this.ensureQueue(jobName);
    await this.boss.schedule(jobName, cron, payload, options as any);
  }

  async unschedule(jobName: string): Promise<void> {
    await this.start();
    await this.boss.unschedule(jobName);
  }

  async work(
    jobName: string,
    handler: (job: { id: string; data: any }) => Promise<void>,
    options?: { teamSize?: number; batchSize?: number },
  ): Promise<void> {
    await this.start();
    await this.ensureQueue(jobName);
    await this.boss.work(jobName, options as any, async (job: any) => {
      await handler({ id: job.id, data: job.data });
    });
  }

  on(event: "error", handler: (error: Error) => void): void {
    this.boss.on(event, handler);
  }
}

/**
 * Factory function for creating a PgBoss adapter
 */
export function pgBossAdapter(options: PgBossAdapterOptions): PgBossAdapter {
  return new PgBossAdapter(options);
}
