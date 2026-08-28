export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${new Intl.NumberFormat('vi-VN').format(number)}đ`;
}
export function groupByCategory(items = []) {
  const groups = new Map();
  for (const item of items) {
    const category = (item.category || 'Khác').trim() || 'Khác';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  return [...groups.entries()].map(([category, groupItems]) => ({ category, items: [...groupItems].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||String(a.name).localeCompare(String(b.name),'vi')) }));
}
export function getDisplayPrice(item) { return { single: formatPrice(item.price_single), m: formatPrice(item.price_m), l: formatPrice(item.price_l) }; }
