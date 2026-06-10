// Returns the Tailwind col/row-span classes for a collection tile at `index`,
// producing an art-directed "broken" magazine grid for any number of items.
//
// Desktop grid is 6 columns. The pattern repeats every 5 tiles:
//   0: large feature (4x3)   1: tall (2x2)   2: small (2x1)
//   3: wide (3x2)            4: wide (3x2)
// On mobile (2-col) the feature spans full width and the rest are even.
//
// The pattern is a pure function of index so collections of any length
// (1, 3, 30…) always look intentional.

const PATTERN = [
  'md:col-span-4 md:row-span-3',
  'md:col-span-2 md:row-span-2',
  'md:col-span-2 md:row-span-1',
  'md:col-span-3 md:row-span-2',
  'md:col-span-3 md:row-span-2',
]

// Mobile spans (2-col): feature tile (pattern index 0) goes full-width & tall.
const MOBILE = [
  'col-span-2 row-span-2',
  'col-span-1 row-span-2',
  'col-span-1 row-span-2',
  'col-span-2 row-span-2',
  'col-span-2 row-span-2',
]

export function tileSpan(index) {
  const i = index % PATTERN.length
  return `${MOBILE[i]} ${PATTERN[i]}`
}

// The editorial index label, e.g. 1 -> "01"
export function tileIndexLabel(index) {
  return String(index + 1).padStart(2, '0')
}
