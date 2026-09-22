import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminUpload() {
  const [categories, setCategories] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const navigate = useNavigate();

  // New User States
  const [usersList, setUsersList] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // New Media States
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');

  // New Item States
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemType, setItemType] = useState('VIDEO');
  const [videoFile, setVideoFile] = useState(null);
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [textContent, setTextContent] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const usersRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users`);
    setUsersList(usersRes.data);
    const catRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/categories`);
    setCategories(catRes.data);
    const mediaRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/media`);
    setMediaList(mediaRes.data);
    if (catRes.data.length > 0) setSelectedCatId(catRes.data[0].id);
    if (mediaRes.data.length > 0) setSelectedMediaId(mediaRes.data[0].id);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
        username: newUsername, password: newPassword
      });
      alert('Viewer Account Created!');
      fetchData();
      setNewUsername(''); setNewPassword('');
    } catch (err) { alert('Error creating user. Username might exist.'); }
  };

  const handleDeleteUser = async (id) => {
    if(!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/users/${id}`);
      fetchData();
    } catch(err) { alert('Failed to delete user'); }
  };

  const handleCreateMedia = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/media`, {
        title: newTitle, description: newDesc, categoryId: selectedCatId
      });
      alert('Media Created!');
      fetchData();
      setNewTitle(''); setNewDesc('');
    } catch (err) { alert('Error creating media'); }
  };

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
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/media/${selectedMediaId}/items`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Upload successful!');
      setItemTitle(''); setVideoFile(null); setSubtitleFile(null); setTextContent('');
    } catch (err) { alert('Upload failed'); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <button onClick={() => navigate('/')} className="mb-4 text-blue-500 hover:underline">&larr; Back</button>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create Media Box */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">1. Create New Series/Course/Movie</h2>
          <form onSubmit={handleCreateMedia} className="flex flex-col gap-4">
            <select 
              value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}
              className="p-2 bg-gray-700 rounded"
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input 
              type="text" placeholder="Title" required
              className="p-2 bg-gray-700 rounded" value={newTitle} onChange={e => setNewTitle(e.target.value)}
            />
            <textarea 
              placeholder="Description" className="p-2 bg-gray-700 rounded"
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 p-2 rounded font-bold hover:bg-blue-700">Create</button>
          </form>
        </div>

        {/* Upload Item Box */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">2. Upload Episode / Lesson</h2>
          <form onSubmit={handleUploadItem} className="flex flex-col gap-4">
            <select 
              value={selectedMediaId} onChange={e => setSelectedMediaId(e.target.value)}
              className="p-2 bg-gray-700 rounded"
            >
              {mediaList.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
            
            <input 
              type="text" placeholder="Episode Title (e.g. Lesson 1)" required
              className="p-2 bg-gray-700 rounded" value={itemTitle} onChange={e => setItemTitle(e.target.value)}
            />

            <select 
              value={itemType} onChange={e => setItemType(e.target.value)}
              className="p-2 bg-gray-700 rounded"
            >
              <option value="VIDEO">Video</option>
              <option value="TEXT">Text</option>
            </select>

            {itemType === 'VIDEO' ? (
              <>
                <div className="border border-dashed border-gray-600 p-4 rounded">
                  <label className="block mb-2 text-sm text-gray-400">Video File (MP4/MKV)</label>
                  <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} />
                </div>
                <div className="border border-dashed border-gray-600 p-4 rounded">
                  <label className="block mb-2 text-sm text-gray-400">Subtitle File (.srt / .vtt) - Optional</label>
                  <input type="file" accept=".srt,.vtt" onChange={e => setSubtitleFile(e.target.files[0])} />
                </div>
              </>
            ) : (
              <textarea 
                placeholder="Enter text lesson content..."
                className="p-2 bg-gray-700 rounded min-h-[150px]"
                value={textContent} onChange={e => setTextContent(e.target.value)}
              />
            )}

            <button type="submit" className="bg-green-600 p-2 rounded font-bold hover:bg-green-700">Upload to Server</button>
          </form>
        </div>
{/* Create User Box */}
        <div className="bg-gray-800 p-6 rounded-lg md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">3. Create Viewer Account</h2>
          <p className="text-sm text-gray-400 mb-4">Only users you create here can log in and watch your content.</p>
          <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" placeholder="Username" required
              className="p-2 bg-gray-700 rounded flex-1" value={newUsername} onChange={e => setNewUsername(e.target.value)}
            />
            <input 
              type="password" placeholder="Password" required
              className="p-2 bg-gray-700 rounded flex-1" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            />

            <button type="submit" className="bg-purple-600 p-2 rounded font-bold hover:bg-purple-700 md:w-32">Create User</button>
          </form>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Existing Viewer Accounts</h3>
            <div className="bg-gray-700 rounded p-4 max-h-40 overflow-y-auto">
              {usersList.length === 0 ? (
                <p className="text-gray-400">No viewer accounts created yet.</p>
              ) : (
                <ul>
                  {usersList.map(u => (
                    <li key={u.id} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-0">
                      <span>{u.username}</span>
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-300 text-sm font-semibold">Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
