const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const editRoute = `
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

// Delete MediaItem (Episode)`;

code = code.replace('// Delete MediaItem (Episode)', editRoute);

fs.writeFileSync('backend/index.js', code);
