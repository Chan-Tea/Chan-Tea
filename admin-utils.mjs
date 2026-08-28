export function itemsForCategory(items, category){return items.filter(i=>i.category===category).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||(a.id??0)-(b.id??0))}
export function nextSortOrder(items, category){const rows=items.filter(i=>i.category===category);return rows.length?Math.max(...rows.map(i=>Number(i.sort_order)||0))+1:1}
