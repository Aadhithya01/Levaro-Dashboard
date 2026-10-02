-- Products
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Purchases (multiple per product)
CREATE TABLE purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  date_of_purchase date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_per_piece numeric(10,2) NOT NULL CHECK (price_per_piece > 0),
  created_at timestamptz DEFAULT now()
);

-- Sales (multiple per product)
CREATE TABLE sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  sale_date date NOT NULL,
  quantity_sold integer NOT NULL CHECK (quantity_sold > 0),
  selling_price numeric(10,2) NOT NULL CHECK (selling_price > 0),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read and write all data (shared workspace)
CREATE POLICY "authenticated users can do everything on products"
  ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated users can do everything on purchases"
  ON purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated users can do everything on sales"
  ON sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Migration: add_categories (2026-05-27)
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can do everything on categories"
  ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Migration: add_image_urls_and_storage_buckets (2026-05-27)
ALTER TABLE categories ADD COLUMN image_url text;
ALTER TABLE products ADD COLUMN image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('category-images', 'category-images', true),
  ('product-images',  'product-images',  true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated users can upload category images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "authenticated users can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Migration: add_avatars_bucket (2026-05-28)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users can manage own avatar"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Migration: add_ledger_and_tasks (2026-05-30)
CREATE TABLE ledger_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL
);

CREATE TABLE ledger_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  paid_by uuid REFERENCES ledger_members(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ledger_splits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid REFERENCES ledger_expenses(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES ledger_members(id) NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0)
);

CREATE TABLE ledger_settlements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_member uuid REFERENCES ledger_members(id) NOT NULL,
  to_member uuid REFERENCES ledger_members(id) NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  due_date date,
  assigned_to uuid REFERENCES ledger_members(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ledger_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users full access on ledger_members"
  ON ledger_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users full access on ledger_expenses"
  ON ledger_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users full access on ledger_splits"
  ON ledger_splits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users full access on ledger_settlements"
  ON ledger_settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users full access on tasks"
  ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO ledger_members (name, email) VALUES
  ('Aadhithya', 'aadhithyaraja180@gmail.com'),
  ('Thivya', 'yuvarajthivyaa@gmail.com'),
  ('Giri', 'giriarasank@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Migration: add_ledger_indexes_and_constraints (2026-05-30)
CREATE INDEX ON ledger_splits(expense_id);
CREATE INDEX ON ledger_splits(member_id);
ALTER TABLE ledger_settlements ADD CONSTRAINT settlements_different_members CHECK (from_member <> to_member);

-- Migration: create_vendor_orders (2026-06-29)
CREATE TABLE vendor_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name text NOT NULL,
  phone text,
  order_price numeric(10,2),
  quantity integer CHECK (quantity IS NULL OR quantity > 0),
  location text,
  bill_url text,
  bill_path text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users full access on vendor_orders"
  ON vendor_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-bills', 'order-bills', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated users can upload order bills"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-bills');

CREATE POLICY "authenticated users can delete order bills"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'order-bills');

CREATE POLICY "order bills are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-bills');

-- Migration: create_product_variants (2026-06-29)
CREATE TABLE product_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  color_name text NOT NULL,
  image_url text,
  image_path text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users full access on product_variants"
  ON product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE purchases ADD COLUMN variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE;
ALTER TABLE sales ADD COLUMN variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE;
CREATE INDEX ON purchases(variant_id);
CREATE INDEX ON sales(variant_id);
CREATE INDEX ON product_variants(product_id);

-- Migration: harden_anon_access_and_spam_limits (2026-07-01)
-- Hide cost/price/payment columns from the public (anon) role; the storefront
-- only needs stock quantities. Everything else stays internal.
REVOKE SELECT ON purchases FROM anon;
GRANT SELECT (id, product_id, variant_id, quantity) ON purchases TO anon;
REVOKE SELECT ON sales FROM anon;
GRANT SELECT (id, product_id, variant_id, quantity_sold) ON sales TO anon;

-- Let anonymous storefront visitors read colour variants (non-sensitive) so
-- customer colour selection works when not logged in.
REVOKE SELECT ON product_variants FROM anon;
GRANT SELECT (id, product_id, color_name, image_url) ON product_variants TO anon;
CREATE POLICY "Public read product_variants"
  ON product_variants FOR SELECT TO anon USING (true);

-- Cap sizes / ranges on public-writable tables to limit spam payloads.
ALTER TABLE product_reviews
  ADD CONSTRAINT product_reviews_rating_range CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  ADD CONSTRAINT product_reviews_name_len CHECK (reviewer_name IS NULL OR char_length(reviewer_name) <= 100),
  ADD CONSTRAINT product_reviews_comment_len CHECK (comment IS NULL OR char_length(comment) <= 2000);
ALTER TABLE site_feedback
  ADD CONSTRAINT site_feedback_name_len CHECK (name IS NULL OR char_length(name) <= 100),
  ADD CONSTRAINT site_feedback_message_len CHECK (message IS NULL OR char_length(message) <= 5000);
ALTER TABLE product_suggestions
  ADD CONSTRAINT product_suggestions_name_len CHECK (name IS NULL OR char_length(name) <= 200),
  ADD CONSTRAINT product_suggestions_desc_len CHECK (description IS NULL OR char_length(description) <= 5000),
  ADD CONSTRAINT product_suggestions_photos_len CHECK (photo_urls IS NULL OR array_length(photo_urls, 1) <= 10);

-- Public buckets serve objects via their public CDN URL without these policies.
-- Dropping the broad SELECT policies stops anonymous enumeration/listing of all
-- files (notably sensitive vendor bills) while leaving direct URL access intact.
DROP POLICY IF EXISTS "order bills are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "public_read_suggestion_photos" ON storage.objects;
DROP POLICY IF EXISTS "avatars are publicly readable" ON storage.objects;

-- Migration: create_customer_orders (2026-07-01)
-- Captures storefront checkout orders (logged on "Send on WhatsApp" click).
CREATE TABLE customer_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  landmark text,
  location_url text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_orders_status_chk CHECK (status IN ('new','confirmed','delivered','cancelled')),
  CONSTRAINT customer_orders_name_len CHECK (char_length(customer_name) <= 100),
  CONSTRAINT customer_orders_phone_len CHECK (char_length(phone) <= 20),
  CONSTRAINT customer_orders_address_len CHECK (char_length(address) <= 1000),
  CONSTRAINT customer_orders_landmark_len CHECK (landmark IS NULL OR char_length(landmark) <= 200),
  CONSTRAINT customer_orders_location_len CHECK (location_url IS NULL OR char_length(location_url) <= 500),
  CONSTRAINT customer_orders_items_len CHECK (jsonb_array_length(items) <= 50)
);
CREATE INDEX ON customer_orders (created_at DESC);
CREATE INDEX ON customer_orders (status);

ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;

-- Customers (anon) may create orders only; they may never read them (PII).
GRANT INSERT (customer_name, phone, address, landmark, location_url, items, total) ON customer_orders TO anon;
CREATE POLICY "anyone_insert_customer_orders"
  ON customer_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth users full access on customer_orders"
  ON customer_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Migration: checkout_payment_options (2026-07-11)
-- Adds payment method/status/proof to storefront orders + a bucket for UPI
-- payment screenshots. Anon stays INSERT-only everywhere (no SELECT/LIST).
ALTER TABLE customer_orders
  ADD COLUMN payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN payment_proof_url  text,
  ADD COLUMN payment_proof_path text;

ALTER TABLE customer_orders
  ADD CONSTRAINT customer_orders_payment_method_chk
    CHECK (payment_method IN ('upi','cod')),
  ADD CONSTRAINT customer_orders_payment_status_chk
    CHECK (payment_status IN ('unpaid','claimed')),
  ADD CONSTRAINT customer_orders_proof_url_len
    CHECK (payment_proof_url IS NULL OR char_length(payment_proof_url) <= 500),
  ADD CONSTRAINT customer_orders_proof_path_len
    CHECK (payment_proof_path IS NULL OR char_length(payment_proof_path) <= 300);

-- Widen the anon INSERT grant to include the new payment columns.
GRANT INSERT (customer_name, phone, address, landmark, location_url, items, total,
              payment_method, payment_status, payment_proof_url, payment_proof_path)
  ON customer_orders TO anon;

-- Payment-proof screenshots. Public bucket like order-bills, but with NO broad
-- read/list policy: objects are reachable only via their exact (unguessable
-- UUID) CDN URL, so proofs can't be anonymously enumerated. Anon may upload only.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('payment-proofs', 'payment-proofs', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anon upload payment proofs"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "auth manage payment proofs"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs')
  WITH CHECK (bucket_id = 'payment-proofs');

-- Migration: chain_filters (2026-10-02)
-- Optional type/colour tags on chain products (Chains, ANTI-TARNISH CHAINS
-- categories) powering filter UI on the admin product grid, the "Set Filter"
-- catch-up page, and the customer shop. NULL = untagged; no anon grant
-- changes needed since "Public read products" already exposes all columns.
ALTER TABLE products
  ADD COLUMN chain_type text CHECK (chain_type IN ('single','double','triple')),
  ADD COLUMN chain_colour text CHECK (chain_colour IN ('gold','silver'));

-- Migration: chain_pendant_filter (2026-10-02)
-- Third chain filter dimension: whether the pendant has a stone or is plain.
ALTER TABLE products
  ADD COLUMN pendant_style text CHECK (pendant_style IN ('stone','plain'));

-- Migration: pay_in_hand (2026-10-02)
-- Third checkout payment option for in-person/stall sales: only the
-- customer's name is collected, no delivery details, no payment proof —
-- marked paid immediately. phone/address become optional since they're
-- meaningless for a walk-up sale; UPI orders still require both at the
-- app level. UPI screenshot proof also becomes mandatory going forward
-- (app-level check; unchanged at the DB level).
ALTER TABLE customer_orders
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL;

ALTER TABLE customer_orders
  DROP CONSTRAINT customer_orders_payment_method_chk,
  DROP CONSTRAINT customer_orders_payment_status_chk;

ALTER TABLE customer_orders
  ADD CONSTRAINT customer_orders_payment_method_chk
    CHECK (payment_method IN ('upi','cod','cash')),
  ADD CONSTRAINT customer_orders_payment_status_chk
    CHECK (payment_status IN ('unpaid','claimed','paid'));
