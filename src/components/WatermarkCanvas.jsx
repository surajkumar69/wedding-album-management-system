import React, { useEffect, useRef, useState } from 'react';

const WatermarkCanvas = ({ imageUrl, text = "Rahul Sankhala Studio", className = "" }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const img = new Image();
    // Allow cross-origin requests for canvas drawing if needed
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Match canvas dimensions to the natural image size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw the original image onto the canvas
      ctx.drawImage(img, 0, 0);

      // Apply client-side diagonal watermark overlay
      ctx.save();
      const diagAngle = -30 * Math.PI / 180;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(diagAngle);

      // Responsive font sizing
      const fontSize = Math.max(20, Math.floor(canvas.width / 16));
      ctx.font = `bold ${fontSize}px 'Playfair Display', Georgia, serif`;
      
      // Semi-transparent gold color
      ctx.fillStyle = "rgba(212, 175, 55, 0.25)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Draw watermark text repeating or single centered
      ctx.fillText(text.toUpperCase(), 0, -fontSize * 0.4);

      // Subtext
      ctx.font = `italic ${Math.floor(fontSize * 0.45)}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillText("PREVIEW ONLY - SHIELDED", 0, fontSize * 0.6);

      ctx.restore();
      setLoading(false);
    };

    img.onerror = () => {
      setLoading(false);
      setError(true);
    };
  }, [imageUrl, text]);

  // Disable context menu handler
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  return (
    <div 
      className={`relative select-none no-select overflow-hidden bg-charcoal-dark border border-gold/10 rounded-lg group ${className}`}
      onContextMenu={handleContextMenu}
    >
      {/* Transparent Overlay Shield to prevent dragging and click inspection */}
      <div 
        className="absolute inset-0 z-10 w-full h-full bg-transparent"
        style={{ pointerEvents: 'auto' }}
        onContextMenu={handleContextMenu}
        onDragStart={(e) => e.preventDefault()}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-charcoal-dark z-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-charcoal/50 text-red-400 z-20">
          <span className="text-2xl mb-1">⚠️</span>
          <p className="text-xs font-medium">Failed to load preview image securely.</p>
        </div>
      )}

      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-contain pointer-events-none" 
        style={{ display: loading || error ? 'none' : 'block' }}
      />
    </div>
  );
};

export default WatermarkCanvas;
