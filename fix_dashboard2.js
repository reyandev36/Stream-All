const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Dashboard.jsx', 'utf8');
code = code.replace('<img src={`\\${import.meta.env.VITE_API_URL || \'\'}/\\${media.coverImage}`}', '<img src={`${import.meta.env.VITE_API_URL || \'\'}/${media.coverImage}`}');
fs.writeFileSync('frontend/src/pages/Dashboard.jsx', code);
