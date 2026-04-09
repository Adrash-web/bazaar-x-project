// ============================================================
//  BAZAARX — Backend Server (Node.js + Express)
//  Run:  node server.js
//  API Base URL: http://localhost:3000/api
// ============================================================

const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bazaarx_super_secret_key_change_in_production';

// ─── In-memory database (replace with MongoDB/PostgreSQL in production) ───────
let DB = {
  users:     [],   // { id, name, email, phone, passwordHash, createdAt }
  products:  [],   // { id, name, price, category, desc, location, image, sellerId, sellerName, sellerPhone, createdAt }
  wishlists: {},   // { userId: [productId, ...] }
};

// ─── Ensure uploads directory exists ─────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Serve frontend static files ──────────────────────────────────────────────
app.use(express.static(__dirname));          // serves index.html, style.css, script.js
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── File Upload (Multer) ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only image files are allowed.'));
  },
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function authRequired(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'Access token required.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function findUser(id)  { return DB.users.find(u => u.id === id); }
function findProduct(id) { return DB.products.find(p => p.id === id); }

// ─── Seed demo data ───────────────────────────────────────────────────────────
async function seedDemo() {
  const hash = await bcrypt.hash('demo123', 10);
  DB.products = [];   // 🔥 old products delete
  DB.users = [];      // 🔥 old users delete
  const demoUser = {
    id: 'demo_seller',
    name: 'Adarsh Mishra',
    email: 'adarsh@demo.com',
    phone: '+919695219041 ',
    passwordHash: hash,
    createdAt: Date.now() - 86400000,
  };
  DB.users.push(demoUser);
  const demoProducts = [
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



  demoProducts.forEach((d, i) => {
    DB.products.push({
      id: uuidv4(),
      ...d,
      
      sellerId:    demoUser.id,
      sellerName:  demoUser.name,
      sellerPhone: demoUser.phone,
      createdAt:   Date.now() - (i * 3_600_000),
    });
  });

  console.log('✅ Demo data seeded. Login: adarsh@demo.com / demo123');
}

// =====================================================================
//  ROUTES
// =====================================================================

// ── Health check ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BazaarX API is running 🚀', timestamp: new Date() });
});

// ─────────────────────────────────────────────────────────────────────
//  AUTH ROUTES
// ─────────────────────────────────────────────────────────────────────

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required.' });

    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address.' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    if (DB.users.find(u => u.email === email.toLowerCase()))
      return res.status(409).json({ error: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      passwordHash,
      createdAt: Date.now(),
    };

    DB.users.push(user);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: safeUser(user), token });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = DB.users.find(u => u.email === email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: safeUser(user), token });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /api/auth/me  — get current user profile
app.get('/api/auth/me', authRequired, (req, res) => {
  const user = findUser(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: safeUser(user) });
});

// ─────────────────────────────────────────────────────────────────────
//  PRODUCT ROUTES
// ─────────────────────────────────────────────────────────────────────

// GET /api/products  — list with search & category filter
app.get('/api/products', optionalAuth, (req, res) => {
  const { search = '', category = 'all', page = 1, limit = 20 } = req.query;
  let results = [...DB.products].reverse(); // newest first

  if (category !== 'all')
    results = results.filter(p => p.category === category);

  if (search.trim())
    results = results.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );

  const total      = results.length;
  const pageNum    = Math.max(1, parseInt(page));
  const limitNum   = Math.min(50, parseInt(limit));
  const paginated  = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({
    products: paginated,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

// GET /api/products/:id  — single product
app.get('/api/products/:id', (req, res) => {
  const product = findProduct(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product });
});

// POST /api/products  — create product (auth required)
app.post('/api/products', authRequired, upload.single('image'), (req, res) => {
  try {
    const { name, price, category, desc, location } = req.body;

    if (!name || !price || !category || !desc)
      return res.status(400).json({ error: 'Name, price, category, and description are required.' });

    if (isNaN(price) || Number(price) <= 0)
      return res.status(400).json({ error: 'Price must be a positive number.' });

    const seller = findUser(req.user.id);
    if (!seller) return res.status(404).json({ error: 'Seller not found.' });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const product = {
      id:          uuidv4(),
      name:        name.trim(),
      price:       Number(price),
      category:    category.trim(),
      desc:        desc.trim(),
      location:    (location || 'India').trim(),
      image:       imageUrl,
      sellerId:    seller.id,
      sellerName:  seller.name,
      sellerPhone: seller.phone || '',
      createdAt:   Date.now(),
    };

    DB.products.push(product);
    res.status(201).json({ product });

  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// PUT /api/products/:id  — update product (owner only)
app.put('/api/products/:id', authRequired, upload.single('image'), (req, res) => {
  const product = findProduct(req.params.id);
  if (!product)                         return res.status(404).json({ error: 'Product not found.' });
  if (product.sellerId !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });

  const { name, price, category, desc, location } = req.body;

  if (name)     product.name     = name.trim();
  if (price)    product.price    = Number(price);
  if (category) product.category = category.trim();
  if (desc)     product.desc     = desc.trim();
  if (location) product.location = location.trim();
  if (req.file) {
    // Delete old image file if exists
    if (product.image) {
      const oldPath = path.join(__dirname, product.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    product.image = `/uploads/${req.file.filename}`;
  }

  res.json({ product });
});

// DELETE /api/products/:id  — delete product (owner only)
app.delete('/api/products/:id', authRequired, (req, res) => {
  const idx = DB.products.findIndex(p => p.id === req.params.id);
  if (idx === -1)                              return res.status(404).json({ error: 'Product not found.' });
  if (DB.products[idx].sellerId !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });

  // Delete uploaded image
  const imageUrl = DB.products[idx].image;
  if (imageUrl) {
    const filePath = path.join(__dirname, imageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  DB.products.splice(idx, 1);
  res.json({ message: 'Product deleted successfully.' });
});

// GET /api/products/user/mine  — get current user's listings
app.get('/api/products/user/mine', authRequired, (req, res) => {
  const myProducts = DB.products.filter(p => p.sellerId === req.user.id).reverse();
  res.json({ products: myProducts, total: myProducts.length });
});

// ─────────────────────────────────────────────────────────────────────
//  WISHLIST ROUTES
// ─────────────────────────────────────────────────────────────────────

// GET /api/wishlist  — get user's wishlist
app.get('/api/wishlist', authRequired, (req, res) => {
  const ids      = DB.wishlists[req.user.id] || [];
  const products = ids.map(id => findProduct(id)).filter(Boolean);
  res.json({ products, total: products.length });
});

// POST /api/wishlist/:productId  — add to wishlist
app.post('/api/wishlist/:productId', authRequired, (req, res) => {
  const { productId } = req.params;
  if (!findProduct(productId)) return res.status(404).json({ error: 'Product not found.' });

  if (!DB.wishlists[req.user.id]) DB.wishlists[req.user.id] = [];
  if (!DB.wishlists[req.user.id].includes(productId)) {
    DB.wishlists[req.user.id].push(productId);
  }
  res.json({ message: 'Added to wishlist.', wishlist: DB.wishlists[req.user.id] });
});

// DELETE /api/wishlist/:productId  — remove from wishlist
app.delete('/api/wishlist/:productId', authRequired, (req, res) => {
  const { productId } = req.params;
  if (!DB.wishlists[req.user.id]) DB.wishlists[req.user.id] = [];
  DB.wishlists[req.user.id] = DB.wishlists[req.user.id].filter(id => id !== productId);
  res.json({ message: 'Removed from wishlist.', wishlist: DB.wishlists[req.user.id] });
});

// ─────────────────────────────────────────────────────────────────────
//  CATEGORIES
// ─────────────────────────────────────────────────────────────────────

// GET /api/categories  — list categories with product counts
app.get('/api/categories', (req, res) => {
  const cats = ['electronics','fashion','furniture','vehicles','books','sports','other'];
  const result = cats.map(cat => ({
    name:  cat,
    count: DB.products.filter(p => p.category === cat).length,
  }));
  res.json({ categories: result });
});

// ─────────────────────────────────────────────────────────────────────
//  ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────

// Multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be under 5MB.' });
    return res.status(400).json({ error: err.message });
  }
  if (err.message === 'Only image files are allowed.')
    return res.status(400).json({ error: err.message });

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─────────────────────────────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────────────────────────────
seedDemo().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 BazaarX server running at http://localhost:${PORT}`);
    console.log(`📦 API base:      http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend:      http://localhost:${PORT}/index.html`);
    console.log(`🖼️  Uploads dir:   ${UPLOADS_DIR}\n`);
  });
});
