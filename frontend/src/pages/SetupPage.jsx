import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setSetupNeeded } = useAuth();

  const handleSetup = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/setup`, { username, password });
      setSetupNeeded(false);
      navigate('/login');
    } catch (err) {
      alert('Setup failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <form onSubmit={handleSetup} className="p-8 bg-gray-800 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Initial Setup</h2>
        <p className="text-sm text-gray-400 mb-4 text-center">Create your admin account</p>
        <input 
          type="text" placeholder="Admin Username" required
          className="w-full p-3 mb-4 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={username} onChange={e => setUsername(e.target.value)}
        />
        <input 
          type="password" placeholder="Admin Password" required
          className="w-full p-3 mb-6 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password} onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded font-bold">
          Create Admin
        </button>
      </form>
    </div>
  );
}
