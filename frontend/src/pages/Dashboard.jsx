import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Upload } from 'lucide-react';

export default function Dashboard() {
  const [categories, setCategories] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/categories`);
        setCategories(catRes.data);
        const mediaRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/media`);
        setMediaList(mediaRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const filteredMedia = selectedCategory 
    ? mediaList.filter(m => m.categoryId === selectedCategory)
    : mediaList;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-blue-500">Stream All</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">Welcome, {user.username}</span>
          {user.isAdmin && (
            <Link to="/admin/upload" className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
              <Upload size={18} /> Upload
            </Link>
          )}
          <button onClick={logout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded ${!selectedCategory ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded ${selectedCategory === cat.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {filteredMedia.map(media => (
          <Link to={`/media/${media.id}`} key={media.id} className="block group">
            <div className="bg-gray-800 rounded-lg overflow-hidden aspect-[2/3] relative">
              {media.coverImage ? (
                <img src={`${import.meta.env.VITE_API_URL || ''}/${media.coverImage}`} alt={media.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-500">No Image</div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 font-bold text-lg">View</span>
              </div>
            </div>
            <h3 className="mt-2 font-semibold text-lg truncate">{media.title}</h3>
            <p className="text-gray-400 text-sm truncate">{media.category.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
