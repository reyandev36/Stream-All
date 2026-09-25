import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

export default function PlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [item, setItem] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1. Fetch item details (if we had an endpoint for just the item, else we just stream)
    // For now we just use the ID to construct the stream URL.
    // Let's also fetch progress.
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
    
    // We should fetch the item details to know if it's video or text.
    // For simplicity, let's assume video for this MVP, but we can add text rendering here.
  }, [id]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      // Debounce or save every 5 seconds
      if (Math.abs(current - progress) > 5) {
        setProgress(current);
        axios.post(`${import.meta.env.VITE_API_URL || ''}/api/progress/${id}`, {
          timestamp: current,
          completed: false
        }).catch(console.error);
      }
    }
  };

  const handleGoBack = () => {
    // Save final progress
    if (videoRef.current) {
      axios.post(`${import.meta.env.VITE_API_URL || ''}/api/progress/${id}`, {
        timestamp: videoRef.current.currentTime,
        completed: false
      }).catch(console.error);
    }
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative">
      <button 
        onClick={handleGoBack}
        className="absolute top-4 left-4 z-10 bg-gray-800 bg-opacity-75 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        &larr; Back
      </button>

      <div className="w-full max-w-6xl aspect-video bg-gray-900 shadow-2xl relative">
        <video 
          ref={videoRef}
          className="w-full h-full"
          controls
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current && progress > 0) {
              videoRef.current.currentTime = progress;
            }
          }}
          crossOrigin="anonymous"
        >
          {/* Stream video via backend Range endpoint */}
          <source 
            src={`${import.meta.env.VITE_API_URL || ''}/api/stream/${id}?token=${localStorage.getItem('token')}`} 
            type="video/mp4" 
          />
          {/* Subtitles support */}
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
  );
}
