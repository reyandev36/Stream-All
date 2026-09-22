import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/login`, { username, password });
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      alert('Login failed. Check credentials.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <form onSubmit={handleLogin} className="p-8 bg-gray-800 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-500">Stream All</h2>
        <input 
          type="text" placeholder="Username" required
          className="w-full p-3 mb-4 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={username} onChange={e => setUsername(e.target.value)}
        />
        <input 
          type="password" placeholder="Password" required
          className="w-full p-3 mb-6 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password} onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded font-bold">
          Login
        </button>
      </form>
    </div>
  );
}
