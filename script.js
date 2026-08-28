import { getDisplayPrice } from './menu-utils.mjs';
const cfg=window.CHANTEA_CONFIG;
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
const menu=document.querySelector('#menu'), status=document.querySelector('#status'), nav=document.querySelector('#categoryNav');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'danh-muc';
function imageUrl(path){if(!path)return '';if(/^https?:\/\//i.test(path))return path;return db.storage.from(cfg.imageBucket).getPublicUrl(path).data.publicUrl}
function card(item){
  const p=getDisplayPrice(item);
  const prices=p.single?`<strong class="single-price">${p.single}</strong>`:`<span>M <strong>${p.m||'—'}</strong></span><span>L <strong>${p.l||'—'}</strong></span>`;
  const img=imageUrl(item.image_path);
  return `<article class="menu-card ${item.available?'':'sold-out'}"><div class="food-image">${img?`<img src="${esc(img)}" alt="${esc(item.name)}" loading="lazy" referrerpolicy="no-referrer">`:'<div class="no-image">CHAN TEA</div>'}</div><div class="food-info"><h3>${esc(item.name)}</h3>${item.available?`<div class="prices">${prices}</div>`:'<span class="sold-badge">HẾT HÀNG</span>'}</div></article>`;
}
function renderNav(groups){
  nav.innerHTML=groups.map((g,i)=>`<button class="category-tab ${i===0?'active':''}" data-target="cat-${slug(g.name)}">${esc(g.name)}</button>`).join('');
  nav.classList.remove('hidden');
  nav.querySelectorAll('.category-tab').forEach(btn=>btn.addEventListener('click',()=>{
    nav.querySelectorAll('.category-tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
}
async function load(){
  status.textContent='Đang tải menu...';
  const [{data:cats,error:catError},{data:items,error:itemError}]=await Promise.all([
    db.from('menu_categories').select('*').order('sort_order').order('id'),
    db.from('menu_items').select('*').order('sort_order').order('id')
  ]);
  if(catError||itemError){status.textContent='Không tải được menu. Vui lòng thử lại.';return}
  if(!items?.length){status.textContent='Menu đang được cập nhật.';return}
  const fallbackNames=[...new Set(items.map(i=>i.category))];
  const names=(cats?.length?cats.map(c=>c.name):fallbackNames).filter(name=>items.some(i=>i.category===name));
  const groups=names.map(name=>({name,items:items.filter(i=>i.category===name)}));
  status.classList.add('hidden');
  renderNav(groups);
  menu.innerHTML=groups.map(g=>`<section class="category" id="cat-${slug(g.name)}"><h2>${esc(g.name)}</h2><div class="category-items">${g.items.map(card).join('')}</div></section>`).join('');
}
load();
