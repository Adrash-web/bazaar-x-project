/* ============================
   BAZAARX - MAIN SCRIPT
   ============================ */

// ===== STATE =====
let currentUser = null;
let currentCategory = 'all';
let currentSearch = '';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  currentUser = JSON.parse(localStorage.getItem('bx_currentUser')) || null;
  updateNavAuth();
  renderProducts();
  updateWishBadge();

  // Live search
  document.getElementById('searchInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchProducts();
    currentSearch = e.target.value.trim().toLowerCase();
    renderProducts();
  });
});

// ===== DARK MODE =====
function toggleDark() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  const btn = document.getElementById('darkToggle');
  btn.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
  localStorage.setItem('bx_theme', isDark ? 'light' : 'dark');
}

// Restore theme
const savedTheme = localStorage.getItem('bx_theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'dark') {
    document.getElementById('darkToggle').innerHTML = '<i class="fas fa-sun"></i>';
  }
}

// ===== SECTION VISIBILITY =====
function showSection(id) {
  if (id === 'addProductSection' && !currentUser) {
    showToast('Please login to add a product');
    showSection('authSection');
    return;
  }
  document.getElementById(id).style.display = 'flex';
  if (id === 'wishlistSection') renderWishlist();
}

function hideSection(id) {
  document.getElementById(id).style.display = 'none';
}

function scrollToProducts() {
  document.getElementById('mainContent').scrollIntoView({ behavior: 'smooth' });
}

// ===== AUTH =====
function getUsers() {
  return JSON.parse(localStorage.getItem('bx_users')) || [];
}

function saveUsers(users) {
  localStorage.setItem('bx_users', JSON.stringify(users));
}

function switchAuth(mode) {
  const isLogin = mode === 'login';
  document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('signupForm').style.display = isLogin ? 'none' : 'block';
  document.getElementById('authTitle').textContent = isLogin ? 'Welcome Back' : 'Create Account';
  document.getElementById('loginTab').classList.toggle('active', isLogin);
  document.getElementById('signupTab').classList.toggle('active', !isLogin);
  clearErrors();
}

function signup() {
  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim().toLowerCase();
  const phone    = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPassword').value;
  const errEl    = document.getElementById('signupError');

  if (!name || !email || !password) return setError(errEl, 'Please fill all required fields.');
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return setError(errEl, 'Invalid email address.');
  if (password.length < 6) return setError(errEl, 'Password must be at least 6 characters.');

  const users = getUsers();
  if (users.find(u => u.email === email)) return setError(errEl, 'Email already registered. Please login.');

  const user = { id: uid(), name, email, phone, password, createdAt: Date.now() };
  users.push(user);
  saveUsers(users);
  loginUser(user);
}

function login() {
  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');

  if (!email || !password) return setError(errEl, 'Please enter email and password.');

  const users = getUsers();
  const user  = users.find(u => u.email === email && u.password === password);
  if (!user) return setError(errEl, 'Invalid email or password.');

  loginUser(user);
}

function loginUser(user) {
  currentUser = user;
  localStorage.setItem('bx_currentUser', JSON.stringify(user));
  updateNavAuth();
  hideSection('authSection');
  showToast(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
  renderProducts();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('bx_currentUser');
  updateNavAuth();
  showToast('Logged out successfully.');
  renderProducts();
}

function updateNavAuth() {
  const navAuth = document.getElementById('navAuth');
  const navUser = document.getElementById('navUser');
  if (currentUser) {
    navAuth.style.display = 'none';
    navUser.style.display = 'flex';
    navUser.style.alignItems = 'center';
    navUser.style.gap = '10px';
    document.getElementById('greetUser').textContent = `Hi, ${currentUser.name.split(' ')[0]}`;
  } else {
    navAuth.style.display = 'flex';
    navAuth.style.gap = '10px';
    navUser.style.display = 'none';
  }
}

// ===== PRODUCTS =====
function getProducts() {
  return JSON.parse(localStorage.getItem('bx_products')) || [];
}

function saveProducts(products) {
  localStorage.setItem('bx_products', JSON.stringify(products));
}

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('imagePreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('uploadArea').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function addProduct() {
  if (!currentUser) { showSection('authSection'); return; }

  const name     = document.getElementById('prodName').value.trim();
  const price    = document.getElementById('prodPrice').value.trim();
  const category = document.getElementById('prodCategory').value;
  const desc     = document.getElementById('prodDesc').value.trim();
  const location = document.getElementById('prodLocation').value.trim();
  const imageEl  = document.getElementById('prodImage');
  const errEl    = document.getElementById('productError');

  if (!name || !price || !category || !desc) return setError(errEl, 'Please fill all required fields.');
  if (isNaN(price) || Number(price) <= 0)    return setError(errEl, 'Enter a valid price.');

  const file = imageEl.files[0];
  const finalize = (imageData) => {
    const product = {
      id: uid(),
      name,
      price: Number(price),
      category,
      desc,
      location: location || 'India',
      image: imageData,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      sellerPhone: currentUser.phone || 'Not provided',
      createdAt: Date.now()
    };

    const products = getProducts();
    products.unshift(product);
    saveProducts(products);

    hideSection('addProductSection');
    resetProductForm();
    renderProducts();
    showToast('🎉 Product listed successfully!');
    scrollToProducts();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => finalize(e.target.result);
    reader.readAsDataURL(file);
  } else {
    finalize('');
  }
}

function resetProductForm() {
  ['prodName','prodPrice','prodDesc','prodLocation'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('prodCategory').value = '';
  document.getElementById('productError').textContent = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('uploadArea').style.display = 'block';
  document.getElementById('prodImage').value = '';
}

function deleteProduct(id, event) {
  event.stopPropagation();
  if (!confirm('Delete this listing?')) return;
  let products = getProducts();
  products = products.filter(p => p.id !== id);
  saveProducts(products);
  renderProducts();
  showToast('Product deleted.');
}

// ===== SEARCH & FILTER =====
function searchProducts() {
  currentSearch = document.getElementById('searchInput').value.trim().toLowerCase();
  renderProducts();
}

function filterCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderProducts();
}

function getFilteredProducts() {
  let products = getProducts();
  if (currentCategory !== 'all') products = products.filter(p => p.category === currentCategory);
  if (currentSearch) products = products.filter(p =>
    p.name.toLowerCase().includes(currentSearch) ||
    p.desc.toLowerCase().includes(currentSearch) ||
    p.category.toLowerCase().includes(currentSearch)
  );
  return products;
}

// ===== RENDER =====
function renderProducts() {
  const grid     = document.getElementById('productsGrid');
  const empty    = document.getElementById('emptyState');
  const countEl  = document.getElementById('productCount');
  const products = getFilteredProducts();

  countEl.textContent = `${products.length} item${products.length !== 1 ? 's' : ''}`;

  if (products.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = products.map((p, i) => productCard(p, i)).join('');
}

function productCard(p, index) {
  const isOwner   = currentUser && currentUser.id === p.sellerId;
  const wishlist  = getWishlist();
  const isWished  = wishlist.includes(p.id);
  const delay     = Math.min(index * 0.05, 0.5);
  const catEmoji  = catIcon(p.category);
  console.log(p.image);
  const imgHtml = `
  <img src="${p.image}"
       alt="${esc(p.name)}"
       class="product-img" />
  `;
  // const imgHtml   = p.image
  //   ? `<img src="${p.image}" alt="${esc(p.name)}" loading="lazy"/>`
     `<div class="card-img-placeholder">${catEmoji}<span>No image</span></div>`;

  return `
  <div class="product-card" onclick="openDetail('${p.id}')" style="animation-delay:${delay}s">
    <div class="card-img-wrap">
      ${imgHtml}
      <span class="cat-tag">${p.category}</span>
      <button class="wish-btn ${isWished ? 'liked' : ''}"
        onclick="toggleWish('${p.id}', event)"
        title="${isWished ? 'Remove from wishlist' : 'Add to wishlist'}">
        <i class="fa${isWished ? 's' : 'r'} fa-heart"></i>
      </button>
    </div>
    <div class="card-body">
      <div class="card-title">${esc(p.name)}</div>
      <div class="card-price">₹${formatPrice(p.price)}</div>
      <div class="card-desc">${esc(p.desc)}</div>
      <div class="card-meta">
        <span class="card-seller"><i class="fas fa-user-circle"></i>${esc(p.sellerName)}</span>
        <span class="card-location"><i class="fas fa-map-marker-alt"></i>${esc(p.location)}</span>
      </div>
      <div class="card-actions">
        <button class="btn-contact small" onclick="contactSeller('${p.id}', event)">
          <i class="fas fa-phone-alt"></i> Contact
        </button>
        ${isOwner ? `<button class="btn-danger small" onclick="deleteProduct('${p.id}', event)">
          <i class="fas fa-trash"></i> Delete
        </button>` : ''}
      </div>
    </div>
  </div>`;
}

// ===== PRODUCT DETAIL =====
function openDetail(id) {
  const products = getProducts();
  const p        = products.find(x => x.id === id);
  if (!p) return;

  const isOwner  = currentUser && currentUser.id === p.sellerId;
  const wishlist = getWishlist();
  const isWished = wishlist.includes(p.id);
  const imgHtml  = p.image
    ? `<img src="${p.image}" alt="${esc(p.name)}"/>`
    : `<div class="card-img-placeholder" style="height:100%;font-size:4rem">${catIcon(p.category)}</div>`;

  document.getElementById('detailContent').innerHTML = `
  <div class="detail-grid">
    <div class="detail-img">${imgHtml}</div>
    <div class="detail-info">
      <h2>${esc(p.name)}</h2>
      <div class="detail-price">₹${formatPrice(p.price)}</div>
      <div class="detail-desc">${esc(p.desc)}</div>
      <div class="detail-meta">
        <div class="meta-row"><i class="fas fa-tag"></i><span>${p.category}</span></div>
        <div class="meta-row"><i class="fas fa-user"></i><span>${esc(p.sellerName)}</span></div>
        <div class="meta-row"><i class="fas fa-phone"></i><span>${esc(p.sellerPhone)}</span></div>
        <div class="meta-row"><i class="fas fa-map-marker-alt"></i><span>${esc(p.location)}</span></div>
        <div class="meta-row"><i class="fas fa-clock"></i><span>${timeAgo(p.createdAt)}</span></div>
      </div>
      <div class="detail-actions">
        <button class="btn-primary" onclick="contactSeller('${p.id}', event)">
          <i class="fas fa-phone-alt"></i> Contact Seller
        </button>
        <button class="btn-outline ${isWished ? 'liked' : ''}" onclick="toggleWish('${p.id}', event); updateDetailWishBtn('${p.id}', this)">
          <i class="fa${isWished ? 's' : 'r'} fa-heart"></i> ${isWished ? 'Saved' : 'Wishlist'}
        </button>
        ${isOwner ? `<button class="btn-danger" onclick="deleteProduct('${p.id}', event); hideSection('productDetail')">
          <i class="fas fa-trash"></i> Delete
        </button>` : ''}
      </div>
    </div>
  </div>`;

  showSection('productDetail');
}

function updateDetailWishBtn(id, btn) {
  const wishlist = getWishlist();
  const isWished = wishlist.includes(id);
  btn.innerHTML = `<i class="fa${isWished ? 's' : 'r'} fa-heart"></i> ${isWished ? 'Saved' : 'Wishlist'}`;
}

// ===== CONTACT =====
function contactSeller(id, event) {
  event.stopPropagation();
  const products = getProducts();
  const p        = products.find(x => x.id === id);
  if (!p) return;
  alert(`📞 Contact Seller\n\nName: ${p.sellerName}\nPhone: ${p.sellerPhone || 'Not provided'}\nLocation: ${p.location}\n\nThis is a demo app. In a real app, you'd open a chat or call feature here.`);
}

// ===== WISHLIST =====
function getWishlist() {
  const key = currentUser ? `bx_wish_${currentUser.id}` : 'bx_wish_guest';
  return JSON.parse(localStorage.getItem(key)) || [];
}

function saveWishlist(list) {
  const key = currentUser ? `bx_wish_${currentUser.id}` : 'bx_wish_guest';
  localStorage.setItem(key, JSON.stringify(list));
}

function toggleWish(id, event) {
  event.stopPropagation();
  let wishlist = getWishlist();
  const idx    = wishlist.indexOf(id);
  if (idx === -1) {
    wishlist.push(id);
    showToast('❤️ Added to wishlist');
  } else {
    wishlist.splice(idx, 1);
    showToast('Removed from wishlist');
  }
  saveWishlist(wishlist);
  updateWishBadge();
  renderProducts();
}

function updateWishBadge() {
  const count = getWishlist().length;
  document.getElementById('wishBadge').textContent = count;
  document.getElementById('wishBadge').style.display = count > 0 ? 'flex' : 'none';
}

function renderWishlist() {
  const wishlist = getWishlist();
  const products = getProducts().filter(p => wishlist.includes(p.id));
  const grid     = document.getElementById('wishlistGrid');
  const empty    = document.getElementById('wishlistEmpty');

  if (products.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = products.map((p, i) => productCard(p, i)).join('');
  }
}

// ===== UTILITIES =====
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatPrice(num) {
  return Number(num).toLocaleString('en-IN');
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function catIcon(cat) {
  const icons = {
    electronics: '📱', fashion: '👗', furniture: '🛋️',
    vehicles: '🚗', books: '📚', sports: '⚽', other: '📦'
  };
  return icons[cat] || '📦';
}

function setError(el, msg) {
  el.textContent = msg;
}

function clearErrors() {
  ['loginError','signupError','productError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
});

// ===== SEED DEMO DATA =====
(function seedDemo() {
  if (getProducts().length > 0) return; // Already has data

  const demoUser = {
    id: 'demo_seller', name: 'Adarsh Mishra', email: 'adarsh@demo.com',
    phone: '+91 9695219041', password: 'demo123', createdAt: Date.now() - 86400000
  };
  const users = getUsers();
  if (!users.find(u => u.id === 'demo_seller')) {
    users.push(demoUser);
    saveUsers(users);
  }
  const demos = [

  { name: 'iPhone 13 Pro Max 256GB', price: 72000, category: 'electronics', desc: 'Barely used. All accessories included.', location: 'Mumbai',image: 'http://localhost:3000/uploads/iphone.jpg' },
  { name: 'Samsung Galaxy S21', price: 40000, category: 'electronics', desc: 'Good condition, no scratches.', location: 'Delhi', image: 'http://localhost:3000/uploads/samsung.jpg' },
  { name: 'Sony WH-1000XM5 Headphones', price: 25000, category: 'electronics', desc: 'Noise cancelling, excellent sound.', location: 'Bangalore', image: 'http://localhost:3000/uploads/electronics.jpg' },
  { name: 'Dell Laptop i5 11th Gen', price: 50000, category: 'electronics', desc: 'Smooth performance, 8GB RAM.', location: 'Pune', image: 'http://localhost:3000/uploads/dell.jpg' },

  { name: "Vintage Levi's 501 Jeans", price: 1800, category: 'fashion', desc: 'Original vintage Levi’s.', location: 'Bangalore', image: 'http://localhost:3000/uploads/levis.jpg' },
  { name: 'Nike Air Max Shoes', price: 3500, category: 'fashion', desc: 'Comfortable and stylish.', location: 'Pune', image: 'http://localhost:3000/uploads/nike.jpg' },
  { name: 'Puma Hoodie', price: 1200, category: 'fashion', desc: 'Warm and trendy.', location: 'Delhi', image: 'http://localhost:3000/uploads/puma.jpg' },
  { name: 'Adidas Track Pants', price: 1500, category: 'fashion', desc: 'Lightweight and sporty.', location: 'Mumbai', image: 'http://localhost:3000/uploads/adidas.jpg' },

  { name: 'IKEA MALM Bed Frame', price: 8500, category: 'furniture', desc: 'King size, good condition.', location: 'Delhi', image: 'http://localhost:3000/uploads/bed.jpg' },
  { name: 'Wooden Study Table', price: 3000, category: 'furniture', desc: 'Strong and durable.', location: 'Lucknow', image: 'http://localhost:3000/uploads/table.jpg' },
  { name: 'Office Chair', price: 2500, category: 'furniture', desc: 'Comfortable for long work.', location: 'Chennai', image: 'http://localhost:3000/uploads/chair.jpg' },

  { name: 'Honda Activa 6G', price: 62000, category: 'vehicles', desc: 'Single owner, low km.', location: 'Pune', image: 'http://localhost:3000/uploads/activa.jpg' },
  { name: 'Royal Enfield Classic 350', price: 150000, category: 'vehicles', desc: 'Excellent condition.', location: 'Chandigarh', image: 'http://localhost:3000/uploads/royalEnfield.jpg' },

  { name: 'Atomic Habits', price: 350, category: 'books', desc: 'Must read self-help book.', location: 'Hyderabad', image: 'http://localhost:3000/uploads/book.jpg' },
  { name: 'Rich Dad Poor Dad', price: 250, category: 'books', desc: 'Finance learning book.', location: 'Chennai', image: 'http://localhost:3000/uploads/book1.jpg' },

  { name: 'Spalding NBA Basketball', price: 2200, category: 'sports', desc: 'Official size 7.', location: 'Kolkata', image: 'http://localhost:3000//uploads/basketball.jpg' }

];

  

  const products = demos.map((d, i) => ({
    id: uid(),
    ...d,
    
    sellerId: 'demo_seller',
    sellerName: demoUser.name,
    sellerPhone: demoUser.phone,
    createdAt: Date.now() - (i * 3600000)
  }));

  saveProducts(products);
})();
