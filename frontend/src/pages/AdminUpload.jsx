import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminUpload() {
  const [categories, setCategories] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const navigate = useNavigate();

  // User States
  const [usersList, setUsersList] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // New Media States
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [selectedCatId, setSelectedCatId] = useState('');

  // Single Episode States
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemType, setItemType] = useState('VIDEO');
  const [videoPath, setVideoPath] = useState('');
  const [textContent, setTextContent] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  // Bulk Import States
  const [folderPath, setFolderPath] = useState('');
  const [scannedSections, setScannedSections] = useState([]);
  const [detectedCover, setDetectedCover] = useState(null);
  const [bulkTitle, setBulkTitle] = useState('');
  const [bulkDesc, setBulkDesc] = useState('');
  const [bulkCatId, setBulkCatId] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Edit Episodes States
  const [editMediaId, setEditMediaId] = useState('');
  const [editItemsList, setEditItemsList] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const usersRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users`);
    setUsersList(usersRes.data);
    const catRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/categories`);
    setCategories(catRes.data);
    const mediaRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/media`);
    setMediaList(mediaRes.data);
    if (catRes.data.length > 0) {
      setSelectedCatId(catRes.data[0].id);
      setBulkCatId(catRes.data[0].id);
    }
  };

  const fetchEditItems = async (mediaId) => {
    if (!mediaId) return setEditItemsList([]);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/media/${mediaId}`);
      setEditItemsList(res.data.items || []);
    } catch (err) { alert('Failed to load episodes.'); }
  };

  useEffect(() => { fetchEditItems(editMediaId); }, [editMediaId]);

  // --- Handlers ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/users`, { username: newUsername, password: newPassword });
      alert('Viewer Account Created!'); fetchData(); setNewUsername(''); setNewPassword('');
    } catch (err) { alert('Error creating user. Username might exist.'); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/users/${id}`); fetchData(); }
    catch (err) { alert('Failed to delete user'); }
  };

  const handleCreateMedia = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('description', newDesc);
    formData.append('categoryId', selectedCatId);
    if (coverImage) formData.append('coverImage', coverImage);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Media Created!'); fetchData(); setNewTitle(''); setNewDesc(''); setCoverImage(null);
    } catch (err) { alert('Error creating media'); }
  };

  const handleDeleteMedia = async (id) => {
    if (!window.confirm('Delete this Course and all its episodes?')) return;
    try { await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/media/${id}`); fetchData(); if (editMediaId === id) setEditMediaId(''); }
    catch (err) { alert('Failed to delete course'); }
  };

  const handleAddSingleItem = async (e) => {
    e.preventDefault();
    if (!selectedMediaId) return alert('Select a Course first!');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/media/${selectedMediaId}/add-item`, {
        title: itemTitle, type: itemType, videoPath, textContent: itemNotes || textContent
      });
      alert('Episode added!'); setItemTitle(''); setVideoPath(''); setTextContent(''); setItemNotes('');
      fetchEditItems(editMediaId);
    } catch (err) { alert('Failed to add episode'); }
  };

  // --- Scanner ---
  const [aiPowered, setAiPowered] = useState(false);
  const handleScanFolder = async () => {
    if (!folderPath) return alert('Enter a folder path first!');
    setIsScanning(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/scan`, { folderPath });
      setScannedSections(res.data.sections || []);
      setDetectedCover(res.data.coverImagePath || null);
      setAiPowered(res.data.aiPowered || false);
      const totalItems = (res.data.sections || []).reduce((sum, s) => sum + s.items.length, 0);
      if (totalItems === 0) alert('No videos found in that folder!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to scan folder.');
    }
    setIsScanning(false);
  };

  const handleSectionItemChange = (sIdx, iIdx, field, value) => {
    const updated = [...scannedSections];
    updated[sIdx].items[iIdx][field] = value;
    setScannedSections(updated);
  };

  const handleRemoveItem = (sIdx, iIdx) => {
    const updated = [...scannedSections];
    updated[sIdx].items.splice(iIdx, 1);
    if (updated[sIdx].items.length === 0) updated.splice(sIdx, 1);
    setScannedSections(updated);
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    const allItems = [];
    let order = 1;
    for (const section of scannedSections) {
      // Add a section header as a TEXT item
      allItems.push({ title: `--- ${section.sectionName} ---`, type: 'TEXT', textContent: `Section: ${section.sectionName}`, order: order++ });
      for (const item of section.items) {
        allItems.push({ filepath: item.filepath, title: item.title, type: 'VIDEO', notes: item.notes, subtitlePath: item.subtitlePath, order: order++ });
      }
    }
    if (allItems.length === 0) return alert('No items to import!');
    if (!bulkTitle) return alert('Give this course a title!');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/bulk-import`, {
        categoryId: bulkCatId, mediaTitle: bulkTitle, mediaDescription: bulkDesc,
        coverImagePath: detectedCover, items: allItems
      });
      alert('Bulk Import Successful!');
      setScannedSections([]); setFolderPath(''); setBulkTitle(''); setBulkDesc(''); setDetectedCover(null);
      fetchData();
    } catch (err) { alert('Failed to bulk import!'); }
  };

  // --- Edit Handlers ---
  const handleEditItemChange = (index, field, value) => {
    const updated = [...editItemsList]; updated[index][field] = value; setEditItemsList(updated);
  };

  const handleSaveItemEdit = async (item) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || ''}/api/media/${editMediaId}/items/${item.id}`, {
        title: item.title, textContent: item.textContent, order: item.order
      });
      alert('Episode updated!');
    } catch (err) { alert('Failed to update episode'); }
  };

  const handleDeleteEpisode = async (itemId) => {
    if (!window.confirm('Delete this episode?')) return;
    try { await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/media/${editMediaId}/items/${itemId}`); fetchEditItems(editMediaId); }
    catch (err) { alert('Failed to delete episode'); }
  };

  const totalScanned = scannedSections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <button onClick={() => navigate('/')} className="mb-4 text-blue-500 hover:underline">&larr; Back to Dashboard</button>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-8 mb-8">
        
        {/* ===== BULK IMPORTER ===== */}
        <div className="bg-gray-800 p-6 rounded-lg border-2 border-green-500">
          <h2 className="text-2xl font-semibold mb-2 text-green-400">⚡ Smart Auto-Scanner</h2>
          <p className="text-gray-400 mb-6">Enter a course folder path. It detects sections, pairs videos with notes/subtitles, and finds the cover image automatically.</p>
          
          <div className="flex gap-4 mb-6">
            <input type="text" placeholder='e.g. C:\\Downloads\\My Course' className="p-3 bg-gray-700 rounded flex-1 text-lg font-mono" value={folderPath} onChange={e => setFolderPath(e.target.value)} />
            <button onClick={handleScanFolder} disabled={isScanning} className="bg-green-600 px-6 py-3 rounded font-bold hover:bg-green-700 disabled:opacity-50">
              {isScanning ? 'Scanning...' : 'Scan Folder'}
            </button>
          </div>

          {scannedSections.length > 0 && (
            <div className="bg-gray-900 p-6 rounded border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-green-400">✅ Found {totalScanned} Videos in {scannedSections.length} Sections</h3>
                <div className="flex gap-3">
                  {aiPowered && <span className="text-sm bg-purple-600 px-3 py-1 rounded-full font-bold">🤖 AI-Organized</span>}
                  {!aiPowered && <span className="text-sm bg-gray-600 px-3 py-1 rounded-full">📋 Heuristic Mode</span>}
                  {detectedCover && <span className="text-sm text-yellow-400">📷 Cover auto-detected!</span>}
                </div>
              </div>
              
              <form onSubmit={handleBulkImport} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800 p-4 rounded">
                <input type="text" placeholder="Course Title..." required className="p-2 bg-gray-700 rounded" value={bulkTitle} onChange={e => setBulkTitle(e.target.value)} />
                <input type="text" placeholder="Description (Optional)..." className="p-2 bg-gray-700 rounded" value={bulkDesc} onChange={e => setBulkDesc(e.target.value)} />
                <div className="flex gap-2">
                  <select className="p-2 bg-gray-700 rounded flex-1" value={bulkCatId} onChange={e => setBulkCatId(e.target.value)}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="submit" className="bg-blue-600 px-4 rounded font-bold hover:bg-blue-700">Import All</button>
                </div>
              </form>

              <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6">
                {scannedSections.map((section, sIdx) => (
                  <div key={sIdx} className="border border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                      <h4 className="text-lg font-bold text-blue-400">📁 {section.sectionName}</h4>
                      <p className="text-xs text-gray-500">{section.items.length} videos</p>
                    </div>
                    <div className="p-2 space-y-2">
                      {section.items.map((file, iIdx) => (
                        <div key={iIdx} className="flex gap-3 items-start bg-gray-800 p-3 rounded border-l-4 border-green-500">
                          <div className="font-bold text-gray-500 w-8 pt-1">#{file.order}</div>
                          <div className="flex-1">
                            <input type="text" value={file.title} onChange={e => handleSectionItemChange(sIdx, iIdx, 'title', e.target.value)} className="w-full bg-gray-700 p-1 rounded px-2 mb-1" />
                            <div className="text-xs text-gray-400 truncate" title={file.filepath}>{file.filepath}</div>
                            {file.notes && <div className="text-xs text-yellow-400 mt-1">📝 Has notes attached</div>}
                            {file.subtitlePath && <div className="text-xs text-purple-400 mt-1">💬 Has subtitles</div>}
                          </div>
                          <button onClick={() => handleRemoveItem(sIdx, iIdx)} className="text-red-400 hover:text-red-300 px-2 text-xl font-bold">&times;</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== EDIT EPISODES ===== */}
        <div className="bg-gray-800 p-6 rounded-lg border border-blue-500">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">✏️ Edit Existing Episodes</h2>
          <p className="text-sm text-gray-400 mb-4">Select a course to rename episodes, change order, edit notes, or delete.</p>
          
          <select value={editMediaId} onChange={e => setEditMediaId(e.target.value)} className="p-3 bg-gray-700 rounded w-full mb-6 font-bold text-lg">
            <option value="">-- Select a Course to Edit --</option>
            {mediaList.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>

          {editMediaId && (
            <div className="space-y-4">
              {editItemsList.length === 0 ? (
                <p className="text-gray-400">No episodes in this course yet.</p>
              ) : (
                editItemsList.map((item, index) => (
                  <div key={item.id} className="bg-gray-700 p-4 rounded flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex flex-col gap-2 w-full md:w-24">
                      <label className="text-xs text-gray-400 uppercase font-bold">Order</label>
                      <input type="number" value={item.order} onChange={e => handleEditItemChange(index, 'order', e.target.value)} className="p-2 bg-gray-900 rounded font-bold text-center w-full" />
                    </div>
                    <div className="flex flex-col gap-2 flex-1 w-full">
                      <label className="text-xs text-gray-400 uppercase font-bold">Title</label>
                      <input type="text" value={item.title} onChange={e => handleEditItemChange(index, 'title', e.target.value)} className="p-2 bg-gray-900 rounded w-full" />
                      <label className="text-xs text-gray-400 uppercase font-bold mt-2">Notes / Text Content</label>
                      <textarea value={item.textContent || ''} onChange={e => handleEditItemChange(index, 'textContent', e.target.value)} className="p-2 bg-gray-900 rounded w-full min-h-[60px]" placeholder="Add lesson notes here..." />
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto mt-6 md:mt-0">
                      <button onClick={() => handleSaveItemEdit(item)} className="bg-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-700">Save</button>
                      <button onClick={() => handleDeleteEpisode(item.id)} className="bg-red-600 px-4 py-2 rounded font-bold hover:bg-red-700">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ===== ADD SINGLE EPISODE ===== */}
          <div className="bg-gray-800 p-6 rounded-lg border border-yellow-500">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">Add Single Episode</h2>
            <p className="text-sm text-gray-400 mb-4">Add a single video by entering its path on the Server PC.</p>
            <form onSubmit={handleAddSingleItem} className="flex flex-col gap-4">
              <select value={selectedMediaId} onChange={e => setSelectedMediaId(e.target.value)} className="p-2 bg-gray-700 rounded">
                <option value="">-- Select Course --</option>
                {mediaList.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <input type="text" placeholder="Episode Title" required className="p-2 bg-gray-700 rounded" value={itemTitle} onChange={e => setItemTitle(e.target.value)} />
              <select value={itemType} onChange={e => setItemType(e.target.value)} className="p-2 bg-gray-700 rounded">
                <option value="VIDEO">Video</option>
                <option value="TEXT">Text Only</option>
              </select>
              {itemType === 'VIDEO' ? (
                <>
                  <div className="border border-dashed border-gray-600 p-4 rounded">
                    <label className="block mb-2 text-sm text-gray-400">Video File Path on Server PC</label>
                    <input type="text" placeholder='e.g. C:\\Videos\\lesson1.mp4' className="p-2 bg-gray-700 rounded w-full font-mono" value={videoPath} onChange={e => setVideoPath(e.target.value)} />
                  </div>
                  <textarea placeholder="Lesson Notes (Optional) - shown below the video player" className="p-2 bg-gray-700 rounded min-h-[80px]" value={itemNotes} onChange={e => setItemNotes(e.target.value)} />
                </>
              ) : (
                <textarea placeholder="Enter text lesson content..." className="p-2 bg-gray-700 rounded min-h-[150px]" value={textContent} onChange={e => setTextContent(e.target.value)} />
              )}
              <button type="submit" className="bg-yellow-600 p-2 rounded font-bold hover:bg-yellow-700">Add Episode</button>
            </form>
          </div>

          {/* ===== MANUAL CREATE COURSE ===== */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Create Empty Course</h2>
            <form onSubmit={handleCreateMedia} className="flex flex-col gap-4">
              <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} className="p-2 bg-gray-700 rounded">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Title" required className="p-2 bg-gray-700 rounded" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <textarea placeholder="Description" className="p-2 bg-gray-700 rounded" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              <div className="border border-dashed border-gray-600 p-4 rounded">
                <label className="block mb-2 text-sm text-gray-400">Cover Image (Optional)</label>
                <input type="file" accept="image/*" onChange={e => setCoverImage(e.target.files[0])} />
              </div>
              <button type="submit" className="bg-blue-600 p-2 rounded font-bold hover:bg-blue-700">Create</button>
            </form>
            <div className="mt-6 border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold mb-2">Existing Courses</h3>
              <div className="bg-gray-700 rounded p-4 max-h-40 overflow-y-auto">
                {mediaList.length === 0 ? <p className="text-gray-400">No courses yet.</p> : (
                  <ul>{mediaList.map(m => (
                    <li key={m.id} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-0">
                      <span>{m.title}</span>
                      <button type="button" onClick={() => handleDeleteMedia(m.id)} className="text-red-400 hover:text-red-300 text-sm font-semibold">Delete</button>
                    </li>
                  ))}</ul>
                )}
              </div>
            </div>
          </div>

          {/* ===== VIEWER ACCOUNTS ===== */}
          <div className="bg-gray-800 p-6 rounded-lg md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Viewer Accounts</h2>
            <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4">
              <input type="text" placeholder="Username" required className="p-2 bg-gray-700 rounded flex-1" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
              <input type="password" placeholder="Password" required className="p-2 bg-gray-700 rounded flex-1" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button type="submit" className="bg-purple-600 p-2 rounded font-bold hover:bg-purple-700 md:w-32">Create</button>
            </form>
            <div className="mt-6 border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold mb-2">Existing Accounts</h3>
              <div className="bg-gray-700 rounded p-4 max-h-40 overflow-y-auto">
                {usersList.length === 0 ? <p className="text-gray-400">No accounts yet.</p> : (
                  <ul>{usersList.map(u => (
                    <li key={u.id} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-0">
                      <span>{u.username}</span>
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-300 text-sm font-semibold">Delete</button>
                    </li>
                  ))}</ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
