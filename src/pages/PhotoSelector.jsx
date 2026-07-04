import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Trash2, X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, ZoomIn, ZoomOut, Check, XCircle } from 'lucide-react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';

// Custom Watermark Canvas to protect images
const WatermarkCanvas = ({ imageUrl, text, className = "" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      // Set canvas size to match image source
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Apply secured text overlays
      ctx.rotate(-28 * Math.PI / 180);
      ctx.font = `${Math.floor(img.width / 18)}px 'Playfair Display', serif`;
      ctx.fillStyle = 'rgba(212, 175, 55, 0.28)'; // Golden Translucent Watermark
      ctx.textAlign = 'center';
      
      // Draw grid watermarks
      for (let y = -img.height; y < img.height * 2; y += img.height / 3) {
        for (let x = -img.width; x < img.width * 2; x += img.width / 2) {
          ctx.fillText(text.toUpperCase(), x, y);
        }
      }
    };

    img.onerror = () => {
      // Fallback: draw placeholder on error
      canvas.width = 400;
      canvas.height = 400;
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = 'rgba(212,175,55,0.4)';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Secure Proof', 200, 200);
    };
  }, [imageUrl, text]);

  return <canvas ref={canvasRef} className={`w-full h-full object-contain ${className}`} />;
};

const PhotoSelector = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studioName, setStudioName] = useState('Rahul Sankhala Studio');
  const [selectionStarted, setSelectionStarted] = useState(false);
  const [socket, setSocket] = useState(null);

  // States for simplified Google-Photos-style gallery
  const [lightboxIndex, setLightboxIndex] = useState(null); // Null if closed, index number if open
  const [zoomScale, setZoomScale] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'selected', 'rejected', 'pending'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const API_URL = 'http://localhost:5000/api';

  // 1. Core security locks (Disables screen grab shortcuts, print, and context inspection)
  useEffect(() => {
    const preventKeys = (e) => {
      if (
        (e.ctrlKey && e.keyCode === 83) || 
        (e.ctrlKey && e.keyCode === 85) || 
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) ||
        (e.keyCode === 123) ||
        (e.ctrlKey && e.keyCode === 80)
      ) {
        e.preventDefault();
        alert("Security Alert: Wedding proofs are copyright protected and downloads are disabled.");
        return false;
      }
    };

    const preventRightClick = (e) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', preventKeys);
    window.addEventListener('contextmenu', preventRightClick);
    
    return () => {
      window.removeEventListener('keydown', preventKeys);
      window.removeEventListener('contextmenu', preventRightClick);
    };
  }, []);

  // Reset page index on searches
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // 2. Fetch project metadata
  useEffect(() => {
    const fetchClientProject = async () => {
      try {
        const response = await fetch(`${API_URL}/selection/client/${id}`);
        const data = await response.json();
        
        if (response.ok) {
          setProject(data);
          setPhotos(data.photos || []);
          setSelectionStarted(data.selectionStarted);
          
          // Emit "open" action
          await fetch(`${API_URL}/selection/client-action/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'open' })
          });
        } else {
          throw new Error(data.message || 'Verification failed. This selection link is invalid.');
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClientProject();

    const socketInstance = io('http://localhost:5000');
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (socket && project) {
      socket.emit('identify', `client_${id}`);
    }
  }, [socket, project]);

  // Keyboard navigation inside lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos]);

  // Toggle selection status
  const togglePhotoStatus = async (photoId, currentStatus, newStatus) => {
    const targetStatus = currentStatus === newStatus ? 'pending' : newStatus;

    if (!selectionStarted) {
      await fetch(`${API_URL}/selection/client-action/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      setSelectionStarted(true);
    }

    try {
      const response = await fetch(`${API_URL}/selection/${id}/photo/${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });

      if (response.ok) {
        setPhotos(prev => prev.map(p => p._id === photoId ? { ...p, status: targetStatus } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const finalizeSelection = async () => {
    if (!window.confirm("Are you sure you want to finalize your choices? This will lock your reviews and notify your studio.")) return;

    try {
      const response = await fetch(`${API_URL}/selection/client-action/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' })
      });
      
      if (response.ok) {
        setProject(prev => ({ ...prev, selectionCompleted: true }));
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#E5E5E5', '#FFFDD0', '#111111']
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations
  const selectedCount = photos.filter(p => p.status === 'selected').length;
  const rejectedCount = photos.filter(p => p.status === 'rejected').length;
  const pendingCount = photos.filter(p => p.status === 'pending').length;

  const filteredPhotos = photos.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredPhotos.length / itemsPerPage);
  const paginatedPhotos = filteredPhotos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleNext = () => {
    if (lightboxIndex !== null && lightboxIndex < filteredPhotos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
      setZoomScale(1);
    }
  };

  const handlePrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
      setZoomScale(1);
    }
  };

  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      setZoomScale(prev => Math.min(prev + 0.1, 3.0));
    } else {
      setZoomScale(prev => Math.max(prev - 0.1, 0.5));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold"></div>
        <p className="text-xs font-serif text-gold animate-pulse">Entering secure digital proofing studio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl border border-gold/15 text-center max-w-md space-y-4">
          <AlertCircle className="text-red-400 h-10 w-10 mx-auto" />
          <h2 className="text-xl font-serif text-gold font-bold">Secure Connection Denied</h2>
          <p className="text-xs text-luxury-white/60">{error}</p>
          <p className="text-[10px] text-luxury-white/30">Please request a valid selection key from your wedding photographer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] pb-12 font-sans select-none no-select text-luxury-white">
      
      {/* Sticky Header with Google-Photos-like stats strip */}
      <header className="sticky top-0 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-gold/10 p-4 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-xl font-serif font-bold text-gold">{project?.title}</h1>
            <p className="text-[9px] text-luxury-white/40 tracking-widest uppercase">Secure Client Proofing Portal</p>
          </div>

          {/* Simple Progress Bar */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-black/40 border border-gold/5 px-4 py-2 rounded-xl text-xs font-mono text-gold">
              <span>Total: <strong className="text-luxury-white">{photos.length}</strong></span>
              <span className="text-gold/20">|</span>
              <span className="text-green-400">Selected: <strong>{selectedCount}</strong></span>
              <span className="text-gold/20">|</span>
              <span className="text-red-400">Rejected: <strong>{rejectedCount}</strong></span>
              <span className="text-gold/20">|</span>
              <span className="text-yellow-500">Pending: <strong>{pendingCount}</strong></span>
            </div>

            {project?.selectionCompleted ? (
              <span className="bg-green-500/10 text-green-400 border border-green-500/25 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={14} />
                Choices Finalized
              </span>
            ) : (
              <button
                onClick={finalizeSelection}
                disabled={photos.length === 0}
                className="py-2 px-4 rounded-xl gold-button text-xs uppercase tracking-wider font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                Finalize Choices
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 mt-8">
        
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-[#0d0d0d]/40 p-4 rounded-xl border border-gold/10">
          {/* Search name */}
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-luxury-white/30 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search photo by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-gold/10 focus:border-gold rounded-xl py-2 pl-9 pr-4 text-xs text-luxury-white placeholder-luxury-white/20 outline-none"
            />
          </div>

          {/* Simple Tab Filters */}
          <div className="flex bg-black/30 border border-gold/5 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {['all', 'selected', 'rejected', 'pending'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === filter 
                    ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' 
                    : 'text-luxury-white/60 hover:text-luxury-white'
                }`}
              >
                {filter === 'all' ? 'All Photos' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Responsive Google-Photos Grid */}
        {paginatedPhotos.length === 0 ? (
          <p className="text-center text-luxury-white/30 py-20 text-xs italic">No wedding photos match your criteria.</p>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {paginatedPhotos.map((p, pIdx) => {
                const isSelected = p.status === 'selected';
                const isRejected = p.status === 'rejected';
                
                // Find global index in filtered array
                const globalIndex = (currentPage - 1) * itemsPerPage + pIdx;

                return (
                  <div
                    key={p._id}
                    onClick={() => {
                      setLightboxIndex(globalIndex);
                      setZoomScale(1);
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden bg-black border transition-all cursor-pointer group hover:scale-[1.02] ${
                      isSelected 
                        ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                        : isRejected 
                        ? 'border-red-500/50 opacity-40 hover:opacity-70' 
                        : 'border-white/5 hover:border-gold/30'
                    }`}
                  >
                    {/* Secure Image Canvas */}
                    <WatermarkCanvas
                      imageUrl={`http://localhost:5000${p.url}`}
                      text={studioName}
                      className="w-full h-full"
                    />

                    {/* Clean Status Overlay Icons in top corner */}
                    {isSelected && (
                      <span className="absolute top-2 right-2 bg-green-500 text-charcoal-dark p-1 rounded-full shadow-lg z-10">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    {isRejected && (
                      <span className="absolute top-2 right-2 bg-red-500 text-luxury-white p-1 rounded-full shadow-lg z-10">
                        <X size={12} strokeWidth={3} />
                      </span>
                    )}

                    {/* Subtle hover filename bar */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[8px] font-mono truncate text-luxury-white/80">{p.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6 border-t border-gold/10">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-4 py-2 rounded-xl bg-black/40 border border-gold/10 text-gold hover:border-gold text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-xs font-mono text-gold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-4 py-2 rounded-xl bg-black/40 border border-gold/10 text-gold hover:border-gold text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modern Fullscreen Lightbox Overlay */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-4 backdrop-blur-sm">
          {/* Top Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full border-b border-white/10 pb-3 gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-mono text-gold font-bold">
                PHOTO {lightboxIndex + 1} OF {filteredPhotos.length} — {filteredPhotos[lightboxIndex].name}
              </span>
              <span className="text-[10px] font-mono text-luxury-white/50 mt-0.5">
                Total Photos: {photos.length} | Selected: {selectedCount} | Rejected: {rejectedCount} | Pending: {pendingCount}
              </span>
            </div>

            {/* Lightbox controls */}
            <div className="flex items-center gap-4 self-end sm:self-auto">
              {/* Close */}
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-1 text-gold hover:text-white transition-all"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Image Container with Prev/Next buttons */}
          <div className="relative flex items-center justify-center flex-1 w-full max-h-[66vh] overflow-hidden my-2">
            
            {/* Prev arrow */}
            <button
              onClick={handlePrev}
              disabled={lightboxIndex === 0}
              className={`absolute left-4 z-30 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gold transition-all ${
                lightboxIndex === 0 ? 'opacity-10 cursor-not-allowed' : 'opacity-80'
              }`}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Zoomable Image frame (displays full aspect-ratio image up to 90% of screen without cropping) */}
            <div 
              className="flex items-center justify-center transition-transform duration-150 max-w-[90vw] max-h-[64vh] bg-black/40 rounded-xl border border-gold/10 p-1 cursor-zoom-in"
              style={{ transform: `scale(${zoomScale})` }}
              onWheel={handleWheel}
            >
              <WatermarkCanvas 
                imageUrl={`http://localhost:5000${filteredPhotos[lightboxIndex].url}`} 
                text={studioName} 
                className="max-w-full max-h-[64vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Next arrow */}
            <button
              onClick={handleNext}
              disabled={lightboxIndex === filteredPhotos.length - 1}
              className={`absolute right-4 z-30 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gold transition-all ${
                lightboxIndex === filteredPhotos.length - 1 ? 'opacity-10 cursor-not-allowed' : 'opacity-80'
              }`}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Thumbnails strip at the bottom of lightbox (Google Photos style - 100px size) */}
          <div className="flex gap-3 items-center overflow-x-auto max-w-full py-2 bg-black/20 justify-start sm:justify-center scrollbar-thin border-t border-white/5 w-full flex-shrink-0 h-[105px]">
            {filteredPhotos.map((p, idx) => {
              const isSelected = p.status === 'selected';
              const isRejected = p.status === 'rejected';
              return (
                <button 
                  key={p._id}
                  onClick={() => {
                    setLightboxIndex(idx);
                    setZoomScale(1);
                  }}
                  className={`flex-shrink-0 w-[100px] h-[75px] rounded border transition-all relative ${
                    lightboxIndex === idx 
                      ? 'border-gold scale-105 shadow-gold-sm ring-1 ring-gold/45' 
                      : isSelected
                      ? 'border-green-500 opacity-90'
                      : isRejected
                      ? 'border-red-500 opacity-60'
                      : 'border-white/10 opacity-40 hover:opacity-100'
                  }`}
                >
                  <img 
                    src={`http://localhost:5000${p.url}`} 
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

          {/* Bottom Review Action Buttons */}
          <div className="flex border-t border-white/10 pt-4 w-full justify-center gap-4 bg-black/60 pb-3">
            {!project?.selectionCompleted ? (
              <>
                {/* Select button */}
                <button
                  onClick={() => togglePhotoStatus(filteredPhotos[lightboxIndex]._id, filteredPhotos[lightboxIndex].status, 'selected')}
                  className={`py-3 px-8 rounded-xl flex items-center gap-2 text-xs font-bold uppercase transition-all ${
                    filteredPhotos[lightboxIndex].status === 'selected'
                      ? 'bg-green-500 text-charcoal-dark hover:bg-green-600 border border-green-500'
                      : 'bg-black/40 border border-green-500/40 text-green-400 hover:bg-green-500/10'
                  }`}
                >
                  <Heart size={14} fill={filteredPhotos[lightboxIndex].status === 'selected' ? "currentColor" : "none"} />
                  Select Photo
                </button>

                {/* Reject button */}
                <button
                  onClick={() => togglePhotoStatus(filteredPhotos[lightboxIndex]._id, filteredPhotos[lightboxIndex].status, 'rejected')}
                  className={`py-3 px-8 rounded-xl flex items-center gap-2 text-xs font-bold uppercase transition-all ${
                    filteredPhotos[lightboxIndex].status === 'rejected'
                      ? 'bg-red-500 text-luxury-white hover:bg-red-600 border border-red-500'
                      : 'bg-black/40 border border-red-500/40 text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <Trash2 size={14} />
                  Reject Photo
                </button>
              </>
            ) : (
              <p className="text-xs text-luxury-white/50 italic py-2">Reviews are closed for this project.</p>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default PhotoSelector;
