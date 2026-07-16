# Deal of the Day

**Date:** 2026-07-16
**Surface:** Admin (new `/deals` page) + public storefront (`/shop`).

## Goal

Each day, a few products (typically 3) are sold at a **real** lower price that the
customer actually pays. Admin picks the products and prices; deals are date-tagged and
auto-rotate at midnight. Distinct from the cosmetic fake-MRP discount (display only).

## Decisions

- **Selection:** manual — admin chooses products + types each deal price (margin control).
- **Timing:** date-based — each deal has a `deal_date`; storefront shows only today's.
  Admin can pre-schedule future dates.
- **Placement:** a "Deal of the Day" section on the `/shop` landing **plus** a gold
  "DEAL" badge + deal price wherever the product appears (category tiles, product modal).

## Data — new table `deal_products` (added to dev AND live)

```
id          uuid pk
product_id  uuid not null -> products(id) on delete cascade
deal_price  numeric not null check (deal_price >= 0)   -- real price paid
deal_date   date not null default current_date
created_at  timestamptz default now()
unique (product_id, deal_date)                          -- one deal per product/day
index (deal_date)
```

RLS (mirrors `products`): `GRANT ALL` to anon+authenticated; policy "Public read
deal_products" (anon SELECT) + "auth users full access on deal_products" (authenticated
ALL). Anon is effectively read-only via RLS. `deal_price` is safe to expose (public sale price).

## Admin — `src/pages/DealOfTheDay.jsx` (protected route `/deals`, Navbar link)

- Date selector (default today; future dates allowed to pre-schedule).
- "Add deal" opens `AddDealModal`: pick a product (list of products), type `deal_price`;
  shows that product's `selling_price` + live "% off" so you can't misprice. Insert into
  `deal_products` with the selected date.
- Lists the selected date's deals (product name, selling_price → deal_price, % off) with
  delete. Not hard-locked to 3.
- Follows existing pattern: direct Supabase calls, `fetchData()` refresh, modal with
  `onClose`/`onAdded`.

## Storefront

- **Shared helper `src/lib/deals.js`:** `fetchTodaysDeals()` → `Map<product_id, deal_price>`
  (queries `deal_products` where `deal_date = today`). `todayISO()` returns local date string.
- **`CustomerShop` (`/shop`):** new "Deal of the Day" section near the top. Fetches today's
  deals joined to product details (image, name, selling_price, stock). Renders cards with
  ~~selling_price~~ → **deal_price**, "X% OFF" gold badge, add-to-cart using `deal_price`.
  Section hidden when no deals today.
- **`CustomerCategory`:** also fetches today's deal map; for each product on deal, passes
  `dealPrice` to `PriceTag` and uses `deal_price` in `addItem`. Product modal
  (`ProductMediaModal`) receives + uses `dealPrice` the same way.

## `PriceTag` extension

Add optional `dealPrice` prop:
- If `dealPrice != null` and `dealPrice < selling_price` → **real-deal mode**: struck
  `selling_price`, bold `deal_price`, gold "DEAL · X% OFF" (pct from real numbers).
- Else → existing cosmetic mode. A real deal overrides the fake MRP for that product.

## Cart / checkout — no structural change

`addItem` already stores each item's `price`; deal products pass `deal_price`. Totals and
the logged `customer_orders` row reflect the deal automatically. Deal price is locked in at
add-to-cart time (a later checkout still honors the price shown when added).

## Non-goals

- No per-deal quantity cap (deal applies while the product has stock, on its date).
- No automatic product selection or blanket % — all manual.
- A deal product does not also display the cosmetic fake MRP.
- Not dev-only: same code both environments; table lives in dev + live.
