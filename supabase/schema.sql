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
