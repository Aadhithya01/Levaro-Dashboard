// Chain-specific product tags (chain_type, chain_colour) and the category
// names they apply to. Shared by the admin product grid, the Add/Edit Product
// modals, the "Set Filter" catch-up page, and the customer shop filter bar.

export const CHAIN_CATEGORY_NAMES = ['Chains', 'ANTI-TARNISH CHAINS']

export const CHAIN_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' },
]

export const CHAIN_COLOURS = [
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
]

export const PENDANT_STYLES = [
  { value: 'stone', label: 'Stone' },
  { value: 'plain', label: 'Plain' },
]

export function isChainCategory(categoryName) {
  return CHAIN_CATEGORY_NAMES.includes(categoryName)
}

export function matchesChainFilters(product, selectedTypes, selectedColours, selectedPendants) {
  if (selectedTypes.length > 0 && !selectedTypes.includes(product.chain_type)) return false
  if (selectedColours.length > 0 && !selectedColours.includes(product.chain_colour)) return false
  if (selectedPendants.length > 0 && !selectedPendants.includes(product.pendant_style)) return false
  return true
}
