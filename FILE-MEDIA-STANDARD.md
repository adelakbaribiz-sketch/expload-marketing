# File & Media Standard — Phase 10

**Scope check**: the project has exactly one file/media feature — onboarding document upload (`OnboardingDocument` model, `extractDocument()` in `src/lib/onboarding/extractor.ts`). It was **non-functional**: the frontend (`onboarding-wizard-view.tsx`) called `POST /api/onboarding/upload`, which didn't exist; the extractor had zero callers; the DB model had zero references anywhere. This phase built the missing standardized implementation rather than auditing a system that didn't exist yet.

## What was built

| Concern | Implementation |
|---|---|
| Upload | `POST /api/onboarding/upload` — `src/app/api/onboarding/upload/route.ts` |
| Download | `GET /api/onboarding/documents/[id]/download` — requires tenant auth **and** a signed token |
| Storage | `src/lib/storage/index.ts` — `StorageAdapter` interface + `LocalStorageAdapter` (files under `storage/private/`, outside `public/`, never directly servable). Adapter-agnostic on purpose — a future S3-compatible adapter is a drop-in; not built now since nothing needs it yet |
| Compression | Deliberately skipped — these are ≤10MB text-source documents (pdf/docx/txt/md/html); gzip on top of already-compressed formats (pdf/docx are zip-based) buys nothing |
| Processing | Async via the existing job queue (`src/lib/queue/index.ts`, new `document_extract` job type) — upload returns immediately with `status: 'pending'`; extraction (which can be slow for a large PDF) runs in the background worker, never blocking the request thread |
| Metadata | Already modeled on `OnboardingDocument`: `filename`, `fileType`, `fileSize`, `status`, `textLength`, `uploadedAt`, `processedAt` |
| Versioning | Not built — re-uploading creates a new `OnboardingDocument` row (immutable-by-row is sufficient; there's no in-place-edit concept for a source document) |
| Access Control | Every route checks the document's `session.tenantId` against the caller's tenant before any read/write/delete |
| Security | Extension allowlist + declared-MIME cross-check + magic-byte check for pdf/docx (`src/lib/storage/validate.ts`), 10MB size cap, server-generated storage keys (never the user's filename — kills path traversal by construction), rate-limited via `withProtection` |

## Public vs. Private / Temporary vs. Permanent

- **All files are private** — there is no public-file use case in this app today (no public asset uploads, avatars, or CDN-served media). If one appears later, it needs its own bucket/prefix and its own `PUBLIC_API_ROUTES` decision in `proxy.ts` — don't default a new upload feature to public.
- **Permanent** until the owning `OnboardingSession`/`Tenant` is deleted (`onDelete: Cascade` already in the schema) or a caller explicitly `DELETE`s it. No temporary/expiring-file concept exists in this app yet; not invented speculatively.
- A **failed extraction deletes its stored file** (`src/lib/queue/index.ts`'s `document_extract` handler) — there's no retry mechanism anywhere in this queue (confirmed in `BACKEND-ARCHITECTURE.md` §11), so keeping an unprocessable file around forever is a pure storage leak, not a recoverable state.

## Signed URLs

`POST /api/onboarding/documents/[id]/signed-url` mints a 15-minute HMAC-signed token (`src/lib/storage/signed-url.ts`, same secret/algorithm as the session cookie). The download route requires **both** a valid tenant session **and** a matching, unexpired token — the same way S3 presigned URLs are commonly used even inside already-authenticated apps: it bounds how long a copied/leaked link keeps working, rather than replacing auth entirely.

## File Size Limits / Allowed Types

`src/lib/storage/validate.ts`: `MAX_FILE_SIZE_BYTES = 10MB`; `ALLOWED_EXTENSIONS = pdf, docx, txt, md, html, htm` (matches what `extractDocument()` can actually parse — no point accepting a type nothing downstream understands).

## Malware Scanning Strategy

No AV engine (ClamAV, VirusTotal API, etc.) is available in this environment — implementing a fake scan would be worse than documenting the gap honestly. Current line of defense: strict extension + MIME + magic-byte allowlist (blocks the "renamed executable" class of attack), a 10MB cap, and files are never executed or served with an inferable content-type (`Content-Type: application/octet-stream` + `Content-Disposition: attachment` on download, regardless of the original type). **Next step when this becomes a real requirement**: call a scan hook between `validateUpload()` passing and `getStorage().save()` in the upload route — that's the one seam to wire a real scanner into.

## Backup

Not built as new infrastructure this phase — `storage/private/` should be backed up alongside the database, and both are currently unaddressed by the same gap: `DATABASE-TARGET.md` DB-10 ("no backup automation exists") already tracks this as deferred. Folding file storage into that same future backup pass (not a separate one) avoids maintaining two backup strategies for data that's relational to each other (a `OnboardingDocument` row with no matching file, or vice versa, is a broken pair either way).

## Verified

`bun run typecheck` / `bun run lint` clean. Live-verified: upload → job queue picks it up → `extractDocument()` runs → `OnboardingDocument.status` reaches `completed` with `extractedText` populated → signed-url + download round-trip returns the original bytes; invalid-type and oversized uploads rejected with 400/413; cross-tenant access to another tenant's document returns 404.
