import { formatPrice } from './menu-utils.mjs';
import { itemsForCategory, nextSortOrder } from './admin-utils.mjs';
const cfg=window.CHANTEA_CONFIG;
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
const $=s=>document.querySelector(s), authCard=$('#authCard'), manager=$('#manager'), logoutBtn=$('#logoutBtn'), list=$('#adminList');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isExternal=p=>/^https?:\/\//i.test(p||'');
function publicUrl(path){if(!path)return '';if(isExternal(path))return path;return db.storage.from(cfg.imageBucket).getPublicUrl(path).data.publicUrl}
let categories=[],items=[],activeCategory='';
function setAuth(on){authCard.classList.toggle('hidden',on);manager.classList.toggle('hidden',!on);logoutBtn.classList.toggle('hidden',!on);if(on)loadAll()}
async function refreshSession(){const {data:{session}}=await db.auth.getSession();setAuth(!!session)}
$('#loginBtn').onclick=async()=>{const email=$('#email').value.trim(),password=$('#password').value;$('#authMsg').textContent='Đang đăng nhập...';const {error}=await db.auth.signInWithPassword({email,password});if(error){$('#authMsg').textContent=error.message;return}$('#authMsg').textContent='';setAuth(true)};
$('#signupBtn').onclick=async()=>{const email=$('#email').value.trim(),password=$('#password').value;if(password.length<6){$('#authMsg').textContent='Mật khẩu cần ít nhất 6 ký tự.';return}const {data,error}=await db.auth.signUp({email,password});$('#authMsg').textContent=error?error.message:(data.session?'Tạo tài khoản thành công.':'Đã tạo tài khoản. Kiểm tra email xác nhận rồi đăng nhập.');if(data.session)setAuth(true)};
logoutBtn.onclick=async()=>{await db.auth.signOut();setAuth(false)};
async function loadAll(){
  $('#adminStatus').textContent='Đang tải...';
  const [{data:cats,error:catError},{data:rows,error:itemError}]=await Promise.all([
    db.from('menu_categories').select('*').order('sort_order').order('id'),
    db.from('menu_items').select('*').order('sort_order').order('id')
  ]);
  if(catError||itemError){$('#adminStatus').textContent='Không tải được dữ liệu.';return}
  categories=cats||[];items=rows||[];
  if(!activeCategory||!categories.some(c=>c.name===activeCategory))activeCategory=categories[0]?.name||'';
  $('#adminStatus').textContent=`${items.length} món · ${categories.length} mục`;
  renderCategories();renderItems();fillCategorySelect();
}
function renderCategories(){
  const wrap=$('#adminCategoryTabs');
  wrap.innerHTML=categories.map(c=>{const count=items.filter(i=>i.category===c.name).length;return `<button class="admin-category-tab ${c.name===activeCategory?'active':''}" data-name="${esc(c.name)}">${esc(c.name)} <span>${count}</span></button>`}).join('');
  wrap.querySelectorAll('.admin-category-tab').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.name;renderCategories();renderItems();fillCategorySelect()});
  $('#activeCategoryTitle').textContent=activeCategory||'Chưa có mục';
  $('#renameCategoryBtn').disabled=!activeCategory;
  $('#deleteCategoryBtn').disabled=!activeCategory;
}
function renderItems(){
  if(!activeCategory){list.innerHTML='<div class="empty-state">Hãy tạo mục đầu tiên.</div>';return}
  const rows=itemsForCategory(items,activeCategory);
  list.innerHTML=rows.length?rows.map(i=>{const img=publicUrl(i.image_path);const price=i.price_single?formatPrice(i.price_single):`M ${formatPrice(i.price_m)||'—'} · L ${formatPrice(i.price_l)||'—'}`;return `<article class="admin-item"><div class="admin-thumb">${img?`<img src="${esc(img)}" alt="" referrerpolicy="no-referrer">`:'<span>Ảnh</span>'}</div><div class="admin-item-info"><strong>${esc(i.name)}</strong><span>${price} · ${i.available?'Còn hàng':'Hết hàng'}</span></div><div class="admin-actions"><button class="secondary edit" data-id="${i.id}">Sửa</button><button class="danger del" data-id="${i.id}">Xóa</button></div></article>`}).join(''):'<div class="empty-state">Mục này chưa có món.</div>';
  list.querySelectorAll('.edit').forEach(b=>b.onclick=()=>editItem(items.find(i=>i.id==b.dataset.id)));
  list.querySelectorAll('.del').forEach(b=>b.onclick=()=>deleteItem(items.find(i=>i.id==b.dataset.id)));
}
function fillCategorySelect(){const s=$('#category');s.innerHTML=categories.map(c=>`<option value="${esc(c.name)}" ${c.name===activeCategory?'selected':''}>${esc(c.name)}</option>`).join('')}
function openForm(){fillCategorySelect();$('#modal').classList.remove('hidden')}
function closeForm(){$('#modal').classList.add('hidden');$('#itemForm').reset();$('#available').checked=true;$('#itemId').value='';$('#oldImagePath').value='';$('#preview').classList.add('hidden');$('#formMsg').textContent=''}
$('#addBtn').onclick=()=>{if(!categories.length){alert('Hãy thêm mục trước.');return}$('#formTitle').textContent='Thêm món';openForm()};
$('#closeBtn').onclick=closeForm;$('#modal').onclick=e=>{if(e.target.id==='modal')closeForm()};
$('#image').onchange=e=>{const f=e.target.files[0];if(!f)return;const p=$('#preview');p.src=URL.createObjectURL(f);p.classList.remove('hidden')};
function editItem(i){$('#formTitle').textContent='Sửa món';$('#itemId').value=i.id;$('#oldImagePath').value=i.image_path||'';fillCategorySelect();$('#category').value=i.category;$('#name').value=i.name;$('#priceSingle').value=i.price_single??'';$('#priceM').value=i.price_m??'';$('#priceL').value=i.price_l??'';$('#available').checked=i.available;const u=publicUrl(i.image_path);if(u){$('#preview').src=u;$('#preview').classList.remove('hidden')}openForm()}
function n(v){return v===''?null:Number(v)}
async function uploadImage(file){if(!file)return null;if(file.size>5*1024*1024)throw new Error('Ảnh vượt quá 5 MB.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;const {error}=await db.storage.from(cfg.imageBucket).upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;return path}
$('#itemForm').onsubmit=async e=>{e.preventDefault();const msg=$('#formMsg'),btn=$('#saveBtn');btn.disabled=true;msg.textContent='Đang lưu...';let newPath=null;try{const ps=n($('#priceSingle').value),pm=n($('#priceM').value),pl=n($('#priceL').value);if(ps===null&&pm===null&&pl===null)throw new Error('Phải nhập ít nhất một giá.');const category=$('#category').value;newPath=await uploadImage($('#image').files[0]);const old=$('#oldImagePath').value;const id=$('#itemId').value;const current=id?items.find(i=>String(i.id)===String(id)):null;const row={category,name:$('#name').value.trim(),price_single:ps,price_m:pm,price_l:pl,available:$('#available').checked,sort_order:current?.sort_order??nextSortOrder(items,category),image_path:newPath||old||null};const q=id?db.from('menu_items').update(row).eq('id',id):db.from('menu_items').insert(row);const {error}=await q;if(error)throw error;if(newPath&&old&&!isExternal(old))await db.storage.from(cfg.imageBucket).remove([old]);activeCategory=category;closeForm();await loadAll()}catch(err){if(newPath)await db.storage.from(cfg.imageBucket).remove([newPath]);msg.textContent=err.message||'Không lưu được.'}finally{btn.disabled=false}};
async function deleteItem(i){if(!confirm(`Xóa món “${i.name}”?`))return;const {error}=await db.from('menu_items').delete().eq('id',i.id);if(error){alert('Không xóa được: '+error.message);return}if(i.image_path&&!isExternal(i.image_path))await db.storage.from(cfg.imageBucket).remove([i.image_path]);loadAll()}
function openCategoryForm(mode){$('#categoryFormTitle').textContent=mode==='rename'?'Đổi tên mục':'Thêm mục';$('#oldCategoryName').value=mode==='rename'?activeCategory:'';$('#categoryName').value=mode==='rename'?activeCategory:'';$('#categoryMsg').textContent='';$('#categoryModal').classList.remove('hidden');$('#categoryName').focus()}
function closeCategoryForm(){$('#categoryModal').classList.add('hidden');$('#categoryForm').reset();$('#categoryMsg').textContent=''}
$('#addCategoryBtn').onclick=()=>openCategoryForm('add');$('#renameCategoryBtn').onclick=()=>activeCategory&&openCategoryForm('rename');$('#closeCategoryBtn').onclick=closeCategoryForm;$('#categoryModal').onclick=e=>{if(e.target.id==='categoryModal')closeCategoryForm()};
$('#categoryForm').onsubmit=async e=>{e.preventDefault();const msg=$('#categoryMsg'),btn=$('#saveCategoryBtn'),name=$('#categoryName').value.trim(),old=$('#oldCategoryName').value;btn.disabled=true;msg.textContent='Đang lưu...';try{if(!name)throw new Error('Tên mục không được trống.');if(old){if(name!==old&&categories.some(c=>c.name.toLowerCase()===name.toLowerCase()))throw new Error('Tên mục đã tồn tại.');const cat=categories.find(c=>c.name===old);let {error}=await db.from('menu_categories').update({name}).eq('id',cat.id);if(error)throw error;({error}=await db.from('menu_items').update({category:name}).eq('category',old));if(error){await db.from('menu_categories').update({name:old}).eq('id',cat.id);throw error}activeCategory=name;}else{const sort=(categories.length?Math.max(...categories.map(c=>Number(c.sort_order)||0)):0)+1;const {error}=await db.from('menu_categories').insert({name,sort_order:sort});if(error)throw error;activeCategory=name}closeCategoryForm();await loadAll()}catch(err){msg.textContent=err.message||'Không lưu được mục.'}finally{btn.disabled=false}};
$('#deleteCategoryBtn').onclick=async()=>{if(!activeCategory)return;const count=items.filter(i=>i.category===activeCategory).length;if(count){alert(`Mục “${activeCategory}” còn ${count} món. Hãy chuyển hoặc xóa món trước.`);return}if(!confirm(`Xóa mục “${activeCategory}”?`))return;const cat=categories.find(c=>c.name===activeCategory);const {error}=await db.from('menu_categories').delete().eq('id',cat.id);if(error){alert('Không xóa được mục: '+error.message);return}activeCategory='';loadAll()};
db.auth.onAuthStateChange((_e,s)=>setAuth(!!s));refreshSession();
