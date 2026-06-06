# AI Image Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically enhance every uploaded product image through HuggingFace's instruct-pix2pix model using a configurable prompt, with a settings page to edit that prompt.

**Architecture:** A Supabase Edge Function receives the raw image, calls HuggingFace, uploads the result to the existing `product-images` storage bucket, and returns the public URL. A shared `enhanceAndUpload` helper replaces direct storage uploads in both modals. A new `/settings` admin page lets the prompt be updated in the `app_settings` table.

**Tech Stack:** React 19, Supabase Edge Functions (Deno), HuggingFace Inference API (`timbrooks/instruct-pix2pix`), Tailwind CSS v3.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/functions/process-image/index.ts` | **Create** | Edge function: call HF, upload result, return URL |
| `src/lib/enhanceAndUpload.js` | **Create** | Shared helper: route files through edge function (images) or direct upload (videos) |
| `src/pages/Settings.jsx` | **Create** | Admin settings page — edit enhancement prompt |
| `src/App.jsx` | **Modify** | Add `/settings` route |
| `src/components/Navbar.jsx` | **Modify** | Add Settings nav link |
| `src/components/AddProductModal.jsx` | **Modify** | Use `enhanceAndUpload` instead of direct storage upload |
| `src/components/EditProductModal.jsx` | **Modify** | Use `enhanceAndUpload` instead of direct storage upload |

---

## Task 1: Create app_settings table

**Files:** Supabase SQL migration only

- [ ] **Step 1: Run migration**

Use `mcp__claude_ai_Supabase__execute_sql` on project `cergignhfwrkxgamzfwd`:

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

create policy "Authenticated write app_settings"
  on public.app_settings for all
  to authenticated using (true) with check (true);

insert into public.app_settings (key, value) values (
  'image_enhancement_prompt',
  'professional jewellery product photo, clean white background, studio lighting, high quality, sharp focus, keep jewellery design unchanged'
);
```

- [ ] **Step 2: Verify**

```sql
select key, value from public.app_settings;
```

Expected: one row with `key = 'image_enhancement_prompt'`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add app_settings table with default enhancement prompt"
```

---

## Task 2: Create and deploy process-image Edge Function

**Files:**
- Create: `supabase/functions/process-image/index.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p supabase/functions/process-image
```

`supabase/functions/process-image/index.ts`:

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const hfToken = Deno.env.get('HUGGINGFACE_TOKEN')
    if (!hfToken) throw new Error('HUGGINGFACE_TOKEN not configured')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) throw new Error('No file provided')

    const fileBytes = await file.arrayBuffer()

    // Fetch prompt from app_settings
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'image_enhancement_prompt')
      .single()
    const prompt = setting?.value ??
      'professional jewellery product photo, clean white background, studio lighting, high quality'

    // Convert to base64 for HuggingFace
    const uint8 = new Uint8Array(fileBytes)
    let binary = ''
    for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i])
    const base64Image = btoa(binary)

    // Call HuggingFace instruct-pix2pix — fallback to original on any failure
    let resultBytes: ArrayBuffer = fileBytes
    let resultContentType = file.type
    try {
      const hfRes = await fetch(
        'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
            'X-Wait-For-Model': 'true',
          },
          body: JSON.stringify({
            inputs: base64Image,
            parameters: {
              prompt,
              num_inference_steps: 20,
              image_guidance_scale: 1.5,
            },
          }),
        }
      )
      if (hfRes.ok) {
        resultBytes = await hfRes.arrayBuffer()
        resultContentType = 'image/png'
      }
    } catch {
      // fall through — upload original
    }

    // Upload to Supabase Storage
    const ext = resultContentType === 'image/png' ? 'png' : (file.name.split('.').pop() ?? 'jpg')
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, new Uint8Array(resultBytes), { contentType: resultContentType })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('product-images').getPublicUrl(path)

    return new Response(
      JSON.stringify({ url: data.publicUrl, path }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 2: Deploy the edge function**

Use `mcp__claude_ai_Supabase__deploy_edge_function` with:
- project: `cergignhfwrkxgamzfwd`
- name: `process-image`
- files: the `index.ts` content above

- [ ] **Step 3: Set HUGGINGFACE_TOKEN secret**

Run in terminal (replace token with the actual value):
```bash
npx supabase secrets set HUGGINGFACE_TOKEN=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 --project-ref cergignhfwrkxgamzfwd
```

Or set it via Supabase dashboard → Edge Functions → process-image → Secrets.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/process-image/index.ts
git commit -m "feat: add process-image edge function for AI image enhancement"
```

---

## Task 3: Create enhanceAndUpload helper

**Files:**
- Create: `src/lib/enhanceAndUpload.js`

- [ ] **Step 1: Create the file**

`src/lib/enhanceAndUpload.js`:

```js
import { supabase } from './supabase'

export async function enhanceAndUpload(file) {
  // Videos bypass AI enhancement — upload directly
  if (file.type.startsWith('video/')) {
    const ext = file.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return { url: data.publicUrl, path }
  }

  // Images go through the edge function for AI enhancement
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-image`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      body: formData,
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || 'Image enhancement failed')
  }
  const { url, path } = await res.json()
  return { url, path }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: clean build, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/enhanceAndUpload.js
git commit -m "feat: add enhanceAndUpload helper routing images through edge function"
```

---

## Task 4: Build Settings page

**Files:**
- Create: `src/pages/Settings.jsx`

- [ ] **Step 1: Create the file**

`src/pages/Settings.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

export default function Settings() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'image_enhancement_prompt')
      .single()
      .then(({ data }) => {
        if (data) setPrompt(data.value)
        setLoading(false)
      })
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase
      .from('app_settings')
      .upsert({ key: 'image_enhancement_prompt', value: prompt.trim(), updated_at: new Date().toISOString() })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-brand-green mb-6">Settings</h1>
        <div className="bg-white rounded-lg border border-brand-border p-6">
          <h2 className="font-semibold text-brand-green mb-1">Image Enhancement Prompt</h2>
          <p className="text-xs text-gray-400 mb-4">
            This prompt is sent to AI every time you upload a product image. Describe the style you want.
          </p>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <form onSubmit={handleSave}>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                className="w-full border border-brand-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
                placeholder="e.g. professional jewellery product photo, clean white background, studio lighting..."
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="submit"
                  disabled={saving || !prompt.trim()}
                  className="px-4 py-2 text-sm bg-brand-green text-brand-gold rounded hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {saved && <span className="text-sm text-green-600">Saved</span>}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add route to App.jsx**

In `src/App.jsx`, add the import at the top:
```jsx
import Settings from './pages/Settings'
```

Add the route before the `*` catch-all:
```jsx
<Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
```

- [ ] **Step 3: Add Settings link to Navbar.jsx**

In `src/components/Navbar.jsx`, add after the `tasksActive` variable declaration:
```js
const settingsActive = pathname.startsWith('/settings')
```

Add the link after the Tasks link:
```jsx
<Link
  to="/settings"
  className={`text-sm transition-colors ${settingsActive ? 'text-brand-gold font-medium' : 'text-brand-gold/70 hover:text-brand-gold'}`}
>
  Settings
</Link>
```

- [ ] **Step 4: Verify build and manual check**

```bash
npm run build
```

Navigate to `http://localhost:5173/settings` — should show the settings page with the default prompt loaded from Supabase.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.jsx src/App.jsx src/components/Navbar.jsx
git commit -m "feat: add Settings page for image enhancement prompt"
```

---

## Task 5: Update AddProductModal

**Files:**
- Modify: `src/components/AddProductModal.jsx`

Replace the upload loop with `enhanceAndUpload`. The submit button label reflects enhancement in progress.

- [ ] **Step 1: Add import**

At the top of `src/components/AddProductModal.jsx`, add:
```js
import { enhanceAndUpload } from '../lib/enhanceAndUpload'
```

- [ ] **Step 2: Replace the upload loop**

Find the upload loop (lines ~28–45):
```js
// Upload all selected media files
const uploadedItems = []
for (const item of mediaItems) {
  const ext = item.file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, item.file)
  if (uploadError) {
    if (uploadedItems.length) {
      await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
    }
    setError(uploadError.message)
    setLoading(false)
    return
  }
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  uploadedItems.push({ path, url: data.publicUrl, type: item.type })
}
```

Replace with:
```js
const uploadedItems = []
for (const item of mediaItems) {
  try {
    const { url, path } = await enhanceAndUpload(item.file)
    uploadedItems.push({ url, path, type: item.type })
  } catch (err) {
    if (uploadedItems.length) {
      await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
    }
    setError(err.message)
    setLoading(false)
    return
  }
}
```

- [ ] **Step 3: Update submit button label**

Find the submit button text `{loading ? 'Adding...' : 'Add Product'}` and replace with:
```jsx
{loading ? (mediaItems.length > 0 ? 'Enhancing & saving...' : 'Adding...') : 'Add Product'}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddProductModal.jsx
git commit -m "feat: AddProductModal uses enhanceAndUpload for AI image processing"
```

---

## Task 6: Update EditProductModal

**Files:**
- Modify: `src/components/EditProductModal.jsx`

Same change as AddProductModal — replace direct storage upload with `enhanceAndUpload`.

- [ ] **Step 1: Add import**

At the top of `src/components/EditProductModal.jsx`, add:
```js
import { enhanceAndUpload } from '../lib/enhanceAndUpload'
```

- [ ] **Step 2: Replace the upload loop**

Find the upload loop (lines ~76–92):
```js
const newItems = mediaItems.filter(item => !item.isExisting)
const uploadedItems = []
for (const item of newItems) {
  const ext = item.file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, item.file)
  if (uploadError) {
    if (uploadedItems.length) {
      await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
    }
    setError(uploadError.message)
    setLoading(false)
    return
  }
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  uploadedItems.push({ path, url: data.publicUrl, type: item.type })
}
```

Replace with:
```js
const newItems = mediaItems.filter(item => !item.isExisting)
const uploadedItems = []
for (const item of newItems) {
  try {
    const { url, path } = await enhanceAndUpload(item.file)
    uploadedItems.push({ url, path, type: item.type })
  } catch (err) {
    if (uploadedItems.length) {
      await supabase.storage.from('product-images').remove(uploadedItems.map(i => i.path))
    }
    setError(err.message)
    setLoading(false)
    return
  }
}
```

- [ ] **Step 3: Update submit button label**

Find `{loading ? 'Saving...' : 'Save Changes'}` and replace with:
```jsx
{loading ? (mediaItems.some(i => !i.isExisting) ? 'Enhancing & saving...' : 'Saving...') : 'Save Changes'}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add src/components/EditProductModal.jsx
git commit -m "feat: EditProductModal uses enhanceAndUpload for AI image processing"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|-----------------|------|
| `app_settings` table with default prompt | Task 1 |
| Edge function calls HuggingFace instruct-pix2pix | Task 2 |
| HF token stored as Supabase secret | Task 2 Step 3 |
| Fallback to original image on HF failure | Task 2 (try/catch in edge function) |
| Settings page to edit prompt | Task 4 |
| Settings route + Navbar link | Task 4 |
| AddProductModal uses edge function | Task 5 |
| EditProductModal uses edge function | Task 6 |
| Videos bypass AI enhancement | Task 3 (enhanceAndUpload helper) |
| Loading label communicates enhancement | Tasks 5 + 6 |
