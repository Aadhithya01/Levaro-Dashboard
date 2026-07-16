import { supabase } from './supabase'

// Local (not UTC) YYYY-MM-DD for "today", so the deal rolls over at the store's
// local midnight rather than UTC.
export function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// Map of product_id -> deal_price for today's active deals. Used by the category
// page / product modal to badge products and charge the deal price.
export async function fetchTodaysDeals() {
  const { data } = await supabase
    .from('deal_products')
    .select('product_id, deal_price')
    .eq('deal_date', todayISO())
  const map = new Map()
  ;(data ?? []).forEach(d => map.set(d.product_id, Number(d.deal_price)))
  return map
}
