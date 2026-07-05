import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Pause, Heart, Trash2, Check, X, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

const SafeImage = ({ src, alt, className = "" }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [src]);

  if (error || !src) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-4 text-center bg-charcoal-dark border border-red-500/20 text-red-400">
        <span className="text-xl mb-1">⚠️</span>
        <p className="text-[10px] uppercase tracking-wider font-bold">Image Unavailable</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/10">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 animate-pulse">
          <div className="h-6 w-6 rounded-full border-t border-b border-gold animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-all duration-300 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} object-contain`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
};

const FlipbookViewer = ({ album }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  
  const storageKey = `album_proof_selection_${album._id}`;
  const [selections, setSelections] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  const audioRef = useRef(null);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const host = window.location.hostname;
    return `${window.location.protocol}//${host}:5000${url}`;
  };

  const sheets = (album.sheets || []).map(s => getImageUrl(s));
  const frontCover = getImageUrl(album.frontCover);
  const backCover = getImageUrl(album.backCover);

  const pages = [
    { id: 'front_cover', type: 'Cover', url: frontCover, name: 'Front Cover' },
    ...sheets.map((s, idx) => ({ id: `sheet_${idx}`, type: 'Sheet', url: s, name: `Layout Sheet ${idx + 1}` })),
    { id: 'back_cover', type: 'Cover', url: backCover, name: 'Back Cover' }
  ];

  useEffect(() => {
    if (album.songUrl && audioRef.current) {
      audioRef.current.src = album.songUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [album.songUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlayingMusic) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log("Audio playback blocked."));
    }
    setIsPlayingMusic(!isPlayingMusic);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      setLightboxZoom(prev => Math.min(prev + 0.1, 3.0));
    } else {
      setLightboxZoom(prev => Math.max(prev - 0.1, 0.5));
    }
  };

  const togglePageStatus = (status) => {
    const activePage = pages[currentPage];
    const newSelections = { ...selections };
    if (newSelections[activePage.id] === status) {
      delete newSelections[activePage.id];
    } else {
      newSelections[activePage.id] = status;
    }
    setSelections(newSelections);
    localStorage.setItem(storageKey, JSON.stringify(newSelections));
  };

  const activePage = pages[currentPage];

  const totalPhotos = pages.length;
  const selectedCount = Object.values(selections).filter(s => s === 'selected').length;
  const rejectedCount = Object.values(selections).filter(s => s === 'rejected').length;
  const pendingCount = totalPhotos - selectedCount - rejectedCount;

  return (
    <div className="relative w-full h-[90vh] bg-[#070707] rounded-2xl border border-gold/10 shadow-2xl select-none overflow-hidden flex items-center justify-center">
      {album.songUrl && <audio ref={audioRef} />}

      {/* 1. Centered Image Display Container (Underlay - takes up 100% space) */}
      <div 
        onClick={() => {
          setIsLightboxOpen(true);
          setLightboxZoom(1);
        }}
        className="absolute inset-0 w-full h-full flex items-center justify-center z-0 cursor-zoom-in p-2 bg-[#020202]/30"
      >
        <SafeImage
          src={activePage.url}
          alt={activePage.name}
          className="max-w-[90%] max-h-[82%] w-auto h-auto object-contain rounded-lg shadow-2xl transition-transform duration-300"
        />
      </div>

      {/* 2. Overlaid Header controls bar */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-serif text-gold font-bold">{album.studioName}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
            <span className="text-[9px] uppercase tracking-wider text-luxury-white/40 font-mono">
              {activePage.name} ({currentPage + 1} of {pages.length})
            </span>
            <span className="text-[9px] text-gold/60 font-mono">
              Total Photos: {totalPhotos} | Selected: {selectedCount} | Rejected: {rejectedCount} | Pending: {pendingCount}
            </span>
          </div>
        </div>

        {/* Music controllers */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {album.songUrl && (
            <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 text-gold text-xs">
              <button onClick={toggleMusic} className="hover:text-gold-light transition-all">
                {isPlayingMusic ? <Pause size={12} className="animate-pulse" /> : <Play size={12} />}
              </button>
              <button onClick={toggleMute} className="hover:text-gold-light transition-all">
                {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-10 h-0.5 accent-gold cursor-pointer bg-charcoal"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Navigation Arrows (Overlaid) */}
      <button
        onClick={handlePrev}
        disabled={currentPage === 0}
        className={`absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-gold transition-all ${
          currentPage === 0 ? 'opacity-10 cursor-not-allowed' : 'opacity-80'
        }`}
      >
        <ChevronLeft size={22} />
      </button>

      <button
        onClick={handleNext}
        disabled={currentPage === pages.length - 1}
        className={`absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-gold transition-all ${
          currentPage === pages.length - 1 ? 'opacity-10 cursor-not-allowed' : 'opacity-80'
        }`}
      >
        <ChevronRight size={22} />
      </button>

      {/* 4. Bottom Controls panel (Thumbnails & Sticky Buttons overlayed) */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-4 pt-10 z-10 flex flex-col items-center gap-3">
        {/* Thumbnails strip */}
        <div className="flex gap-2.5 items-center overflow-x-auto max-w-full justify-start sm:justify-center scrollbar-thin py-1 w-full h-[85px] z-10">
          {pages.map((p, idx) => {
            const isSelected = selections[p.id] === 'selected';
            const isRejected = selections[p.id] === 'rejected';
            
            return (
              <button
                key={p.id}
                onClick={() => setCurrentPage(idx)}
                className={`flex-shrink-0 w-[100px] h-[75px] rounded border transition-all relative ${
                  currentPage === idx
                    ? 'border-gold scale-105 shadow-gold-sm ring-1 ring-gold/45'
                    : isSelected
                    ? 'border-green-500 opacity-90'
                    : isRejected
                    ? 'border-red-500 opacity-60'
                    : 'border-white/10 opacity-40 hover:opacity-100'
                }`}
              >
                <img
                  src={p.url}
                  alt={`Thumb ${idx}`}
                  className="w-full h-full object-cover rounded"
                />
                {isSelected && (
                  <span className="absolute top-1 right-1 bg-green-500 text-charcoal-dark p-0.5 rounded-full z-10 scale-[0.8] flex items-center justify-center">
                    <Check size={8} strokeWidth={4} />
                  </span>
                )}
                {isRejected && (
                  <span className="absolute top-1 right-1 bg-red-500 text-luxury-white p-0.5 rounded-full z-10 scale-[0.8] flex items-center justify-center">
                    <X size={8} strokeWidth={4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center w-full z-10">
          <button
            onClick={() => togglePageStatus('selected')}
            className={`py-3 px-8 rounded-xl flex items-center gap-2 text-xs font-bold uppercase transition-all shadow-md ${
              selections[activePage.id] === 'selected'
                ? 'bg-green-500 text-charcoal-dark hover:bg-green-600 border border-green-500'
                : 'bg-black/60 border border-green-500/40 text-green-400 hover:bg-green-500/10'
            }`}
          >
            <Heart size={14} fill={selections[activePage.id] === 'selected' ? "currentColor" : "none"} />
            Select Photo
          </button>

          <button
            onClick={() => togglePageStatus('rejected')}
            className={`py-3 px-8 rounded-xl flex items-center gap-2 text-xs font-bold uppercase transition-all shadow-md ${
              selections[activePage.id] === 'rejected'
                ? 'bg-red-500 text-luxury-white hover:bg-red-600 border border-red-500'
                : 'bg-black/60 border border-red-500/40 text-red-400 hover:bg-red-500/10'
            }`}
          >
            <Trash2 size={14} />
            Reject Photo
          </button>
        </div>
      </div>

      {/* Fullscreen Lightbox Zoom Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 bg-black/99 z-50 flex flex-col justify-between p-4 backdrop-blur-md">
          {/* Header Panel */}
          <div className="flex items-center justify-between w-full border-b border-white/10 pb-3">
            <span className="text-xs font-mono text-gold font-bold">
              {activePage.name} — FULLSCREEN VIEW
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1">
                <button onClick={() => setLightboxZoom(prev => Math.max(prev - 0.25, 0.75))} className="text-gold text-xs p-1 font-bold">-</button>
                <span className="text-[10px] font-mono text-gold">{Math.floor(lightboxZoom * 100)}%</span>
                <button onClick={() => setLightboxZoom(prev => Math.min(prev + 0.25, 2.5))} className="text-gold text-xs p-1 font-bold">+</button>
                <button onClick={() => setLightboxZoom(1)} className="text-gold/60 text-xs p-1 hover:text-gold"><RefreshCw size={10} /></button>
              </div>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-1 text-gold hover:text-white transition-all text-xs uppercase font-bold"
              >
                Close
              </button>
            </div>
          </div>

          {/* Centered Image frame */}
          <div className="flex-1 w-full flex items-center justify-center overflow-auto my-4 cursor-zoom-in" onWheel={handleWheel}>
            <div 
              className="transition-transform duration-150"
              style={{ transform: `scale(${lightboxZoom})` }}
            >
              <img
                src={activePage.url}
                alt={activePage.name}
                className="max-w-[90vw] max-h-[75vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
          <div className="h-4" />
        </div>
      )}
    </div>
  );
};

export default FlipbookViewer;
