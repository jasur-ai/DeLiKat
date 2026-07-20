/**
 * 📊 Product Comparison — localStorage utilities
 */
const COMPARE_KEY = 'deliket_compare';

export function getCompareIds(): number[] {
  try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]'); }
  catch { return []; }
}

export function toggleCompare(id: number): boolean {
  const ids = getCompareIds();
  const idx = ids.indexOf(id);
  if (idx >= 0) {
    ids.splice(idx, 1);
  } else if (ids.length < 4) {
    ids.push(id);
  } else {
    return false; // max 4 items
  }
  localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
  return true;
}

export function clearCompare() {
  localStorage.removeItem(COMPARE_KEY);
}

export function isInCompare(id: number): boolean {
  return getCompareIds().includes(id);
}
