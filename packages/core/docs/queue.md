# Queue System

For reliable background processing, QUESTPIE CMS integrates **pg-boss**. This allows you to offload tasks like sending emails or processing images to the database, ensuring they are not lost if the server restarts.

## How it Works

1.  **Define:** You define jobs with Zod schemas and handlers.
2.  **Register:** Jobs are passed as an array to the CMS config.
3.  **Publish:** Jobs are queued and persisted to Postgres.
4.  **Process:** Workers pick up jobs and execute their handlers.

## Configuration

Define jobs and pass them to the CMS config, along with a queue adapter (e.g., `pgBossAdapter`):

```typescript
import { defineJob, QCMS, pgBossAdapter } from '@questpie/core/server'
import { z } from 'zod'

const sendWelcomeEmailJob = defineJob({
  name: 'send-welcome-email',
  schema: z.object({
    userId: z.string(),
    email: z.string().email(),
  }),
  handler: async (payload, context) => {
    await context.email.send({
      to: payload.email,
      subject: 'Welcome!',
      html: '<h1>Welcome to our app!</h1>',
    })
  },
  options: {
    retryLimit: 3,
    retryDelay: 60,
  }
})

const cms = new QCMS({
  db: { connection: { /* ... */ } },
  queue: {
    jobs: [sendWelcomeEmailJob], // Array of job definitions
    adapter: pgBossAdapter({
      connectionString: process.env.DATABASE_URL,
      schema: 'pgboss',
    })
  }
})
```

## Usage

You can access jobs via `context.queue[jobName]`.

### Publishing Jobs (e.g., in a Hook)

```typescript
.hooks({
  afterCreate: async ({ data, context }) => {
    await context.queue['send-welcome-email'].publish({
      userId: data.id,
      email: data.email
    })
  }
})
```

### Processing Jobs

Start workers in a separate worker process:

```typescript
// worker.ts
const cms = new QCMS({
  // Same config as main app
  queue: { jobs: [sendWelcomeEmailJob] }
})

// Start listening to all jobs
await cms._listenToJobs()

// Or listen to specific jobs
await cms._listenToJobs(['send-welcome-email'])
```

Jobs are automatically validated and executed with full CMS context.
