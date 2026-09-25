require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretstreamallkey';

app.use(cors());
app.use(express.json());

// Setup Data directory
const DATA_DIR = path.join(__dirname, '..', 'Data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Setup Multer for huge file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const category = req.body.category || 'Misc';
    const uploadDir = path.join(DATA_DIR, category);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query.token) token = req.query.token;
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
};

// --- Routes ---

// Setup initial admin if no users exist
app.post('/api/setup', async (req, res) => {
  const count = await prisma.user.count();
  if (count > 0) return res.status(400).json({ error: 'Setup already complete' });
  
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashedPassword, isAdmin: true }
  });
  
  // Create default categories
  await prisma.category.createMany({
    data: [{ name: 'Movies' }, { name: 'Series' }, { name: 'Courses' }]
  });

  res.json({ message: 'Admin and categories created successfully' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
});

// Create Viewer Account (Admin only)
app.post('/api/users', authenticateToken, isAdmin, async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword, isAdmin: false }
    });
    res.json({ message: 'User created successfully', username: user.username });
  } catch (err) {
    res.status(400).json({ error: 'Username might already exist or invalid input' });
  }
});

// Get all Viewer Accounts (Admin only)
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    select: { id: true, username: true, createdAt: true }
  });
  res.json(users);
});

// Delete a Viewer Account (Admin only)
app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete' });
  }
});

// Get Categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  const categories = await prisma.category.findMany();
  res.json(categories);
});

// List Media by Category
app.get('/api/media', authenticateToken, async (req, res) => {
  const { categoryId } = req.query;
  const media = await prisma.media.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true }
  });
  res.json(media);
});

// Get Media Details with Items
app.get('/api/media/:id', authenticateToken, async (req, res) => {
  const media = await prisma.media.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { order: 'asc' } } }
  });
  res.json(media);
});

// Create Media (Admin)
app.post('/api/media', authenticateToken, isAdmin, async (req, res) => {
  const { title, description, categoryId, coverImage } = req.body;
  const media = await prisma.media.create({
    data: { title, description, categoryId, coverImage }
  });
  res.json(media);
});

// Upload Video/Subtitle and Create MediaItem (Admin)
app.post('/api/media/:mediaId/items', authenticateToken, isAdmin, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'subtitle', maxCount: 1 }]), async (req, res) => {
  const { title, type, textContent, order } = req.body;
  const videoPath = req.files['video'] ? req.files['video'][0].path : null;
  const subtitlePath = req.files['subtitle'] ? req.files['subtitle'][0].path : null;

  const item = await prisma.mediaItem.create({
    data: {
      mediaId: req.params.mediaId,
      title,
      type, // 'VIDEO' or 'TEXT'
      videoPath,
      subtitlePath,
      textContent,
      order: parseInt(order) || 0
    }
  });
  res.json(item);
});

// Video Streaming Endpoint with Range Support
app.get('/api/stream/:itemId', authenticateToken, async (req, res) => {
  const item = await prisma.mediaItem.findUnique({ where: { id: req.params.itemId } });
  if (!item || !item.videoPath || !fs.existsSync(item.videoPath)) {
    return res.status(404).send('Video not found');
  }

  const videoPath = item.videoPath;
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    // Chunk size: 5MB minimum to allow fast seeking, but can be larger
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4', // Could map dynamically based on extension
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Serve Subtitles
app.get('/api/subtitles/:itemId', authenticateToken, async (req, res) => {
  const item = await prisma.mediaItem.findUnique({ where: { id: req.params.itemId } });
  if (!item || !item.subtitlePath || !fs.existsSync(item.subtitlePath)) {
    return res.status(404).send('Subtitle not found');
  }
  res.sendFile(item.subtitlePath);
});

// Progress Tracking
app.post('/api/progress/:itemId', authenticateToken, async (req, res) => {
  const { timestamp, completed } = req.body;
  const progress = await prisma.progress.upsert({
    where: {
      userId_mediaItemId: {
        userId: req.user.id,
        mediaItemId: req.params.itemId
      }
    },
    update: { timestamp, completed },
    create: {
      userId: req.user.id,
      mediaItemId: req.params.itemId,
      timestamp,
      completed
    }
  });
  res.json(progress);
});

app.get('/api/progress/:itemId', authenticateToken, async (req, res) => {
  const progress = await prisma.progress.findUnique({
    where: {
      userId_mediaItemId: {
        userId: req.user.id,
        mediaItemId: req.params.itemId
      }
    }
  });
  res.json(progress || { timestamp: 0, completed: false });
});

// Check if setup is needed
app.get('/api/status', async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ setupNeeded: count === 0 });
  } catch (error) {
    res.json({ setupNeeded: true });
  }
});

// Serve Frontend (if built)
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Stream All Server running on port ${PORT}`);
});
