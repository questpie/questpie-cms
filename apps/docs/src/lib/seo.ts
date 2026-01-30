/**
 * SEO configuration and helpers for QUESTPIE CMS documentation
 */

export const siteConfig = {
  name: "QUESTPIE CMS",
  title: "QUESTPIE CMS - Type-Safe Headless CMS",
  description:
    "A powerful, type-safe headless CMS built with Drizzle ORM, Better Auth, pg-boss, and Flydrive. Just PostgreSQL, native libraries, not abstractions.",
  url: "https://questpie.com",
  ogImage: "/og-image.svg",
  twitterHandle: "@questpie",
  githubUrl: "https://github.com/AnomalyInnovations/questpie-cms",
  keywords: [
    "headless cms",
    "typescript cms",
    "drizzle orm",
    "postgresql cms",
    "better auth",
    "pg-boss",
    "flydrive",
    "hono",
    "elysia",
    "next.js",
    "tanstack",
    "type-safe",
    "api cms",
    "content management",
    "developer cms",
  ],
} as const;

export type SeoProps = {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

/**
 * Generate meta tags for a page
 */
export function generateMeta(props: SeoProps = {}) {
  const {
    title = siteConfig.title,
    description = siteConfig.description,
    url = siteConfig.url,
    image = siteConfig.ogImage,
    type = "website",
    noIndex = false,
  } = props;

  const fullTitle =
    title === siteConfig.title ? title : `${title} | ${siteConfig.name}`;
  const fullImageUrl = image.startsWith("http")
    ? image
    : `${siteConfig.url}${image}`;

  const meta: Array<Record<string, string>> = [
    // Basic
    { title: fullTitle },
    { name: "description", content: description },
    { name: "keywords", content: siteConfig.keywords.join(", ") },

    // Robots
    ...(noIndex
      ? [{ name: "robots", content: "noindex, nofollow" }]
      : [{ name: "robots", content: "index, follow" }]),

    // Open Graph
    { property: "og:type", content: type },
    { property: "og:site_name", content: siteConfig.name },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: fullImageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: `${siteConfig.name} - ${description}`,
    },
    { property: "og:locale", content: "en_US" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: siteConfig.twitterHandle },
    { name: "twitter:creator", content: siteConfig.twitterHandle },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: fullImageUrl },
    {
      name: "twitter:image:alt",
      content: `${siteConfig.name} - ${description}`,
    },

    // Additional SEO
    { name: "author", content: siteConfig.name },
    { name: "generator", content: "TanStack Start" },
    { name: "theme-color", content: "#02012B" },
    { name: "color-scheme", content: "dark light" },
    { name: "format-detection", content: "telephone=no" },

    // Apple
    { name: "apple-mobile-web-app-capable", content: "yes" },
    {
      name: "apple-mobile-web-app-status-bar-style",
      content: "black-translucent",
    },
    { name: "apple-mobile-web-app-title", content: siteConfig.name },
  ];

  return meta;
}

/**
 * Generate links for a page (favicon, canonical, etc.)
 */
export function generateLinks(props: { url?: string; cssUrl?: string } = {}) {
  const { url = siteConfig.url, cssUrl } = props;

  const links: Array<Record<string, string>> = [
    // Canonical
    { rel: "canonical", href: url },

    // Favicons
    {
      rel: "icon",
      type: "image/svg+xml",
      href: "/symbol/Q-symbol-dark-pink.svg",
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      href: "/symbol/Q-symbol-white-pink.svg",
      media: "(prefers-color-scheme: dark)",
    },
    { rel: "apple-touch-icon", href: "/symbol/Q-symbol-dark-pink.svg" },

    // Preconnect for performance
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },

    // Manifest (if we add one later)
    // { rel: 'manifest', href: '/manifest.json' },
  ];

  if (cssUrl) {
    links.push({ rel: "stylesheet", href: cssUrl });
  }

  return links;
}

/**
 * JSON-LD structured data for the website
 */
export function generateJsonLd(props: SeoProps = {}) {
  const { title = siteConfig.title, description = siteConfig.description } =
    props;

  return {
    "@context": "https://schema.org",
    "@graph": [
      // Organization
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          "@type": "ImageObject",
          url: `${siteConfig.url}/logo/Questpie-dark-pink.svg`,
        },
        sameAs: [siteConfig.githubUrl],
      },
      // WebSite
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: {
          "@id": `${siteConfig.url}/#organization`,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteConfig.url}/docs?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      // SoftwareApplication
      {
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        description: description,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        author: {
          "@id": `${siteConfig.url}/#organization`,
        },
        programmingLanguage: ["TypeScript", "JavaScript"],
        runtimePlatform: ["Node.js", "Bun"],
      },
      // WebPage (for current page)
      {
        "@type": "WebPage",
        "@id": `${siteConfig.url}/#webpage`,
        url: siteConfig.url,
        name: title,
        description: description,
        isPartOf: {
          "@id": `${siteConfig.url}/#website`,
        },
        about: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
    ],
  };
}

/**
 * Generate JSON-LD for documentation pages
 */
export function generateDocsJsonLd(props: {
  title: string;
  description: string;
  url: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: props.title,
    description: props.description,
    url: props.url,
    dateModified: props.dateModified || new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo/Questpie-dark-pink.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": props.url,
    },
  };
}
