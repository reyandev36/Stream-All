import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function PlayerPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mediaId = searchParams.get('mediaId');
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [siblings, setSiblings] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentItem, setCurrentItem] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch sibling episodes for prev/next
  useEffect(() => {
    const fetchSiblings = async () => {
      if (!mediaId) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/media/${mediaId}`);
        const items = res.data.items || [];
        setSiblings(items);
        const idx = items.findIndex(item => item.id === id);
        setCurrentIndex(idx);
        if (idx >= 0) setCurrentItem(items[idx]);
      } catch (err) {
        console.error("Failed to fetch siblings");
      }
    };
    fetchSiblings();
  }, [id, mediaId]);

  // Fetch saved progress
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/progress/${id}`);
        setProgress(res.data.timestamp || 0);
        if (videoRef.current) {
          videoRef.current.currentTime = res.data.timestamp || 0;
        }
      } catch (err) {
        console.error("No progress found");
      }
    };
    fetchProgress();
  }, [id]);

  const saveProgress = (timestamp, completed = false) => {
    axios.post(`${import.meta.env.VITE_API_URL || ''}/api/progress/${id}`, {
      timestamp, completed
    }).catch(console.error);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      if (Math.abs(current - progress) > 5) {
        setProgress(current);
        saveProgress(current);
      }
    }
  };

  const handleGoBack = () => {
    if (videoRef.current) {
      saveProgress(videoRef.current.currentTime);
    }
    if (mediaId) {
      navigate(`/media/${mediaId}`);
    } else {
      navigate(-1);
    }
  };

  const handleVideoEnded = () => {
    saveProgress(videoRef.current?.currentTime || 0, true);
    // Auto-play next episode
    if (currentIndex >= 0 && currentIndex < siblings.length - 1) {
      const next = siblings[currentIndex + 1];
      navigate(`/play/${next.id}?mediaId=${mediaId}`);
    }
  };

  const prevItem = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <button onClick={handleGoBack} className="text-gray-400 hover:text-white transition">
          &larr; Back to Course
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold">
            {currentItem ? currentItem.title : 'Loading...'}
          </h1>
          {siblings.length > 0 && (
            <p className="text-xs text-gray-500">
              Episode {currentIndex + 1} of {siblings.length}
            </p>
          )}
        </div>
        <div className="w-20"></div>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center bg-black px-4 py-4">
        <div className="w-full max-w-7xl rounded-lg overflow-hidden shadow-2xl border border-gray-800">
          <video 
            ref={videoRef}
            className="w-full aspect-video bg-black"
            controls
            autoPlay
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            onLoadedMetadata={() => {
              if (videoRef.current && progress > 0) {
                videoRef.current.currentTime = progress;
              }
            }}
            crossOrigin="anonymous"
          >
            <source 
              src={`${import.meta.env.VITE_API_URL || ''}/api/stream/${id}?token=${localStorage.getItem('token')}`} 
              type="video/mp4" 
            />
            <track 
              label="English" 
              kind="subtitles" 
              srcLang="en" 
              src={`${import.meta.env.VITE_API_URL || ''}/api/subtitles/${id}?token=${localStorage.getItem('token')}`} 
              default 
            />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      {/* Lesson Notes */}
      {currentItem && currentItem.textContent && (
        <div className="w-full max-w-7xl mx-auto px-6 py-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-yellow-400 mb-3">📝 Lesson Notes</h3>
            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">{currentItem.textContent}</div>
          </div>
        </div>
      )}

      {/* Previous / Next Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-t border-gray-800">
        {prevItem ? (
          <Link 
            to={`/play/${prevItem.id}?mediaId=${mediaId}`}
            className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 transition px-5 py-3 rounded-lg"
          >
            <span className="text-2xl">⏮</span>
            <div>
              <p className="text-xs text-gray-400">Previous</p>
              <p className="font-semibold">{prevItem.title}</p>
            </div>
          </Link>
        ) : (
          <div></div>
        )}

        {nextItem ? (
          <Link 
            to={`/play/${nextItem.id}?mediaId=${mediaId}`}
            className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 transition px-5 py-3 rounded-lg"
          >
            <div className="text-right">
              <p className="text-xs text-gray-400">Next</p>
              <p className="font-semibold">{nextItem.title}</p>
            </div>
            <span className="text-2xl">⏭</span>
          </Link>
        ) : (
          <div className="bg-green-800 px-5 py-3 rounded-lg">
            <p className="font-semibold text-green-300">🎉 Last Episode!</p>
          </div>
        )}
      </div>

    </div>
  );
}
