const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AdminUpload.jsx', 'utf8');

code = code.replace(
  `const [newDesc, setNewDesc] = useState('');\n  const [selectedCatId, setSelectedCatId] = useState('');`,
  `const [newDesc, setNewDesc] = useState('');\n  const [coverImage, setCoverImage] = useState(null);\n  const [selectedCatId, setSelectedCatId] = useState('');`
);

code = code.replace(
  `const handleCreateMedia = async (e) => {
    e.preventDefault();
    try {
      await axios.post(\`\${import.meta.env.VITE_API_URL || ''}/api/media\`, {
        title: newTitle, description: newDesc, categoryId: selectedCatId
      });
      alert('Media Created!');
      fetchData();
      setNewTitle(''); setNewDesc('');
    } catch (err) { alert('Error creating media'); }
  };`,
  `const handleCreateMedia = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('description', newDesc);
    formData.append('categoryId', selectedCatId);
    if (coverImage) formData.append('coverImage', coverImage);

    try {
      await axios.post(\`\${import.meta.env.VITE_API_URL || ''}/api/media\`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Media Created!');
      fetchData();
      setNewTitle(''); setNewDesc(''); setCoverImage(null);
    } catch (err) { alert('Error creating media'); }
  };

  const handleDeleteMedia = async (id) => {
    if(!window.confirm("Are you sure you want to delete this Course? It will delete all videos inside it!")) return;
    try {
      await axios.delete(\`\${import.meta.env.VITE_API_URL || ''}/api/media/\${id}\`);
      fetchData();
    } catch(err) { alert('Failed to delete course'); }
  };`
);

code = code.replace(
  `            <textarea 
              placeholder="Description" className="p-2 bg-gray-700 rounded"
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 p-2 rounded font-bold hover:bg-blue-700">Create</button>
          </form>
        </div>`,
  `            <textarea 
              placeholder="Description" className="p-2 bg-gray-700 rounded"
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
            />
            <div className="border border-dashed border-gray-600 p-4 rounded">
              <label className="block mb-2 text-sm text-gray-400">Cover Image (Optional)</label>
              <input type="file" accept="image/*" onChange={e => setCoverImage(e.target.files[0])} />
            </div>
            <button type="submit" className="bg-blue-600 p-2 rounded font-bold hover:bg-blue-700">Create</button>
          </form>

          <div className="mt-6 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold mb-2">Existing Courses / Movies</h3>
            <div className="bg-gray-700 rounded p-4 max-h-40 overflow-y-auto">
              {mediaList.length === 0 ? (
                <p className="text-gray-400">No courses created yet.</p>
              ) : (
                <ul>
                  {mediaList.map(m => (
                    <li key={m.id} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-0">
                      <span>{m.title}</span>
                      <button type="button" onClick={() => handleDeleteMedia(m.id)} className="text-red-400 hover:text-red-300 text-sm font-semibold">Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>`
);

fs.writeFileSync('frontend/src/pages/AdminUpload.jsx', code);
