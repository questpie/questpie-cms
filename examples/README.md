# QUESTPIE CMS Examples

Complete, production-ready examples demonstrating different use cases and integrations with QUESTPIE CMS.

## Available Examples

### 🪒 [Hono Barbershop](./hono-barbershop/)

**Full-featured barbershop booking system**

Demonstrates:
- ✅ Collections with relations (Barbers, Services, Appointments, Reviews)
- ✅ Better Auth integration (email/password authentication)
- ✅ Custom business logic routes (availability, booking, cancellation)
- ✅ Queue jobs for background processing (email notifications)
- ✅ Type-safe client SDK (CMS + Hono RPC)
- ✅ Hooks for lifecycle events
- ✅ Complex queries with relations

**Tech Stack:**
- Hono framework
- PostgreSQL database
- pg-boss queue
- Better Auth
- Drizzle ORM

**Perfect for:**
- Learning QUESTPIE fundamentals
- Building booking/scheduling systems
- Understanding CMS + custom API patterns
- Production reference implementation

[View Example →](./hono-barbershop/)

---

## Coming Soon

### 📝 Blog Platform (Hono + React)
CMS-powered blog with rich content editing, categories, tags, and comments.

### 🛒 E-commerce Store (Hono + Next.js)
Product catalog, shopping cart, checkout flow, and order management.

### 📚 Documentation Site (Elysia)
Versioned documentation with search, navigation, and multi-language support.

### 🎓 Learning Management System
Courses, lessons, quizzes, and student progress tracking.

---

## Running Examples

Each example is a self-contained project with its own:
- `package.json` - Dependencies and scripts
- `README.md` - Detailed setup instructions
- `src/` - Source code
- `.env.example` - Environment variables template

### Quick Start

```bash
# Navigate to example
cd examples/hono-barbershop

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
bun run db:migrate

# Start server
bun run dev
```

---

## Learning Path

**Beginners:** Start with **Hono Barbershop** to understand:
1. Collection definitions
2. Relations between collections
3. Better Auth integration
4. Custom business logic
5. Client SDK usage

**Intermediate:** Explore advanced features:
- Queue jobs and workers
- Hooks and lifecycle events
- Access control
- File uploads and storage

**Advanced:** Build your own:
- Custom adapters (Express, Fastify, etc.)
- Custom modules and plugins
- Real-time features with SSE
- Search integration

---

## Contributing Examples

Want to contribute an example? We'd love to see:
- Real-world use cases
- Different framework integrations
- Novel patterns and approaches
- Production-ready implementations

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## Need Help?

- 📖 [Documentation](../packages/core/docs/)
- 💬 [Discussions](https://github.com/questpie/questpie-cms/discussions)
- 🐛 [Issues](https://github.com/questpie/questpie-cms/issues)
- 📧 [Email Support](mailto:support@questpie.com)
