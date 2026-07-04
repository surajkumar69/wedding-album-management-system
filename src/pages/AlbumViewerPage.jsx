import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import FlipbookViewer from '../components/FlipbookViewer';

const AlbumViewerPage = () => {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const response = await fetch(`${API_URL}/album/viewer/${id}`);
        const data = await response.json();
        
        if (response.ok) {
          setAlbum(data);
        } else {
          throw new Error(data.message || 'Wedding Album not found.');
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Golden accent decorations */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gold/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold"></div>
            <p className="text-sm font-serif text-gold animate-pulse">Initializing Luxury Flipbook Viewer...</p>
          </div>
        ) : error ? (
          <div className="glass-panel p-8 rounded-2xl border border-gold/15 text-center max-w-md mx-auto space-y-4">
            <span className="text-4xl">⚠️</span>
            <h2 className="text-xl font-serif text-gold font-bold">Album Unavailable</h2>
            <p className="text-xs text-luxury-white/60">{error}</p>
            <p className="text-[10px] text-luxury-white/30">Please contact your wedding studio photographer to verify the share link.</p>
          </div>
        ) : (
          album && <FlipbookViewer album={album} />
        )}
      </div>
    </div>
  );
};

export default AlbumViewerPage;
