# 🪒 Barbershop Example - QUESTPIE CMS + Hono

A complete, production-ready example of a barbershop booking system built with QUESTPIE CMS and Hono adapter.

## Features

✅ **Collections & Relations**
- Barbers, Services, Appointments, Reviews
- One-to-many and many-to-one relations
- Automatic relation loading with type safety

✅ **Authentication**
- Better Auth integration
- Email/password authentication
- Session management

✅ **Custom Business Logic**
- Check barber availability
- Book appointments with conflict detection
- Cancel appointments
- Customer appointment history

✅ **Background Jobs**
- Email notifications (confirmation, cancellation, reminders)
- Queue-based processing with pg-boss

✅ **Type-Safe Client SDK**
- CMS client for CRUD operations
- Hono RPC client for custom routes
- End-to-end type inference

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up Database

Create a PostgreSQL database:

```bash
createdb barbershop
```

Set environment variables (create `.env` file):

```env
DATABASE_URL=postgres://localhost/barbershop
APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key-change-in-production

# Optional: SMTP for emails
SMTP_HOST=localhost
SMTP_PORT=1025
```

### 3. Run Migrations

```bash
bun run db:migrate
```

This will:
- Create all tables (barbers, services, appointments, reviews)
- Create Better Auth tables (users, sessions, accounts)
- Create queue tables (pg-boss)
- Seed initial data (barbers and services)

### 4. Start the Server

```bash
bun run dev
```

The server will start at http://localhost:3000

### 5. Test the Client

In a separate terminal:

```bash
bun run client
```

This will demonstrate:
- Fetching barbers and services
- Checking availability
- Booking appointments (with auth)
- Managing appointments

### 6. (Optional) Start the Worker

For processing background jobs (emails):

```bash
bun run worker
```

## API Endpoints

### CMS CRUD Endpoints (Auto-generated)

**Collections:**
- `GET /api/cms/barbers` - List barbers
- `GET /api/cms/barbers/:id` - Get barber
- `POST /api/cms/barbers` - Create barber
- `PATCH /api/cms/barbers/:id` - Update barber
- `DELETE /api/cms/barbers/:id` - Delete barber

Similarly for: `services`, `appointments`, `reviews`

**Authentication:**
- `POST /api/auth/sign-up/email` - Register
- `POST /api/auth/sign-in/email` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get session

**Storage:**
- `POST /api/storage/upload` - Upload file (avatars, etc.)

### Custom Business Logic Endpoints

**Availability:**
- `GET /api/barbers/:barberId/availability?date=YYYY-MM-DD&serviceId=uuid`

**Appointments:**
- `POST /api/appointments/book` - Book appointment
- `POST /api/appointments/:id/cancel` - Cancel appointment
- `GET /api/my/appointments` - Get customer's appointments

**Health:**
- `GET /health` - Health check

## Project Structure

```
hono-barbershop/
├── src/
│   ├── cms.ts          # CMS configuration, collections, jobs
│   ├── server.ts       # Hono server with custom routes
│   └── client.ts       # Client usage examples
├── migrate.ts          # Database migration script
├── worker.ts           # Background job worker
├── package.json
└── README.md
```

## Data Model

### Barbers
- Name, email, phone, bio, avatar
- Active status
- Working hours (JSON)

### Services
- Name, description
- Duration (minutes), price (cents)
- Active status

### Appointments
- Customer → User (Better Auth)
- Barber → Barber
- Service → Service
- Scheduled time, status, notes
- Cancellation info

### Reviews
- Appointment → Appointment (one-to-one)
- Customer → User
- Barber → Barber
- Rating (1-5), comment

## Usage Examples

### Book an Appointment

```typescript
// 1. Check availability
const availability = await apiClient.api.barbers[':barberId'].availability.$get({
  param: { barberId: 'barber-id' },
  query: { date: '2024-12-30', serviceId: 'service-id' }
});

// 2. Book the appointment
const booking = await apiClient.api.appointments.book.$post({
  json: {
    barberId: 'barber-id',
    serviceId: 'service-id',
    scheduledAt: '2024-12-30T10:00:00Z',
    notes: 'First time customer'
  }
});
```

### Get My Appointments

```typescript
const myAppointments = await apiClient.api.my.appointments.$get();
```

### Cancel Appointment

```typescript
await apiClient.api.appointments[':id'].cancel.$post({
  param: { id: 'appointment-id' },
  json: { reason: 'Schedule conflict' }
});
```

### Admin: View All Appointments with Relations

```typescript
const appointments = await cmsClient.collections.appointments.find({
  with: {
    customer: true,
    barber: true,
    service: true
  },
  orderBy: { scheduledAt: 'desc' }
});
```

## Advanced Features

### Hooks

Collections support lifecycle hooks:

```typescript
collection('appointments')
  .hooks({
    afterCreate: async ({ data, context }) => {
      // Send confirmation email
      await context.cms.queue.publish('send-appointment-confirmation', {
        appointmentId: data.id
      });
    }
  })
```

### Queue Jobs

Background jobs for async processing:

```typescript
defineJob({
  name: 'send-appointment-confirmation',
  schema: z.object({ appointmentId: z.string() }),
  handler: async (payload) => {
    // Send email via context.cms.email
  }
})
```

### Relations

Type-safe relation loading:

```typescript
const appointment = await cms.api.collections.appointments.findOne({
  where: { id: 'uuid' },
  with: {
    barber: true,      // Load barber details
    service: true,     // Load service details
    customer: true     // Load customer (from Better Auth users)
  }
});

// TypeScript knows about the relations!
console.log(appointment.barber.name);
console.log(appointment.service.price);
```

## Production Considerations

1. **Environment Variables**: Use proper secrets in production
2. **Email**: Configure real SMTP server (SendGrid, Postmark, etc.)
3. **Storage**: Use S3/R2 for avatars and uploads
4. **Queue Worker**: Run as separate process/service
5. **Database**: Use connection pooling
6. **Auth**: Enable email verification, add OAuth providers
7. **Validation**: Add more robust input validation
8. **Error Handling**: Add proper error logging and monitoring

## Next Steps

- Add payment processing (Stripe)
- Add SMS notifications (Twilio)
- Add calendar integration (Google Calendar)
- Add admin dashboard UI
- Add real-time availability updates (SSE)
- Add waitlist functionality
- Add loyalty/rewards system

## Learn More

- [QUESTPIE CMS Documentation](../../packages/core/docs/)
- [Hono Documentation](https://hono.dev/)
- [Better Auth Documentation](https://better-auth.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
