# Storage & Assets

QUESTPIE CMS uses **Flydrive** for multi-driver file storage (S3, R2, Local) and maintains a central **Asset Library** in the database.

## Architecture

1.  **Storage Service:** Handles raw file operations (put, get, delete) across different disks.
2.  **Asset Library:** A built-in collection `questpie_assets` that tracks metadata (key, url, size, mime-type) for every uploaded file.
3.  **Fields:** Special fields (`image`, `file`) in your content collections store references (JSON) to these assets.

## Uploading Files

The CMS exposes a standard upload endpoint: `POST /api/storage/upload`.

*   **Body:** `FormData` with a `file` field.
*   **Query:** `?disk=s3` (optional, defaults to configured default).
*   **Response:** The created Asset record.

```json
{
  "id": "...",
  "key": "uuid-image.png",
  "url": "https://...",
  "filename": "image.png",
  "mimeType": "image/png",
  "size": 1024
}
```

## Configuration

```typescript
import { LocalFileSystemStorage } from "flydrive/drivers/local";

const cms = new CMS({
  storage: {
    default: 'local',
    disks: {
      local: {
        driver: 'local',
        config: { root: './uploads' }
      }
    },
    drivers: {
      local: LocalFileSystemStorage
    }
  }
});
```

## Using in Collections

Use the `fields.image` or `fields.file` helpers. They store the JSON object returned by the upload endpoint.

```typescript
.fields({
  avatar: fields.image("avatar"),
  documents: fields.file("doc"),
})
```
