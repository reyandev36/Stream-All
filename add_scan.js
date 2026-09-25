const fs = require('fs');

let code = fs.readFileSync('backend/index.js', 'utf8');

const newRoutes = `
// --- BULK IMPORT SYSTEM ---

// Helper to recursively read directories
const getAllVideoFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllVideoFiles(fullPath, arrayOfFiles);
    } else {
      if (file.match(/\\.(mp4|mkv|webm|avi)$/i)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
};

// Scan Folder Route
app.post('/api/scan', authenticateToken, isAdmin, async (req, res) => {
  const { folderPath } = req.body;
  if (!fs.existsSync(folderPath)) {
    return res.status(400).json({ error: 'Folder does not exist on Server PC.' });
  }

  try {
    const files = getAllVideoFiles(folderPath, []);
    
    // Parse files to guess episode numbers
    const parsedFiles = files.map(filepath => {
      const filename = path.basename(filepath);
      
      // Look for numbers like 001, E01, S01E01, or just 1
      let guessedNumber = 0;
      const numMatch = filename.match(/(?:[eExX]|^|\\s|0*|-)(\\d{1,4})(?:\\D|$)/);
      if (numMatch) {
        guessedNumber = parseInt(numMatch[1], 10);
      }
      
      return {
        filepath: filepath,
        filename: filename,
        guessedNumber: guessedNumber,
        title: filename.replace(/\\.[^/.]+$/, "") // remove extension
      };
    });

    // Sort by guessed number
    parsedFiles.sort((a, b) => a.guessedNumber - b.guessedNumber);

    res.json(parsedFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Import Route
app.post('/api/bulk-import', authenticateToken, isAdmin, async (req, res) => {
  const { categoryId, mediaTitle, mediaDescription, items } = req.body;
  
  try {
    // 1. Create the Course/Media
    const media = await prisma.media.create({
      data: { 
        title: mediaTitle, 
        description: mediaDescription, 
        categoryId: categoryId 
      }
    });

    // 2. Create all the Episodes inside it (using absolute paths!)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await prisma.mediaItem.create({
        data: {
          mediaId: media.id,
          title: item.title,
          type: 'VIDEO',
          videoPath: item.filepath,
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
`;

code = code.replace('// Serve Frontend (if built)', newRoutes);

fs.writeFileSync('backend/index.js', code);
