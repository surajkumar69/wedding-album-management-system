import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Upload, Music, Link, QrCode, Clipboard } from 'lucide-react';

const AlbumCreator = ({ 
  studioName = 'Rahul Sankhala Studio', 
  studioOwnerName = 'Rahul Sankhala', 
  mobileNumber = '6376005694', 
  gmail = 'rahulsankhala1098@gmail.com',
  prefilledData = null
}) => {
  // Studio branding details
  const [sOwner, setSOwner] = useState(studioOwnerName);
  const [sName, setSName] = useState(studioName);
  const [sPhone, setSPhone] = useState(mobileNumber);
  const [sGmail, setSGmail] = useState(gmail);
  const [sInstagram, setSInstagram] = useState('');

  // Album client details
  const [clientName, setClientName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');

  useEffect(() => {
    if (prefilledData) {
      setClientName(prefilledData.clientName || '');
      setAlbumTitle(prefilledData.albumTitle || '');
      setBrideName(prefilledData.brideName || '');
      setGroomName(prefilledData.groomName || '');
      setEventDate(prefilledData.eventDate || '');
    }
  }, [prefilledData]);

  // Upload sections files state
  const [frontCover, setFrontCover] = useState(null);
  const [backCover, setBackCover] = useState(null);
  const [sheets, setSheets] = useState([]);
  
  // Audio state
  const [songType, setSongType] = useState('website'); // 'website' or 'upload'
  const [selectedSongId, setSelectedSongId] = useState('song_1');
  const [customSongFile, setCustomSongFile] = useState(null);
  const [websiteSongsList, setWebsiteSongsList] = useState([]);

  // Result generation state
  const [loading, setLoading] = useState(false);
  const [generatedAlbum, setGeneratedAlbum] = useState(null); // holds generated URL and QR
  const [copySuccess, setCopySuccess] = useState('');

  const { token } = useAuth();
  const API_URL = 'http://localhost:5000/api';

  // Load website songs on mount
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const res = await fetch(`${API_URL}/album/songs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setWebsiteSongsList(data);
          if (data.length > 0) setSelectedSongId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSongs();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!frontCover || !backCover || sheets.length === 0) {
      alert("Please upload the front cover, back cover, and at least one layout sheet.");
      return;
    }

    setLoading(true);
    setGeneratedAlbum(null);
    setCopySuccess('');

    const formData = new FormData();
    formData.append('studioOwnerName', sOwner);
    formData.append('studioName', sName);
    formData.append('mobileNumber', sPhone);
    formData.append('gmail', sGmail);
    formData.append('instagramId', sInstagram);
    formData.append('clientName', clientName);
    formData.append('brideName', brideName);
    formData.append('groomName', groomName);
    formData.append('eventDate', eventDate);
    formData.append('albumTitle', albumTitle);
    formData.append('songType', songType);
    
    if (songType === 'website') {
      formData.append('selectedSongId', selectedSongId);
    } else if (songType === 'upload' && customSongFile) {
      formData.append('customSong', customSongFile);
    }

    formData.append('frontCover', frontCover);
    formData.append('backCover', backCover);
    
    for (let file of sheets) {
      formData.append('sheets', file);
    }

    try {
      const res = await fetch(`${API_URL}/album/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedAlbum(data.album);
      } else {
        throw new Error(data.message || 'Error creating album.');
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!generatedAlbum) return;
    navigator.clipboard.writeText(generatedAlbum.albumUrl);
    setCopySuccess('Album URL copied to clipboard!');
    setTimeout(() => setCopySuccess(''), 3000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-gold font-bold">Create 3D Wedding Album</h1>
        <p className="text-xs text-luxury-white/50">Build an elegant virtual flipbook with realistic layouts, watermarks, and background tunes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Designer Wizard Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          
          {/* Step 1: Branding details */}
          <div className="glass-panel p-6 rounded-2xl border border-gold/10 space-y-4">
            <h3 className="text-md font-serif text-gold font-bold flex items-center gap-2">
              <Sparkles size={16} />
              1. Studio Details (Branding)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Studio Name</label>
                <input
                  type="text"
                  required
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Studio Owner Name</label>
                <input
                  type="text"
                  required
                  value={sOwner}
                  onChange={(e) => setSOwner(e.target.value)}
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={sPhone}
                  onChange={(e) => setSPhone(e.target.value)}
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Gmail / Email ID</label>
                <input
                  type="email"
                  required
                  value={sGmail}
                  onChange={(e) => setSGmail(e.target.value)}
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Instagram ID (Optional)</label>
                <input
                  type="text"
                  placeholder="@ownername"
                  value={sInstagram}
                  onChange={(e) => setSInstagram(e.target.value)}
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white placeholder-luxury-white/20 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Album Details */}
          <div className="glass-panel p-6 rounded-2xl border border-gold/10 space-y-4">
            <h3 className="text-md font-serif text-gold font-bold flex items-center gap-2">
              <Sparkles size={16} />
              2. Album & Client Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Client Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Rohan & Priya Wedding"
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Album Title</label>
                <input
                  type="text"
                  required
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="e.g. The Wedding Story"
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Bride Name</label>
                <input
                  type="text"
                  required
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                  placeholder="Bride Name"
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Groom Name</label>
                <input
                  type="text"
                  required
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                  placeholder="Groom Name"
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Event Date</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Upload covers & sheets */}
          <div className="glass-panel p-6 rounded-2xl border border-gold/10 space-y-4">
            <h3 className="text-md font-serif text-gold font-bold flex items-center gap-2">
              <Upload size={16} />
              3. Design Uploads (Aspect 12x36 Recommended)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Front Cover */}
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Front Cover Page</label>
                <div className="border border-dashed border-gold/20 hover:border-gold rounded-xl p-4 text-center cursor-pointer relative bg-charcoal-dark/30">
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setFrontCover(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-luxury-white/60">{frontCover ? frontCover.name : "Select Front Cover Photo"}</p>
                    <p className="text-[10px] text-luxury-white/30">Aspect ratio 12x18 typical</p>
                  </div>
                </div>
              </div>

              {/* Back Cover */}
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Back Cover Page</label>
                <div className="border border-dashed border-gold/20 hover:border-gold rounded-xl p-4 text-center cursor-pointer relative bg-charcoal-dark/30">
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setBackCover(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-luxury-white/60">{backCover ? backCover.name : "Select Back Cover Photo"}</p>
                    <p className="text-[10px] text-luxury-white/30">Aspect ratio 12x18 typical</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sheets */}
            <div>
              <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Album Sheets Layouts (Multiple Sheets)</label>
              <div className="border border-dashed border-gold/20 hover:border-gold rounded-xl p-6 text-center cursor-pointer relative bg-charcoal-dark/30">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  required
                  onChange={(e) => setSheets(Array.from(e.target.files))}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="space-y-1.5 flex flex-col items-center">
                  <span className="text-gold text-lg">📁</span>
                  <p className="text-xs text-luxury-white/60">
                    {sheets.length > 0 ? `${sheets.length} Sheets selected` : "Select or drag all 12x36 layout sheets"}
                  </p>
                  <p className="text-[10px] text-luxury-white/30">JPG lay-flat pages spreads</p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Music selection */}
          <div className="glass-panel p-6 rounded-2xl border border-gold/10 space-y-4">
            <h3 className="text-md font-serif text-gold font-bold flex items-center gap-2">
              <Music size={16} />
              4. Background Soundtrack
            </h3>

            {/* Song Type Switcher */}
            <div className="flex gap-4 border-b border-gold/5 pb-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="songType"
                  checked={songType === 'website'}
                  onChange={() => setSongType('website')}
                  className="accent-gold"
                />
                Choose Website Soundtrack
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="songType"
                  checked={songType === 'upload'}
                  onChange={() => setSongType('upload')}
                  className="accent-gold"
                />
                Upload Custom MP3 File
              </label>
            </div>

            {songType === 'website' ? (
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Select Preset Audio</label>
                <select
                  value={selectedSongId}
                  onChange={(e) => setSelectedSongId(e.target.value)}
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white outline-none"
                >
                  {websiteSongsList.map(song => (
                    <option key={song.id} value={song.id}>{song.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Upload MP3 Track</label>
                <input
                  type="file"
                  accept="audio/mp3"
                  required={songType === 'upload'}
                  onChange={(e) => setCustomSongFile(e.target.files[0])}
                  className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2 px-4 text-xs text-luxury-white outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold file:text-charcoal-dark file:cursor-pointer"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl gold-button text-sm uppercase tracking-widest font-bold disabled:opacity-50"
          >
            {loading ? 'Compiling 3D sheets & uploading files...' : 'Generate 3D Flipbook Album'}
          </button>

        </form>

        {/* Action result display panel */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-gold/15 sticky top-6 flex flex-col items-center justify-center text-center min-h-[350px]">
            {generatedAlbum ? (
              <div className="space-y-5 w-full">
                <span className="text-green-400 text-5xl">✨</span>
                <h3 className="text-xl font-serif text-gold font-bold">Album Live!</h3>
                <p className="text-xs text-luxury-white/60 leading-relaxed">Compilation complete. You can copy the secure link or scan the QR code to open the realistic Flipbook.</p>

                {/* QR Code */}
                <div className="flex justify-center border border-gold/10 p-2.5 rounded-xl bg-white w-32 h-32 mx-auto shadow-md">
                  <img src={generatedAlbum.qrCode} alt="Album QR code" className="w-full h-full" />
                </div>

                {/* Share Link */}
                <div className="space-y-2 text-left">
                  <label className="block text-[10px] font-bold text-gold uppercase tracking-wider">Secure Sharing URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedAlbum.albumUrl}
                      className="flex-1 bg-charcoal-dark border border-gold/10 rounded-xl py-2 px-3 text-[10px] font-mono text-luxury-white outline-none"
                    />
                    <button 
                      onClick={copyLink}
                      className="p-2 rounded-xl gold-button hover:scale-105"
                      title="Copy URL"
                    >
                      <Clipboard size={14} />
                    </button>
                  </div>
                  {copySuccess && (
                    <p className="text-[10px] text-green-400 font-semibold">{copySuccess}</p>
                  )}
                </div>

                <a
                  href={generatedAlbum.albumUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full py-3 rounded-xl border border-gold text-gold hover:bg-gold hover:text-charcoal-dark font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Launch Flipbook Viewer
                </a>

              </div>
            ) : (
              <div className="opacity-40 space-y-3">
                <span className="text-4xl">📖</span>
                <h3 className="text-md font-serif text-gold font-bold">Preview Output</h3>
                <p className="text-xs px-4">Complete the form and select layouts to compile the wedding digital album.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AlbumCreator;
