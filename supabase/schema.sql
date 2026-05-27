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
