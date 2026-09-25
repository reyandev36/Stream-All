const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Dashboard.jsx', 'utf8');
code = code.replace('<img src={\\/\\} alt={media.title} className="w-full h-full object-cover" />', '<img src={`\\${import.meta.env.VITE_API_URL || \'\'}/\\${media.coverImage}`} alt={media.title} className="w-full h-full object-cover" />');
fs.writeFileSync('frontend/src/pages/Dashboard.jsx', code);
