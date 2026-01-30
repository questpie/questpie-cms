import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { job, questpie, jobsModule } from "../../src/server/index.js";
import { jobRunsCollection } from "../../src/server/modules/jobs/index.js";
import { buildMockApp } from "../utils/mocks/mock-app-builder";
import { runTestDbMigrations } from "../utils/test-db";

const createModule = (handlers: {
  onWelcome?: (userId: string) => void;
  onCron?: () => void;
}) => {
  const sendWelcomeEmail = job({
    name: "send-welcome-email",
    schema: z.object({ userId: z.string() }),
    handler: async ({ payload }) => {
      handlers.onWelcome?.(payload.userId);
    },
    options: {
      retryLimit: 2,
      retryDelay: 10,
      priority: 3,
    },
  });

  const failingJob = job({
    name: "failing-job",
    schema: z.object({ reason: z.string() }),
    handler: async ({ payload }) => {
      throw new Error(`Failed: ${payload.reason}`);
    },
  });

  const cronCleanup = job({
    name: "cron-cleanup",
    schema: z.object({}),
    handler: async () => {
      handlers.onCron?.();
    },
    options: {
      cron: "0 9 * * *",
    },
  });

  return questpie({ name: "jobs-test" }).use(jobsModule).jobs({
    sendWelcomeEmail,
    failingJob,
    cronCleanup,
  });
};

describe("jobs control plane", () => {
  let setup: Awaited<
    ReturnType<typeof buildMockApp<ReturnType<typeof createModule>>>
  >;
  let handledUsers: string[] = [];
  let cronRuns = 0;
  const jobRuns = jobRunsCollection.build();

  beforeEach(async () => {
    handledUsers = [];
    cronRuns = 0;

    const module = createModule({
      onWelcome: (userId) => handledUsers.push(userId),
      onCron: () => {
        cronRuns += 1;
      },
    });

    setup = await buildMockApp(module);
    await runTestDbMigrations(setup.cms);
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  it("queue publish stores job_run and publishes", async () => {
    const queueJobId = await setup.cms.queue.sendWelcomeEmail.publish({
      userId: "user-1",
    });

    const jobRunsTable = jobRuns.table;
    const [row] = await setup.cms.db
      .select()
      .from(jobRunsTable)
      .where(eq(jobRunsTable.queueJobId, queueJobId as string));

    expect(row?.jobName).toBe("send-welcome-email");
    expect(row?.status).toBe("queued");
    expect(row?.payload).toEqual({ userId: "user-1" });
    expect(row?.queuedAt).toBeInstanceOf(Date);
    expect(queueJobId).toBeTruthy();
    expect(row?.queueJobId).toBe(queueJobId as string);

    const [job] = setup.cms.mocks.queue.getJobsByName("send-welcome-email");
    expect(job?.id).toBe(queueJobId as string);
    expect(job?.payload).toEqual({ userId: "user-1" });
  });

  it("validates payload before enqueue", async () => {
    await expect(
      setup.cms.queue.sendWelcomeEmail.publish({} as any),
    ).rejects.toThrow();

    expect(setup.cms.mocks.queue.getJobs()).toHaveLength(0);
  });

  it("merges job defaults with publish options", async () => {
    await setup.cms.queue.sendWelcomeEmail.publish(
      { userId: "user-opts" },
      { priority: 9, startAfter: 60 },
    );

    const [job] = setup.cms.mocks.queue.getJobsByName("send-welcome-email");
    expect(job?.options?.priority).toBe(9);
    expect(job?.options?.retryLimit).toBe(2);
    expect(job?.options?.retryDelay).toBe(10);
    expect(job?.options?.startAfter).toBe(60);
  });

  it("queue publish works without jobs module", async () => {
    const sendEmail = job({
      name: "send-email",
      schema: z.object({ userId: z.string() }),
      handler: async () => {},
    });

    const module = questpie({ name: "jobs-missing-module" }).jobs({
      sendEmail,
    });
    const local = await buildMockApp(module);

    try {
      const queueJobId = await local.cms.queue.sendEmail.publish({
        userId: "user-x",
      });
      expect(queueJobId).toBeTruthy();
      const [job] = local.cms.mocks.queue.getJobsByName("send-email");
      expect(job?.payload).toEqual({ userId: "user-x" });
    } finally {
      await local.cleanup();
    }
  });

  it("worker updates job_run to success", async () => {
    await setup.cms.listenToJobs();

    const queueId = await setup.cms.queue.sendWelcomeEmail.publish({
      userId: "user-3",
    });
    expect(queueId).toBeTruthy();

    await setup.cms.mocks.queue.processAllJobs();

    const jobRunsTable = jobRuns.table;
    const [row] = await setup.cms.db
      .select()
      .from(jobRunsTable)
      .where(eq(jobRunsTable.queueJobId, queueId as string));

    expect(row?.status).toBe("success");
    expect(row?.startedAt).toBeInstanceOf(Date);
    expect(row?.finishedAt).toBeInstanceOf(Date);
    expect(row?.workerId).toBeTruthy();
    expect(handledUsers).toEqual(["user-3"]);
  });

  it("worker marks failed runs", async () => {
    await setup.cms.listenToJobs();

    const queueId = await setup.cms.queue.failingJob.publish({
      reason: "boom",
    });
    expect(queueId).toBeTruthy();

    await setup.cms.mocks.queue.processAllJobs();

    const jobRunsTable = jobRuns.table;
    const [row] = await setup.cms.db
      .select()
      .from(jobRunsTable)
      .where(eq(jobRunsTable.queueJobId, queueId as string));

    expect(row?.status).toBe("failed");
    expect(row?.error).toContain("boom");
  });

  it("continues when job_run updates fail", async () => {
    await setup.cms.listenToJobs();

    const originalUpdate = setup.cms.db.update.bind(setup.cms.db);
    let didThrow = false;

    (setup.cms.db as any).update = (...args: [any]) => {
      if (!didThrow) {
        didThrow = true;
        (setup.cms.db as any).update = originalUpdate;
        throw new Error("Update failed");
      }
      return originalUpdate(...args);
    };

    try {
      await setup.cms.queue.sendWelcomeEmail.publish({
        userId: "user-update-fail",
      });
      await setup.cms.mocks.queue.processAllJobs();

      expect(didThrow).toBe(true);
      expect(handledUsers).toEqual(["user-update-fail"]);
    } finally {
      (setup.cms.db as any).update = originalUpdate;
    }
  });

  it("recovers stalled runs on startup", async () => {
    const jobRunsTable = jobRuns.table;
    const staleStart = new Date(Date.now() - 11 * 60 * 1000);
    const [staleRun] = await (setup.cms.db as any)
      .insert(jobRunsTable)
      .values({
        jobName: "send-welcome-email",
        status: "running",
        queuedAt: staleStart,
        startedAt: staleStart,
        workerId: "worker-old",
      })
      .returning({ id: jobRunsTable.id });

    await setup.cms.listenToJobs();

    const [row] = await setup.cms.db
      .select()
      .from(jobRunsTable)
      .where(eq(jobRunsTable.id, staleRun.id));

    expect(row?.status).toBe("failed");
    expect(row?.finishedAt).toBeInstanceOf(Date);
    expect(row?.error).toContain("stalled job recovery");
  });

  it("marks in-flight runs on graceful shutdown", async () => {
    const originalRandomUUID = crypto.randomUUID;
    const originalExit = process.exit;
    const originalSigtermListeners = process.listeners("SIGTERM");
    const originalSigintListeners = process.listeners("SIGINT");

    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");

    let exitCode: number | undefined;

    (crypto as any).randomUUID = () => "worker-test";
    (process as any).exit = (code?: number) => {
      exitCode = code ?? 0;
    };

    try {
      const jobRunsTable = jobRuns.table;
      const [run] = await (setup.cms.db as any)
        .insert(jobRunsTable)
        .values({
          jobName: "send-welcome-email",
          status: "running",
          queuedAt: new Date(),
          startedAt: new Date(),
          workerId: "worker-test",
        })
        .returning({ id: jobRunsTable.id });

      await setup.cms.listenToJobs();

      process.emit("SIGTERM", "SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 0));

      const [row] = await setup.cms.db
        .select()
        .from(jobRunsTable)
        .where(eq(jobRunsTable.id, run.id));

      expect(exitCode).toBe(0);
      expect(row?.status).toBe("failed");
      expect(row?.finishedAt).toBeInstanceOf(Date);
      expect(row?.error).toContain("Worker shutdown");
    } finally {
      (crypto as any).randomUUID = originalRandomUUID;
      (process as any).exit = originalExit;

      process.removeAllListeners("SIGTERM");
      for (const listener of originalSigtermListeners) {
        process.on("SIGTERM", listener);
      }

      process.removeAllListeners("SIGINT");
      for (const listener of originalSigintListeners) {
        process.on("SIGINT", listener);
      }
    }
  });

  it("throws when cron job requires non-empty payload", async () => {
    const requiredPayload = job({
      name: "cron-required",
      schema: z.object({ value: z.string() }),
      handler: async () => {},
      options: {
        cron: "0 0 * * *",
      },
    });

    const module = questpie({ name: "jobs-cron-payload" }).jobs({
      requiredPayload,
    });
    const local = await buildMockApp(module);

    try {
      await expect(local.cms.listenToJobs()).rejects.toThrow(
        "schema does not accept an empty payload",
      );
    } finally {
      await local.cleanup();
    }
  });

  it("registers cron schedules on startup", async () => {
    await setup.cms.listenToJobs();

    const scheduled = setup.cms.mocks.queue.getScheduledJob("cron-cleanup");
    expect(scheduled?.cron).toBe("0 9 * * *");
    expect(scheduled?.payload).toEqual({});
    expect(cronRuns).toBe(0);
  });
});
