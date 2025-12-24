# QUESTPIE CMS Documentation

Official documentation for QUESTPIE CMS, built with [Fumadocs](https://fumadocs.dev) and [TanStack Start](https://tanstack.com/start).

## Development

```bash
# Install dependencies (from repo root)
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run start
```

## Documentation Structure

```
content/docs/
├── index.mdx                    # Homepage
├── meta.json                    # Navigation structure
│
├── getting-started/             # Getting Started
│   ├── meta.json
│   ├── installation.mdx
│   ├── quick-start.mdx
│   └── project-structure.mdx
│
├── core-concepts/               # Core Concepts
│   ├── meta.json
│   ├── collections.mdx
│   ├── builder-pattern.mdx
│   ├── type-inference.mdx
│   ├── extensibility.mdx
│   ├── merge-pattern.mdx
│   └── lazy-build.mdx
│
├── guides/                      # Guides
│   ├── meta.json
│   ├── collections.mdx
│   ├── fields.mdx
│   ├── relations.mdx
│   ├── hooks.mdx
│   ├── access-control.mdx
│   ├── localization.mdx
│   └── modules.mdx
│
├── features/                    # Features
├── api/                         # API Reference
└── examples/                    # Examples
```

## TODO: Documentation Progress

### Completed ✅
- [x] Homepage
- [x] Installation guide
- [x] Quick Start guide
- [x] Builder Pattern explanation
- [x] Merge Pattern deep dive
- [x] Modules organization guide

### In Progress 🚧
- [ ] Core Concepts overview
- [ ] Collections guide
- [ ] Relations guide
- [ ] Hooks guide

### Planned 📝
- [ ] Fields reference
- [ ] Access Control guide
- [ ] Localization guide
- [ ] Type Inference deep dive
- [ ] CRUD Operations
- [ ] Virtual Fields
- [ ] Testing guide
- [ ] API Reference
- [ ] Real-world examples
