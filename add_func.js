const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AdminUpload.jsx', 'utf8');

const handleUploadFunction = `
  const handleUploadItem = async (e) => {
    e.preventDefault();
    if (!selectedMediaId) return alert("Select a Media first!");
    
    const formData = new FormData();
    formData.append('title', itemTitle);
    formData.append('type', itemType);
    if (itemType === 'VIDEO') {
      if (videoFile) formData.append('video', videoFile);
      if (subtitleFile) formData.append('subtitle', subtitleFile);
    } else {
      formData.append('textContent', textContent);
    }

    try {
      await axios.post(\`\${import.meta.env.VITE_API_URL || ''}/api/media/\${selectedMediaId}/items\`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Upload successful!');
      setItemTitle(''); setVideoFile(null); setSubtitleFile(null); setTextContent('');
      fetchEditItems(editMediaId); // refresh episodes if editing
    } catch (err) { alert('Upload failed'); }
  };

  const handleDeleteEpisode = async (itemId) => {`;

code = code.replace('  const handleDeleteEpisode = async (itemId) => {', handleUploadFunction);

fs.writeFileSync('frontend/src/pages/AdminUpload.jsx', code);
