import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';

export default function MediaPage() {
  const { id } = useParams();
  const [media, setMedia] = useState(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/media/${id}`);
        setMedia(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMedia();
  }, [id]);

  if (!media) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
      
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        {media.coverImage ? (
          <img src={media.coverImage} alt={media.title} className="w-64 h-96 object-cover rounded-lg shadow-lg" />
        ) : (
          <div className="w-64 h-96 bg-gray-800 rounded-lg shadow-lg flex items-center justify-center text-gray-500">
            No Cover
          </div>
        )}
        
        <div>
          <h1 className="text-4xl font-bold mb-4">{media.title}</h1>
          <p className="text-gray-300 text-lg">{media.description}</p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-6">Episodes / Lessons</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {media.items.map((item, idx) => (
          <Link to={`/play/${item.id}`} key={item.id} className="bg-gray-800 p-4 rounded hover:bg-gray-700 transition flex justify-between items-center">
            <div>
              <span className="text-gray-400 mr-4">#{idx + 1}</span>
              <span className="font-semibold">{item.title}</span>
            </div>
            <span className="text-xs px-2 py-1 bg-gray-600 rounded">{item.type}</span>
          </Link>
        ))}
      </div>
      
      {media.items.length === 0 && (
        <p className="text-gray-400">No content uploaded yet.</p>
      )}
    </div>
  );
}
