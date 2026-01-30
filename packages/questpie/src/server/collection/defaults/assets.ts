import { sql } from "drizzle-orm";
import { integer, text, varchar } from "drizzle-orm/pg-core";
import { collection } from "#questpie/server/collection/builder/collection-builder.js";

/**
 * Default assets collection with file upload support.
 *
 * Uses `.upload()` which automatically:
 * - Adds upload fields (key, filename, mimeType, size, visibility)
 * - Adds $outputType<{ url: string }>() for typed URL access
 * - Adds afterRead hook for URL generation based on visibility
 * - Enables upload() and uploadMany() CRUD methods
 * - Registers HTTP routes: POST /assets/upload, GET /assets/files/:key
 *
 * Additional fields for image metadata are included.
 */
export const assetsCollection = collection("assets")
  .options({
    timestamps: true,
  })
  .fields({
    // Image dimensions (optional)
    width: integer("width"),
    height: integer("height"),

    // Descriptive metadata
    alt: varchar("alt", { length: 500 }),
    caption: text("caption"),
  })
  // Enable file upload with public visibility by default
  .upload({
    visibility: "public",
  })
  .hooks({
    afterDelete: async ({ data, app }) => {
      const cms = app as any;
      if (!cms?.storage || !data?.key) return;

      try {
        await cms.storage.use().delete(data.key);
      } catch (error) {
        cms.logger?.warn?.("Failed to delete asset file from storage", {
          key: data.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  })
  .title(({ f }) => f.filename);
