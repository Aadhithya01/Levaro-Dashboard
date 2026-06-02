# Customer Reviews, Feedback & Support Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product reviews (modal on card), a floating feedback form, and a support-email footer to the public customer-facing pages (`/shop`, `/shop/:categoryId`).

**Architecture:** Four new components under `src/components/customer/` handle all new UI. Submissions are saved directly to Supabase from the client, then an EmailJS call sends a notification to `levarostudios@gmail.com`. The two existing customer pages each get the footer and floating button dropped in with two import lines each.

**Tech Stack:** React 19, Supabase JS v2, `@emailjs/browser`, Tailwind CSS, Vite env vars.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/components/customer/CustomerFooter.jsx` | Static footer — copyright + public support email |
| Create | `src/components/customer/FeedbackModal.jsx` | General feedback form modal |
| Create | `src/components/customer/FloatingFeedbackButton.jsx` | Fixed bottom-right button that opens FeedbackModal |
| Create | `src/components/customer/ReviewModal.jsx` | Product review form modal with star rating |
| Modify | `src/pages/CustomerShop.jsx` | Add footer + floating feedback button |
| Modify | `src/pages/CustomerCategory.jsx` | Add footer + floating button + review button on cards |

---

## Task 1: Create Supabase tables and RLS policies

**Files:** None (run SQL in Supabase dashboard → SQL Editor)

- [ ] **Step 1: Create `product_reviews` table**

In the Supabase dashboard SQL Editor, run:

```sql
create table product_reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references products(id) on delete cascade,
  reviewer_name text not null,
  rating        integer not null check (rating between 1 and 5),
  comment       text not null,
  created_at    timestamptz default now()
);
```

- [ ] **Step 2: Create `site_feedback` table**

```sql
create table site_feedback (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  message    text not null,
  created_at timestamptz default now()
);
```

- [ ] **Step 3: Enable RLS and allow anonymous inserts**

```sql
alter table product_reviews enable row level security;
alter table site_feedback   enable row level security;

create policy "anon_insert_reviews"
  on product_reviews for insert to anon with check (true);

create policy "anon_insert_feedback"
  on site_feedback for insert to anon with check (true);
```

- [ ] **Step 4: Verify**

In Supabase Table Editor, confirm both tables appear with the correct columns. In the Authentication → Policies panel, confirm the two `anon` insert policies are listed.

---

## Task 2: Install EmailJS and add env vars

**Files:** `package.json` (modified by npm), `.env`

- [ ] **Step 1: Install the package**

```bash
npm install @emailjs/browser
```

Expected output ends with: `added 1 package` (or similar — no errors).

- [ ] **Step 2: Add env vars to `.env`**

Open `.env` and append these four lines (values filled in after EmailJS setup — see Step 3):

```
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_REVIEW_ID=
VITE_EMAILJS_TEMPLATE_FEEDBACK_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

- [ ] **Step 3: Set up EmailJS (one-time manual step)**

1. Create a free account at https://www.emailjs.com
2. Add a **Gmail** service connected to `levarostudios@gmail.com` — copy the **Service ID** into `VITE_EMAILJS_SERVICE_ID`.
3. Copy the **Public Key** (Account → API Keys) into `VITE_EMAILJS_PUBLIC_KEY`.
4. Create a template for reviews with subject `New Review: {{product_name}}` and body:

   ```
   Product: {{product_name}}
   Reviewer: {{reviewer_name}}
   Rating: {{rating}}
   Comment: {{comment}}
   ```

   Set **To Email** to `levarostudios@gmail.com`. Copy the **Template ID** into `VITE_EMAILJS_TEMPLATE_REVIEW_ID`.

5. Create a second template for feedback with subject `New Feedback from {{name}}` and body:

   ```
   From: {{name}}
   Message: {{message}}
   ```

   Set **To Email** to `levarostudios@gmail.com`. Copy the **Template ID** into `VITE_EMAILJS_TEMPLATE_FEEDBACK_ID`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @emailjs/browser"
```

(Do not commit `.env` — it is already in `.gitignore`.)

---

## Task 3: CustomerFooter component

**Files:**
- Create: `src/components/customer/CustomerFooter.jsx`

- [ ] **Step 1: Create the component**

```jsx
export default function CustomerFooter() {
  return (
    <footer className="bg-brand-green px-6 py-4 mt-12">
      <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <p className="text-brand-gold/70 text-xs">© 2025 Levaro. All rights reserved.</p>
        <p className="text-brand-gold/80 text-xs">
          Support:{' '}
          <a
            href="mailto:levaro.studiossupport@gmail.com"
            className="text-brand-gold font-semibold hover:underline"
          >
            levaro.studiossupport@gmail.com
          </a>
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/customer/CustomerFooter.jsx
git commit -m "feat: add CustomerFooter with support email"
```

---

## Task 4: FeedbackModal component

**Files:**
- Create: `src/components/customer/FeedbackModal.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import emailjs from '@emailjs/browser'

export default function FeedbackModal({ onClose }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('submitting')

    const { error } = await supabase
      .from('site_feedback')
      .insert({ name: name.trim() || null, message: message.trim() })

    if (error) { setStatus('error'); return }

    const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_FEEDBACK_ID
    const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    if (serviceId && templateId && publicKey) {
      await emailjs
        .send(serviceId, templateId, { name: name.trim() || 'Anonymous', message: message.trim() }, { publicKey })
        .catch(() => {})
    }

    setStatus('success')
    setTimeout(onClose, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Share Feedback</h2>
            <p className="text-xs text-gray-400 mt-0.5">We read every message.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-8 text-center">
            <p className="text-brand-green font-semibold text-sm">
              Thank you! We'll read your message.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Message
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us anything — suggestions, issues, compliments..."
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-green"
              />
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-xs">Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-brand-green text-brand-gold font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-60"
            >
              {status === 'submitting' ? 'Sending...' : 'Send Feedback'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Or email us at{' '}
              <a
                href="mailto:levaro.studiossupport@gmail.com"
                className="text-brand-green font-medium hover:underline"
              >
                levaro.studiossupport@gmail.com
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/customer/FeedbackModal.jsx
git commit -m "feat: add FeedbackModal with Supabase insert and EmailJS notification"
```

---

## Task 5: FloatingFeedbackButton component

**Files:**
- Create: `src/components/customer/FloatingFeedbackButton.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react'
import FeedbackModal from './FeedbackModal'

export default function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brand-green text-brand-gold rounded-full px-4 py-2.5 shadow-lg hover:opacity-90 transition-opacity font-semibold text-sm"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          />
        </svg>
        Feedback
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/customer/FloatingFeedbackButton.jsx
git commit -m "feat: add FloatingFeedbackButton"
```

---

## Task 6: ReviewModal component

**Files:**
- Create: `src/components/customer/ReviewModal.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import emailjs from '@emailjs/browser'

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl leading-none focus:outline-none transition-colors"
          style={{ color: star <= (hovered || value) ? '#e8c96a' : '#d1d5db' }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function ReviewModal({ productId, productName, onClose }) {
  const [reviewerName, setReviewerName] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [ratingError, setRatingError] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) { setRatingError(true); return }
    setRatingError(false)
    setStatus('submitting')

    const { error } = await supabase.from('product_reviews').insert({
      product_id:    productId,
      reviewer_name: reviewerName.trim(),
      rating,
      comment:       comment.trim(),
    })

    if (error) { setStatus('error'); return }

    const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_REVIEW_ID
    const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    if (serviceId && templateId && publicKey) {
      await emailjs
        .send(serviceId, templateId, {
          product_name:  productName,
          reviewer_name: reviewerName.trim(),
          rating:        `${rating}/5`,
          comment:       comment.trim(),
        }, { publicKey })
        .catch(() => {})
    }

    setStatus('success')
    setTimeout(onClose, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-brand-green uppercase tracking-widest">
              {productName}
            </p>
            <h2 className="text-lg font-bold text-gray-800 mt-0.5">Write a Review</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-8 text-center">
            <p className="text-brand-green font-semibold text-sm">
              Thank you for your review!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={reviewerName}
                onChange={e => setReviewerName(e.target.value)}
                placeholder="e.g. Priya S."
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">
                Rating
              </label>
              <StarRating value={rating} onChange={r => { setRating(r); setRatingError(false) }} />
              {ratingError && (
                <p className="text-red-500 text-xs mt-1">Please select a star rating.</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Comment
              </label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-green"
              />
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-xs">Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-brand-green text-brand-gold font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-60"
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/customer/ReviewModal.jsx
git commit -m "feat: add ReviewModal with star rating, Supabase insert, and EmailJS notification"
```

---

## Task 7: Update CustomerShop.jsx

**Files:**
- Modify: `src/pages/CustomerShop.jsx`

- [ ] **Step 1: Add imports at top of file**

After the existing imports, add:

```jsx
import CustomerFooter from '../components/customer/CustomerFooter'
import FloatingFeedbackButton from '../components/customer/FloatingFeedbackButton'
```

- [ ] **Step 2: Add footer and floating button to the JSX**

The current return looks like:
```jsx
return (
  <div className="min-h-screen bg-brand-cream">
    <div className="bg-brand-green px-6 py-5 text-center shadow-sm">
      ...
    </div>
    <div className="max-w-5xl mx-auto px-6 py-8">
      ...
    </div>
  </div>
)
```

Replace the closing structure so the full return is:

```jsx
return (
  <div className="min-h-screen bg-brand-cream flex flex-col">
    <div className="bg-brand-green px-6 py-5 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-brand-gold tracking-[0.3em]">LEVARO</h1>
      <p className="text-brand-gold/50 text-[10px] tracking-[0.2em] uppercase mt-1">Timeless Style. Refined for You.</p>
    </div>

    <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
      <p className="text-xs font-semibold text-brand-green uppercase tracking-widest mb-6">Our Collections</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-20">No collections available yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {categories.map(cat =>
            cat.image_url ? (
              <div
                key={cat.id}
                onClick={() => navigate(`/shop/${cat.id}`)}
                className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all ring-2 ring-transparent hover:ring-brand-green"
              >
                <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-bold text-white text-base tracking-wide">{cat.name}</p>
                </div>
              </div>
            ) : (
              <div
                key={cat.id}
                onClick={() => navigate(`/shop/${cat.id}`)}
                className="aspect-square rounded-2xl bg-white border border-brand-border flex flex-col items-center justify-center cursor-pointer hover:border-brand-green hover:shadow-md transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-brand-green flex items-center justify-center mb-3">
                  <span className="text-3xl font-bold text-brand-gold">{cat.name.charAt(0).toUpperCase()}</span>
                </div>
                <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
              </div>
            )
          )}
        </div>
      )}
    </div>

    <CustomerFooter />
    <FloatingFeedbackButton />
  </div>
)
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`, navigate to `http://localhost:5173/shop`. Confirm:
- Footer is visible at bottom with copyright and support email link.
- "Feedback" pill button is fixed in the bottom-right corner.
- Clicking Feedback opens the modal; closing it works.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CustomerShop.jsx
git commit -m "feat: add footer and floating feedback button to CustomerShop"
```

---

## Task 8: Update CustomerCategory.jsx

**Files:**
- Modify: `src/pages/CustomerCategory.jsx`

- [ ] **Step 1: Add imports at top of file**

After the existing imports, add:

```jsx
import CustomerFooter from '../components/customer/CustomerFooter'
import FloatingFeedbackButton from '../components/customer/FloatingFeedbackButton'
import ReviewModal from '../components/customer/ReviewModal'
```

- [ ] **Step 2: Add reviewingProduct state**

Inside the component, after the existing `useState` calls, add:

```jsx
const [reviewingProduct, setReviewingProduct] = useState(null) // { id, name } | null
```

- [ ] **Step 3: Add the review button to each product card**

Inside the product card's `<div className="p-3">` block, after the price paragraph, add:

```jsx
<button
  type="button"
  onClick={e => { e.stopPropagation(); setReviewingProduct({ id: product.id, name: product.name }) }}
  className="mt-2 w-full border border-brand-green text-brand-green rounded-lg py-1.5 text-xs font-semibold hover:bg-brand-green/5 transition-colors"
>
  ★ Write a Review
</button>
```

The updated `<div className="p-3">` block becomes:

```jsx
<div className="p-3">
  <p className="font-semibold text-gray-800 text-sm truncate">{product.name}</p>
  <p className="text-brand-green font-bold text-base mt-1">
    {product.selling_price != null
      ? `₹${Number(product.selling_price).toFixed(0)}`
      : <span className="text-gray-400 font-normal text-sm">Price on request</span>
    }
  </p>
  <button
    type="button"
    onClick={e => { e.stopPropagation(); setReviewingProduct({ id: product.id, name: product.name }) }}
    className="mt-2 w-full border border-brand-green text-brand-green rounded-lg py-1.5 text-xs font-semibold hover:bg-brand-green/5 transition-colors"
  >
    ★ Write a Review
  </button>
</div>
```

- [ ] **Step 4: Add footer, floating button, and ReviewModal to the JSX**

Change the outermost `<div>` from `<div className="min-h-screen bg-brand-cream">` to `<div className="min-h-screen bg-brand-cream flex flex-col">`.

At the very end of the return, just before the final closing `</div>`, add:

```jsx
    <CustomerFooter />
    <FloatingFeedbackButton />
    {reviewingProduct && (
      <ReviewModal
        productId={reviewingProduct.id}
        productName={reviewingProduct.name}
        onClose={() => setReviewingProduct(null)}
      />
    )}
```

- [ ] **Step 5: Verify in browser**

Navigate to `http://localhost:5173/shop`, click a category. Confirm:
- Each product card has a "★ Write a Review" button.
- Clicking it opens the ReviewModal pre-labelled with the product name.
- Filling in name, selecting stars, writing a comment, and clicking Submit shows the success message and closes the modal.
- In the Supabase dashboard → Table Editor → `product_reviews`, the new row appears.
- Footer and floating Feedback button are present.

- [ ] **Step 6: Commit**

```bash
git add src/pages/CustomerCategory.jsx
git commit -m "feat: add review button and modals to CustomerCategory"
```

---

## Task 9: End-to-end smoke test

- [ ] **Step 1: Test feedback flow**

Open `/shop`. Click the Feedback button. Submit with a name and message. Confirm:
1. Modal shows "Thank you! We'll read your message."
2. Row appears in Supabase `site_feedback` table.
3. (Once EmailJS is configured) Email arrives at `levarostudios@gmail.com`.

- [ ] **Step 2: Test review flow**

Open `/shop/:categoryId`. Click "★ Write a Review" on any product. Submit with name, 4 stars, and a comment. Confirm:
1. Modal shows "Thank you for your review!"
2. Row appears in Supabase `product_reviews` table with correct `product_id`, `rating`, etc.
3. (Once EmailJS is configured) Email arrives at `levarostudios@gmail.com`.

- [ ] **Step 3: Test support email link**

Click the support email in the footer — confirm it opens a `mailto:levaro.studiossupport@gmail.com` compose window.

- [ ] **Step 4: Test error state**

Temporarily break the Supabase insert (e.g., disconnect network). Submit a review. Confirm the modal shows "Something went wrong. Please try again." and stays open.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: customer reviews, feedback form, and support email complete"
```
