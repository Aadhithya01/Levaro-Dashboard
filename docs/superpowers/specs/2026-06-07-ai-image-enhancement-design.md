# AI Image Enhancement Design

**Date:** 2026-06-07  
**Status:** Approved

## Summary

When an admin uploads a product image, it is automatically sent to a Supabase Edge Function that calls HuggingFace's `timbrooks/instruct-pix2pix` model with a configurable prompt. The processed image is stored in Supabase Storage in place of the raw file. A settings page lets the admin update the enhancement prompt at any time.

---

## 1. Database

### New table: `app_settings`

```sql
create table public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Authenticated read app_settings"
  on public.app_settings for select
  to authenticated using (true);

create policy "Authenticated update app_settings"
  on public.app_settings for update
  to authenticated using (true);

-- Default prompt seed
insert into public.app_settings (key, value) values (
  'image_enhancement_prompt',
  'professional jewellery product photo, clean white background, studio lighting, high quality, sharp focus, keep jewellery design unchanged'
);
```

- No changes to any existing table.
- The prompt is read by the edge function on every image upload.

---

## 2. Supabase Edge Function: `process-image`

**Path:** `supabase/functions/process-image/index.ts`

### Request

`POST /functions/v1/process-image`  
`Content-Type: multipart/form-data`  
Body field: `file` (the raw image File)

### Processing steps

1. Parse the `file` field from the multipart body
2. Query `app_settings` for `key = 'image_enhancement_prompt'` using the Supabase service role client
3. Convert the image bytes to base64
4. POST to `https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix` with:
   - `Authorization: Bearer {HUGGINGFACE_TOKEN}`
   - Body: `{ inputs: base64Image, parameters: { prompt, num_inference_steps: 20, image_guidance_scale: 1.5 } }`
5. If HF returns a processed image blob → upload it to the `product-images` bucket with a UUID filename
6. If HF fails (timeout, rate limit, error) → fall back to uploading the original image unchanged
7. Return `{ url: publicUrl }` as JSON

### Secrets (set in Supabase dashboard → Edge Functions → Secrets)

| Secret | Value |
|--------|-------|
| `HUGGINGFACE_TOKEN` | HF API token |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase into every edge function.

### CORS

Allow requests from the Netlify production URL and `localhost:5173`.

---

## 3. Settings Page

**Route:** `/settings` (admin only, wrapped in `ProtectedRoute`)  
**File:** `src/pages/Settings.jsx`

- On mount: fetches `app_settings` row where `key = 'image_enhancement_prompt'`
- Shows a `<textarea>` with the current prompt value
- **Save** button: `upsert` the row in `app_settings`, show a brief success toast
- Short description below the textarea: "This prompt is applied automatically to every product image you upload."
- "Settings" link added to `Navbar`
- Route added to `App.jsx` under `ProtectedRoute`

---

## 4. Upload Flow Changes

### Modified files

- `src/components/AddProductModal.jsx`
- `src/components/EditProductModal.jsx`

### Change

Replace the direct `supabase.storage.from('product-images').upload(path, file)` call with a helper `enhanceAndUpload(file)`:

```js
async function enhanceAndUpload(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    body: formData,
  })
  if (!res.ok) throw new Error(await res.text())
  const { url } = await res.json()
  return url
}
```

- Loading label changes to `"Enhancing & saving..."` during submit
- `MediaUploadSection` is unchanged — it still manages local file previews only
- On any `enhanceAndUpload` failure the error is shown to the user and submit is aborted (no partial save)

---

## 5. Constraints

- HuggingFace free tier: ~10–30 second processing time per image; loading state communicates this
- The original raw file is never stored — only the AI-processed version
- If HF is unavailable, the original image is stored as fallback (no silent failure)
- The HF token is never exposed to the browser
- No new npm packages required (Deno edge function uses built-in fetch)
