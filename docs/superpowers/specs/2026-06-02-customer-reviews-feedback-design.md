# Customer Reviews, Feedback & Support Email — Design Spec

**Date:** 2026-06-02
**Status:** Approved

---

## Overview

Add three features to the public customer-facing site (`/shop`, `/shop/:categoryId`):

1. **Support email** visible in a footer on every customer page.
2. **Product reviews** — a "Write a Review" button on each product card opens a modal; submissions are saved to Supabase and emailed to the business owner.
3. **General feedback** — a floating button fixed to the bottom-right of every customer page opens a feedback modal; submissions are saved to Supabase and emailed to the business owner.

---

## Email Addresses

| Purpose | Address |
|---|---|
| Shown publicly to customers | `levaro.studiossupport@gmail.com` |
| Receives review/feedback notifications | `levarostudios@gmail.com` |

---

## Data Storage — Supabase Tables

### `product_reviews`
```sql
create table product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references products(id) on delete cascade,
  reviewer_name text not null,
  rating      integer not null check (rating between 1 and 5),
  comment     text not null,
  created_at  timestamptz default now()
);
```

### `site_feedback`
```sql
create table site_feedback (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  message    text not null,
  created_at timestamptz default now()
);
```

Both tables are insert-only from the public customer site (no auth required). Row-level security should allow anonymous inserts only.

---

## Email Sending — EmailJS

Since the app has no backend, email is sent client-side via **EmailJS** (`@emailjs/browser`).

**Required env vars (add to `.env`):**
```
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_REVIEW_ID=
VITE_EMAILJS_TEMPLATE_FEEDBACK_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

**EmailJS template variables:**
- Review template: `{{product_name}}`, `{{reviewer_name}}`, `{{rating}}`, `{{comment}}`
- Feedback template: `{{name}}`, `{{message}}`

Both templates send to `levarostudios@gmail.com`.

---

## Components

All new components live under `src/components/customer/`.

### `ReviewModal.jsx`
Props: `productName`, `productId`, `onClose`

Form fields: reviewer name (text, required), star rating (1–5 click-to-select, required), comment (textarea, required).

On submit:
1. Insert row into `product_reviews` via Supabase client.
2. Call EmailJS with review template.
3. Show success state inside the modal ("Thank you for your review!"), then close after 2 s.

### `FeedbackModal.jsx`
Props: `onClose`

Form fields: name (text, optional), message (textarea, required).

On submit:
1. Insert row into `site_feedback` via Supabase client.
2. Call EmailJS with feedback template.
3. Show success state ("Thank you! We'll read your message."), then close after 2 s.

### `CustomerFooter.jsx`
Static footer bar (dark green background, brand gold text) showing:
- Left: "© 2025 Levaro. All rights reserved."
- Right: "Support: levaro.studiossupport@gmail.com" as a mailto link.

### `FloatingFeedbackButton.jsx`
Fixed position (bottom-right, `bottom-6 right-6`). Brand green pill button with chat icon and "Feedback" label. Manages `showFeedback` state and renders `FeedbackModal` when open.

---

## Changes to Existing Files

### `CustomerCategory.jsx`
- Import and render `<CustomerFooter />` at the bottom of the page.
- Import and render `<FloatingFeedbackButton />`.
- On each product card, add a "★ Write a Review" button below the price. Button opens `<ReviewModal />` with the product's `id` and `name`. Review button appears on all products regardless of stock status.
- Track `reviewingProduct` state (`null` or `{ id, name }`).

### `CustomerShop.jsx`
- Import and render `<CustomerFooter />` at the bottom of the page.
- Import and render `<FloatingFeedbackButton />`.

---

## Error Handling

- If either the Supabase insert or the EmailJS call fails, show an inline error message inside the modal ("Something went wrong. Please try again."). The modal stays open so the user can retry.
- If EmailJS env vars are missing, skip the email step silently (Supabase save still proceeds).

---

## Out of Scope

- Displaying reviews publicly on the customer site.
- Admin view of reviews/feedback (data is accessible via Supabase dashboard).
- Email sending to the customer (confirmation emails).
