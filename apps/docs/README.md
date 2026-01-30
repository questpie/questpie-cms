# docs

This is a Tanstack Start application generated with
[Create Fumadocs](https://github.com/fuma-nama/fumadocs).

## Development

Run development server:

```bash
bun run dev
```

## Production Build

Build for production:

```bash
bun run build
```

Start production server:

```bash
bun run start
```

## Docker

### Build Docker Image

```bash
docker build -t questpie-docs .
```

### Run Docker Container

```bash
docker run -p 3000:3000 \
  -e VITE_UMAMI_URL=https://analytics.yourdomain.com/script.js \
  -e VITE_UMAMI_WEBSITE_ID=your_website_id \
  questpie-docs
```

Or with docker-compose:

```yaml
services:
  docs:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_UMAMI_URL=${VITE_UMAMI_URL}
      - VITE_UMAMI_WEBSITE_ID=${VITE_UMAMI_WEBSITE_ID}
    restart: unless-stopped
```

The application will be available at `http://localhost:3000`.

### Health Check

The Docker container includes a health check that pings the server every 30 seconds.

## Analytics

This app uses [Umami](https://umami.is) for privacy-focused analytics tracking.

### Setup

#### Option 1: Self-hosted Umami

1. Deploy your own Umami instance (see [Umami docs](https://umami.is/docs/install))
2. Add a website in Umami dashboard and get your website ID
3. Create `.env.local` file:

```bash
VITE_UMAMI_URL=https://analytics.yourdomain.com/script.js
VITE_UMAMI_WEBSITE_ID=your_website_id_here
```

#### Option 2: Umami Cloud

1. Sign up at [cloud.umami.is](https://cloud.umami.is)
2. Add a website and get your tracking code
3. Extract the `src` and `data-website-id` from the tracking code
4. Create `.env.local` file with those values

The tracking will automatically be enabled when both environment variables are set. If not set, the app will run without analytics.

### What gets tracked

- Page views (automatically)
- Referrers
- Device and browser information
- User location (country/region)
- Session duration

### Privacy

Umami is privacy-focused and GDPR compliant:

- No cookies
- Anonymous data collection
- No personal information tracked
- Self-hostable for complete data ownership

Implementation in: `src/routes/__root.tsx`
