require('dotenv').config({ path: require('path').join(__dirname, '.env') });
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
app.post('/api/media', authenticateToken, isAdmin, upload.single('coverImage'), async (req, res) => {
  const { title, description, categoryId } = req.body;
  const coverImage = req.file ? path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/') : null;
  const media = await prisma.media.create({
    data: { title, description, categoryId, coverImage }
  });
  res.json(media);
});

// Delete Media (Course/Movie)
app.delete('/api/media/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await prisma.media.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted successfully' });
  } catch (e) { res.status(500).send(e.message); }
});


// Edit MediaItem (Episode)
app.put('/api/media/:mediaId/items/:itemId', authenticateToken, isAdmin, async (req, res) => {
  const { title, textContent, order } = req.body;
  try {
    const item = await prisma.mediaItem.update({
      where: { id: req.params.itemId },
      data: { 
        title, 
        textContent, 
        order: parseInt(order) || 0 
      }
    });
    res.json(item);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// Delete MediaItem (Episode)
app.delete('/api/media/:mediaId/items/:itemId', authenticateToken, isAdmin, async (req, res) => {
  try {
    await prisma.mediaItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Deleted successfully' });
  } catch (e) { res.status(500).send(e.message); }
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

// Add Single Item by Server Path (no file copying)
app.post('/api/media/:mediaId/add-item', authenticateToken, isAdmin, async (req, res) => {
  const { title, type, videoPath, textContent } = req.body;
  try {
    const count = await prisma.mediaItem.count({ where: { mediaId: req.params.mediaId } });
    const item = await prisma.mediaItem.create({
      data: {
        mediaId: req.params.mediaId,
        title,
        type: type || 'VIDEO',
        videoPath: videoPath || null,
        textContent: textContent || null,
        order: count + 1
      }
    });
    res.json(item);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// Serve Uploaded Media (like cover images)
app.use('/Data', express.static(path.join(__dirname, '..', 'Data')));


// --- AI-POWERED SMART SCANNER ---

// Recursively build a folder tree as a text string for the AI
const buildFolderTree = (dirPath, prefix = '') => {
  let tree = '';
  const entries = fs.readdirSync(dirPath).sort();
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      tree += prefix + '📁 ' + entry + '/\n';
      tree += buildFolderTree(fullPath, prefix + '  ');
    } else {
      tree += prefix + '📄 ' + entry + '\n';
    }
  }
  return tree;
};

// Recursively collect ALL files with their full paths
const collectAllFiles = (dirPath) => {
  const results = [];
  const entries = fs.readdirSync(dirPath).sort();
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      results.push(...collectAllFiles(fullPath));
    } else {
      results.push({ filename: entry, filepath: fullPath, relativePath: path.relative(dirPath, fullPath) });
    }
  }
  return results;
};

// Scan Folder Route (AI-powered)
app.post('/api/scan', authenticateToken, isAdmin, async (req, res) => {
  const { folderPath } = req.body;
  if (!fs.existsSync(folderPath)) {
    return res.status(400).json({ error: 'Folder does not exist on Server PC.' });
  }

  try {
    const allFiles = collectAllFiles(folderPath);
    const folderTree = buildFolderTree(folderPath);
    let coverImagePath = null;
    let aiErrorMsg = null;

    // Detect cover image at root
    const rootFiles = fs.readdirSync(folderPath);
    for (const f of rootFiles) {
      if (f.match(/cover\.(jpg|jpeg|png|webp)$/i)) {
        coverImagePath = path.join(folderPath, f);
      }
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (GROQ_API_KEY) {
      // === AI-POWERED PARSING ===
      const prompt = `You are a course/media folder structure analyzer. I will give you a folder tree of a course or media collection. Your job is to organize the files into logical sections and episodes.

Rules:
- Only include video files (.mp4, .mkv, .webm, .avi) as episodes
- If a .txt, .md, or .html file has the same base name as a video, it is the "notes" for that video
- If a .srt or .vtt file has the same base name as a video, it is the "subtitle" for that video
- Ignore image files, they are covers
- Group videos into logical sections based on the folder structure
- Clean up episode titles: remove numbering prefixes like "001", "01 -", etc. Make them human readable
- Order episodes logically (by their numbering in the filename)

Return ONLY valid JSON in this exact format, nothing else:
{
  "sections": [
    {
      "sectionName": "Human readable section name",
      "items": [
        {
          "filename": "EXACT original filename of the video from the tree (including extension, do not alter this!)",
          "title": "Clean human-readable title",
          "notesFilename": "EXACT notes filename or null",
          "subtitleFilename": "EXACT subtitle filename or null"
        }
      ]
    }
  ]
}

Here is the folder tree:
${folderTree}`;

      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + GROQ_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 4096,
            response_format: { type: 'json_object' }
          })
        });

        const data = await response.json();
        if (data.error) {
          throw new Error('Groq API Error: ' + JSON.stringify(data.error));
        }
        const aiText = data.choices[0].message.content;
        
        // Extract JSON from the response (handle markdown code blocks)
        let jsonStr = aiText;
        const jsonMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1];
        
        const aiResult = JSON.parse(jsonStr.trim());
        
        // Map AI results back to actual file paths
        let globalOrder = 1;
        const sections = [];
        
        for (const aiSection of aiResult.sections) {
          const items = [];
          for (const aiItem of aiSection.items) {
            // Find the actual file by matching filename
            const fileEntry = allFiles.find(f => f.filename === aiItem.filename);
            if (!fileEntry) continue;

            let notes = '';
            let subtitlePath = null;

            if (aiItem.notesFilename) {
              const notesEntry = allFiles.find(f => f.filename === aiItem.notesFilename);
              if (notesEntry) {
                try { notes = fs.readFileSync(notesEntry.filepath, 'utf8'); } catch(e) {}
              }
            }

            if (aiItem.subtitleFilename) {
              const subEntry = allFiles.find(f => f.filename === aiItem.subtitleFilename);
              if (subEntry) subtitlePath = subEntry.filepath;
            }

            items.push({
              filepath: fileEntry.filepath,
              filename: fileEntry.filename,
              title: aiItem.title,
              notes: notes,
              subtitlePath: subtitlePath,
              order: globalOrder++
            });
          }
          if (items.length > 0) {
            sections.push({ sectionName: aiSection.sectionName, folderName: '', items });
          }
        }

        return res.json({ sections, coverImagePath, aiPowered: true });
      } catch (aiErr) {
        console.error('AI parsing failed, falling back to heuristic:', aiErr.message);
        aiErrorMsg = aiErr.message;
        // Fall through to heuristic parsing below
      }
    }

    // === HEURISTIC FALLBACK (no API key or AI failed) ===
    const entries = fs.readdirSync(folderPath).sort();
    const sections = [];
    let globalOrder = 1;

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry);
      if (!fs.statSync(fullPath).isDirectory()) continue;

      const sectionName = entry.replace(/^\d+\s*[-.]?\s*/, '').trim() || entry;
      const sectionFiles = fs.readdirSync(fullPath).sort();
      const fileMap = {};
      for (const file of sectionFiles) {
        const ext = path.extname(file).toLowerCase();
        const baseName = path.basename(file, path.extname(file));
        if (!fileMap[baseName]) fileMap[baseName] = {};
        const fileFull = path.join(fullPath, file);
        if (ext.match(/\.(mp4|mkv|webm|avi)$/)) { fileMap[baseName].video = fileFull; fileMap[baseName].filename = file; }
        else if (ext.match(/\.(txt|md|html)$/)) { try { fileMap[baseName].notes = fs.readFileSync(fileFull, 'utf8'); } catch(e){} }
        else if (ext.match(/\.(srt|vtt)$/)) { fileMap[baseName].subtitle = fileFull; }
      }
      const items = [];
      for (const baseName of Object.keys(fileMap).sort()) {
        const g = fileMap[baseName];
        if (!g.video) continue;
        items.push({ filepath: g.video, filename: g.filename, title: baseName.replace(/^\d+\s*[-.]?\s*/, '').replace(/_/g, ' ').trim() || baseName, notes: g.notes || '', subtitlePath: g.subtitle || null, order: globalOrder++ });
      }
      if (items.length > 0) sections.push({ sectionName, folderName: entry, items });
    }

    // Flat folder fallback
    if (sections.length === 0) {
      const fileMap = {};
      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry);
        if (fs.statSync(fullPath).isDirectory()) continue;
        const ext = path.extname(entry).toLowerCase();
        const baseName = path.basename(entry, path.extname(entry));
        if (!fileMap[baseName]) fileMap[baseName] = {};
        if (ext.match(/\.(mp4|mkv|webm|avi)$/)) { fileMap[baseName].video = fullPath; fileMap[baseName].filename = entry; }
        else if (ext.match(/\.(txt|md|html)$/)) { try { fileMap[baseName].notes = fs.readFileSync(fullPath, 'utf8'); } catch(e){} }
        else if (ext.match(/\.(srt|vtt)$/)) { fileMap[baseName].subtitle = fullPath; }
      }
      const items = [];
      for (const baseName of Object.keys(fileMap).sort()) {
        const g = fileMap[baseName];
        if (!g.video) continue;
        items.push({ filepath: g.video, filename: g.filename, title: baseName.replace(/^\d+\s*[-.]?\s*/, '').replace(/_/g, ' ').trim() || baseName, notes: g.notes || '', subtitlePath: g.subtitle || null, order: globalOrder++ });
      }
      if (items.length > 0) sections.push({ sectionName: 'All Episodes', folderName: '', items });
    }

    res.json({ sections, coverImagePath, aiPowered: false, aiError: aiErrorMsg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Import Route (section-aware)
app.post('/api/bulk-import', authenticateToken, isAdmin, async (req, res) => {
  const { categoryId, mediaTitle, mediaDescription, coverImagePath, items } = req.body;
  
  try {
    // Handle cover image
    let coverImage = null;
    if (coverImagePath && fs.existsSync(coverImagePath)) {
      coverImage = path.relative(path.join(__dirname, '..'), coverImagePath).replace(/\\/g, '/');
      // Copy cover image to Data folder so it's served properly
      const destDir = path.join(__dirname, '..', 'Data', 'covers');
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, Date.now() + '-' + path.basename(coverImagePath));
      fs.copyFileSync(coverImagePath, destFile);
      coverImage = path.relative(path.join(__dirname, '..'), destFile).replace(/\\/g, '/');
    }

    // Create the Course/Media
    const media = await prisma.media.create({
      data: { 
        title: mediaTitle, 
        description: mediaDescription, 
        categoryId: categoryId,
        coverImage: coverImage
      }
    });

    // Create all the Episodes
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await prisma.mediaItem.create({
        data: {
          mediaId: media.id,
          title: item.title,
          type: item.type || 'VIDEO',
          videoPath: item.filepath || null,
          subtitlePath: item.subtitlePath || null,
          textContent: item.notes || null,
          order: item.order || i + 1
        }
      });
    }

    res.json({ message: 'Bulk Import Successful!', mediaId: media.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
