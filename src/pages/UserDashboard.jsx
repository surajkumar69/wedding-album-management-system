import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import AlbumCreator from './AlbumCreator';
import { 
  FolderPlus, Image, HelpCircle, User, Users, LogOut, CheckCircle, 
  XCircle, Clock, Link, QrCode, Search, Send, Paperclip, Smile, Eye, EyeOff
} from 'lucide-react';

const UserDashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  // Dashboard & Project Lists
  const [myAlbums, setMyAlbums] = useState([]);
  const [mySelections, setMySelections] = useState([]);
  const [activeServices, setActiveServices] = useState([]);
  
  // Photo Selection detail tracking
  const [selectedSelection, setSelectedSelection] = useState(null);
  const [selectionPhotos, setSelectionPhotos] = useState([]);
  
  // Selection creation form
  const [selectionTitle, setSelectionTitle] = useState('');
  const [selectionPhotosFiles, setSelectionPhotosFiles] = useState([]);
  const [uploadingSelection, setUploadingSelection] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  // Chat States with Admin
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatAttachment, setChatAttachment] = useState(null);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  // Profile Form States
  const [studioName, setStudioName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [prefilledAlbumData, setPrefilledAlbumData] = useState(null);

  const { user, token, logout, updateProfile } = useAuth();

  const handleCreateAlbumFromSelection = (sel) => {
    setPrefilledAlbumData({
      clientName: sel.title || '',
      albumTitle: `${sel.title || ''} Final Album`,
      brideName: '',
      groomName: '',
      eventDate: new Date(sel.createdAt).toISOString().split('T')[0]
    });
    setActiveMenu('create-album');
  };
  const { socket, alerts, typingStates, onlineUsers } = useSocket();
  const chatBottomRef = useRef(null);

  const API_URL = 'http://localhost:5000/api';

  // Initialize profile values
  useEffect(() => {
    if (user) {
      setPhone(user.phone || '');
      setStudioName(user.studioName || 'Rahul Sankhala Studio');
      setOwnerName(user.ownerName || 'Rahul Sankhala');
    }
  }, [user]);

  // Fetch albums, selections, services
  const fetchData = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      const albumsRes = await fetch(`${API_URL}/album/my-albums`, { headers: authHeader });
      const albumsData = await albumsRes.json();
      if (albumsRes.ok) setMyAlbums(albumsData);

      const selRes = await fetch(`${API_URL}/selection/my-selections`, { headers: authHeader });
      const selData = await selRes.json();
      if (selRes.ok) setMySelections(selData);

      const svcRes = await fetch(`${API_URL}/album/services`, { headers: authHeader });
      const svcData = await svcRes.json();
      if (svcRes.ok) setActiveServices(svcData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeMenu]);

  // Load chat history with Admin
  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/messages/history/admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setChatMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeMenu === 'messages') {
      fetchChatHistory();
    }
  }, [activeMenu]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Socket triggers for messages and alerts
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // Append if it is between user and admin
      if (msg.senderId === 'admin' || msg.receiverId === 'admin') {
        setChatMessages(prev => [...prev, msg]);
      }
    };

    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket]);

  // Socket trigger for typing states
  useEffect(() => {
    setAdminTyping(!!typingStates['admin']);
  }, [typingStates]);

  // Fetch Photographer Selection Folder Detail (favorites/rejects)
  const viewSelectionDetails = async (id) => {
    try {
      const res = await fetch(`${API_URL}/selection/photographer/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedSelection(data);
        setSelectionPhotos(data.photos || []);
        setActiveMenu('selection-details');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Selection project
  const handleCreateSelection = async (e) => {
    e.preventDefault();
    if (!selectionTitle || selectionPhotosFiles.length === 0) return;

    setUploadingSelection(true);
    setUploadSuccess('');
    
    const formData = new FormData();
    formData.key = 'photos';
    formData.append('title', selectionTitle);
    formData.append('studioName', studioName || 'Rahul Sankhala Studio');
    for (let file of selectionPhotosFiles) {
      formData.append('photos', file);
    }

    try {
      const res = await fetch(`${API_URL}/selection/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setUploadSuccess('Proofing folder uploaded, watermarked, and generated successfully!');
        setSelectionTitle('');
        setSelectionPhotosFiles([]);
        fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to create selection project.');
    } finally {
      setUploadingSelection(false);
    }
  };

  // Send Message to Admin support
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() && !chatAttachment) return;

    const formData = new FormData();
    formData.append('receiverId', 'admin');
    formData.append('content', chatInput);
    if (chatAttachment) {
      formData.append('attachment', chatAttachment);
    }

    try {
      const res = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, data]);
        setChatInput('');
        setChatAttachment(null);
        socket.emit('stopTyping', { senderId: user.id, receiverId: 'admin' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Chat typing handler
  const handleChatInputChange = (val) => {
    setChatInput(val);
    if (!socket) return;
    
    if (val.length > 0) {
      socket.emit('typing', { senderId: user.id, receiverId: 'admin' });
    } else {
      socket.emit('stopTyping', { senderId: user.id, receiverId: 'admin' });
    }
  };

  const insertEmoji = (emoji) => {
    handleChatInputChange(chatInput + emoji);
    setShowEmojiPanel(false);
  };

  // Update Profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    try {
      await updateProfile({ studioName, ownerName, phone, password });
      setProfileSuccess('Profile metadata and password updated successfully.');
      setPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  // Photo lists split counters (important selection folders metrics)
  const selectedPhotos = selectionPhotos.filter(p => p.status === 'selected');
  const rejectedPhotos = selectionPhotos.filter(p => p.status === 'rejected');
  const remainingPhotos = selectionPhotos.filter(p => p.status === 'pending');

  return (
    <div className="flex h-screen w-screen bg-charcoal-dark overflow-hidden font-sans text-luxury-white">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-charcoal border-r border-gold/15 flex flex-col justify-between p-6">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10 border-b border-gold/10 pb-4">
            <span className="text-xl font-serif font-bold tracking-widest text-gold">AURA</span>
            <span className="text-[10px] bg-gold/15 text-gold border border-gold/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">STUDIO</span>
          </div>

          {/* Menus */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveMenu('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'dashboard' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <FolderPlus size={18} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveMenu('create-album')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'create-album' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <FolderPlus size={18} />
              Create Album
            </button>
            <button
              onClick={() => setActiveMenu('my-albums')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'my-albums' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <FolderPlus size={18} />
              My Albums
            </button>
            <button
              onClick={() => setActiveMenu('clients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'clients' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <Users size={18} />
              Clients
            </button>
            <button
              onClick={() => setActiveMenu('photo-selection')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                ['photo-selection', 'selection-details'].includes(activeMenu) ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <Image size={18} />
              Photo Proofing
            </button>
            <button
              onClick={() => setActiveMenu('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'messages' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <HelpCircle size={18} />
              Message Box
            </button>
            <button
              onClick={() => setActiveMenu('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'profile' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <User size={18} />
              Profile
            </button>
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-500/10 transition-all mt-6"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 h-full overflow-y-auto bg-[#090909] p-8">

        {/* 1. PHOTOGRAPHER DASHBOARD OVERVIEW */}
        {activeMenu === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">Studio Overview</h1>
              <p className="text-xs text-luxury-white/50">Manage your wedding client workflows from a single workspace.</p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel p-6 rounded-2xl border border-gold/10">
                <p className="text-xs text-gold font-bold uppercase tracking-wider">Active Wedding Albums</p>
                <p className="text-4xl font-serif font-bold text-luxury-white mt-2">{myAlbums.length}</p>
                <div className="h-1 w-12 bg-gold mt-4 rounded" />
              </div>
              <div className="glass-panel p-6 rounded-2xl border border-gold/10">
                <p className="text-xs text-gold font-bold uppercase tracking-wider">Selection Folders uploaded</p>
                <p className="text-4xl font-serif font-bold text-luxury-white mt-2">{mySelections.length}</p>
                <div className="h-1 w-12 bg-gold mt-4 rounded" />
              </div>
            </div>

            {/* Client Real-time Activity Alerts (Photographer alerts panel) */}
            <div className="glass-panel p-6 rounded-2xl border border-gold/10">
              <h3 className="text-lg font-serif text-gold font-semibold mb-4">Live Client Selection Activity</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {alerts.length === 0 ? (
                  <p className="text-xs text-luxury-white/40 py-8 text-center">Awaiting client selection actions...</p>
                ) : (
                  alerts.map((al, idx) => (
                    <div key={idx} className="bg-charcoal/40 border border-gold/5 p-3 rounded-lg text-xs flex justify-between gap-3">
                      <div>
                        <span className="font-bold text-gold mr-1">Selection:</span>
                        <span className="text-luxury-white/85">{al.message}</span>
                      </div>
                      <span className="text-[10px] text-luxury-white/40 font-mono flex-shrink-0">
                        {new Date(al.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. SERVICES LIST */}
        {activeMenu === 'services' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">Platform Services Selection</h1>
              <p className="text-xs text-luxury-white/50">Only active (visible) packages are displayed here.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {activeServices.length === 0 ? (
                <div className="glass-panel p-8 rounded-2xl text-center col-span-2 opacity-50">
                  <p className="text-sm">Predefined services are hidden by Administrator.</p>
                </div>
              ) : (
                activeServices.map(s => (
                  <div key={s._id} className="glass-panel p-6 rounded-2xl border border-gold/10 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-serif text-gold font-bold mb-3">{s.name}</h3>
                      <p className="text-sm text-luxury-white/60 leading-relaxed mb-6">{s.description}</p>
                    </div>
                    <button className="w-full mt-4 py-3 rounded-xl gold-button text-xs uppercase tracking-wider font-bold">
                      Book Service
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MY ALBUMS VIEW */}
        {activeMenu === 'my-albums' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">My Compiled Wedding Albums</h1>
              <p className="text-xs text-luxury-white/50">Manage completed double-page 3D page-flip wedding books.</p>
            </div>

            {myAlbums.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl text-center opacity-50 col-span-full">
                <p className="text-sm">No albums compiled yet. Use 'Create Album' or compile from selections inside 'Clients' to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myAlbums.map(alb => (
                  <div key={alb._id} className="glass-panel p-6 rounded-2xl border border-gold/10 flex flex-col justify-between hover:border-gold/30 transition-all bg-charcoal/30">
                    <div>
                      <h4 className="text-lg font-serif font-bold text-gold mb-1">{alb.albumTitle || 'Wedding Album'}</h4>
                      <p className="text-xs text-luxury-white/60 mb-4">{alb.clientName || 'N/A'}'s Special Book</p>
                      
                      <div className="space-y-2 text-xs text-luxury-white/70 mb-6 bg-charcoal-dark/40 p-3 rounded-xl border border-gold/5">
                        <p><span className="font-semibold text-gold">Bride:</span> {alb.brideName || 'N/A'}</p>
                        <p><span className="font-semibold text-gold">Groom:</span> {alb.groomName || 'N/A'}</p>
                        <p><span className="font-semibold text-gold">Event Date:</span> {alb.eventDate ? new Date(alb.eventDate).toLocaleDateString() : 'N/A'}</p>
                        <p><span className="font-semibold text-gold">Spreads:</span> {alb.sheets ? alb.sheets.length : 0} Layout Sheets</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <a
                          href={alb.albumUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 rounded-xl bg-gold hover:bg-gold-dark text-charcoal-dark font-bold text-xs uppercase tracking-wider transition-all text-center"
                        >
                          View Flipbook
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(alb.albumUrl);
                            alert("Album URL copied!");
                          }}
                          className="px-3 py-2 rounded-xl bg-charcoal border border-gold/10 text-gold hover:border-gold transition-all text-xs font-bold"
                          title="Copy Link"
                        >
                          Copy Link
                        </button>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl">
                        <p className="text-[9px] font-bold text-charcoal-dark uppercase tracking-wider mb-2">Scan QR Code</p>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(alb.albumUrl)}`} 
                          alt="Album QR" 
                          className="w-24 h-24 border border-gold/10"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. WEDDING ALBUM CREATOR */}
        {activeMenu === 'create-album' && (
          <AlbumCreator 
            studioName={studioName} 
            studioOwnerName={ownerName} 
            mobileNumber={phone} 
            gmail={user ? user.email : ''} 
            prefilledData={prefilledAlbumData}
          />
        )}

        {/* 4. PHOTO SELECTION FOLDER MANAGEMENT */}
        {activeMenu === 'photo-selection' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">Client Photo Selection Projects</h1>
              <p className="text-xs text-luxury-white/50">Upload event picture folders, generate proofing URLs, and monitor favorites.</p>
            </div>

            {/* Folder setup Wizard */}
            <div className="glass-panel p-6 rounded-2xl border border-gold/15">
              <h3 className="text-lg font-serif text-gold font-semibold mb-4">Upload New Proofing Folder</h3>
              <form onSubmit={handleCreateSelection} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gold/80 mb-2 uppercase tracking-wider">Event Name / Title</label>
                    <input
                      type="text"
                      required
                      value={selectionTitle}
                      onChange={(e) => setSelectionTitle(e.target.value)}
                      placeholder="e.g. Rohan & Priya Wedding"
                      className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-3 px-4 text-xs text-luxury-white placeholder-luxury-white/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gold/80 mb-2 uppercase tracking-wider">Upload Images Folder</label>
                    <input
                      type="file"
                      multiple
                      webkitdirectory=""
                      directory=""
                      required
                      accept="image/*"
                      onChange={(e) => setSelectionPhotosFiles(Array.from(e.target.files))}
                      className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2 px-4 text-xs text-luxury-white outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold file:text-charcoal-dark file:cursor-pointer"
                    />
                  </div>
                </div>

                {uploadSuccess && (
                  <p className="text-xs text-green-400 font-semibold">{uploadSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={uploadingSelection}
                  className="py-3 px-6 rounded-xl gold-button text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {uploadingSelection ? 'Watermarking & Uploading folder...' : 'Create Proofing Project'}
                </button>
              </form>
            </div>

            {/* Uploaded folders list */}
            <div className="space-y-4">
              <h3 className="text-lg font-serif text-gold font-semibold">Existing Selection Folders</h3>
              
              {mySelections.length === 0 ? (
                <p className="text-xs text-luxury-white/30 italic">No proofing folders created yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mySelections.map(sel => {
                    const selCount = sel.photos.filter(p => p.status === 'selected').length;
                    const rejCount = sel.photos.filter(p => p.status === 'rejected').length;
                    const penCount = sel.photos.filter(p => p.status === 'pending').length;

                    return (
                      <div key={sel._id} className="glass-panel p-6 rounded-2xl border border-gold/10 hover:border-gold/30 transition-all flex flex-col justify-between">
                        <div>
                          <h4 className="text-lg font-serif font-bold text-gold mb-2">{sel.title}</h4>
                          <p className="text-[10px] text-luxury-white/40 font-mono mb-4">Project ID: {sel._id}</p>
                          
                          {/* Folder metrics display */}
                          <div className="grid grid-cols-4 gap-2 text-center bg-charcoal-dark/50 p-3 rounded-xl border border-gold/5 mb-4">
                            <div>
                              <p className="text-[10px] text-luxury-white/40">Total</p>
                              <p className="text-sm font-bold font-mono">{sel.photos.length}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-green-400">Selected</p>
                              <p className="text-sm font-bold font-mono text-green-400">{selCount}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-red-400">Rejected</p>
                              <p className="text-sm font-bold font-mono text-red-400">{rejCount}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-yellow-500">Pending</p>
                              <p className="text-sm font-bold font-mono text-yellow-500">{penCount}</p>
                            </div>
                          </div>
                        </div>

                        {/* View actions */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => viewSelectionDetails(sel._id)}
                            className="flex-1 py-2.5 rounded-xl border border-gold/20 text-gold hover:border-gold hover:bg-gold/10 font-bold text-xs uppercase tracking-wider transition-all"
                          >
                            Monitor Status
                          </button>
                          <a
                            href={`${window.location.origin}/select/${sel._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2.5 rounded-xl bg-charcoal border border-gold/10 text-gold hover:border-gold transition-all flex items-center justify-center"
                            title="Open client link"
                          >
                            <Link size={16} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4.1 FOLDER SELECTIONS TRACKING SUB-VIEW */}
        {activeMenu === 'selection-details' && selectedSelection && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-gold/10 pb-4">
              <div>
                <button 
                  onClick={() => setActiveMenu('photo-selection')}
                  className="text-xs text-gold/60 hover:text-gold font-bold uppercase tracking-wider mb-2 block"
                >
                  ← Back to folders
                </button>
                <h1 className="text-3xl font-serif text-gold font-bold">{selectedSelection.title}</h1>
              </div>

              {/* Status Tags */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  selectedSelection.selectionCompleted 
                    ? 'bg-green-500/10 text-green-400 border-green-500/25 animate-pulse' 
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25'
                }`}>
                  {selectedSelection.selectionCompleted ? 'Client Proofing Completed' : 'Client Review In-Progress'}
                </span>

                {selectedSelection.selectionCompleted && (
                  <button
                    onClick={() => handleCreateAlbumFromSelection(selectedSelection)}
                    className="py-1 px-3 text-xs bg-gold text-charcoal-dark hover:bg-gold-dark rounded font-bold uppercase tracking-wider transition-all shadow-gold-sm"
                  >
                    Create Final Wedding Album
                  </button>
                )}
              </div>
            </div>

            {/* Platform QR code & Share links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-2xl border border-gold/10 md:col-span-2 flex flex-col justify-between">
                <div>
                  <h4 className="text-md font-serif text-gold font-bold mb-3">Secure Client proofing assets</h4>
                  <p className="text-xs text-luxury-white/60 mb-6">Send the secure URL or QR code to your wedding clients. Images are watermarked and code inspection is blocked.</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gold mb-1">Share Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/select/${selectedSelection._id}`}
                        className="flex-1 bg-charcoal-dark border border-gold/10 rounded-xl py-2.5 px-4 text-xs font-mono text-luxury-white outline-none"
                      />
                      <button 
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/select/${selectedSelection._id}`)}
                        className="px-4 rounded-xl gold-button text-xs font-bold"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-gold/10 flex flex-col items-center justify-center text-center">
                <p className="text-xs font-bold text-gold uppercase tracking-wider mb-3">Project QR Code</p>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/select/${selectedSelection._id}`)}`}
                  alt="QR code" 
                  className="border border-gold/10 p-2 rounded-xl bg-white w-32 h-32"
                />
              </div>
            </div>

            {/* Folder breakdown list displaying Selected/Rejected/Remaining */}
            <div className="space-y-6">
              {/* Selected folder */}
              <div>
                <h3 className="text-md font-serif text-green-400 font-bold border-b border-green-500/10 pb-2 mb-4 flex items-center justify-between">
                  <span>Selected Favorites ({selectedPhotos.length})</span>
                </h3>
                {selectedPhotos.length === 0 ? (
                  <p className="text-xs text-luxury-white/30 italic">No photos favorited yet by client.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {selectedPhotos.map(p => (
                      <div key={p._id} className="glass-panel border border-green-500/20 rounded-xl overflow-hidden text-center bg-charcoal-dark/40 p-2">
                        <img src={`http://localhost:5000${p.url}`} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-2" />
                        <p className="text-[10px] truncate font-mono text-luxury-white/70">{p.name}</p>
                        <p className="text-[8px] text-green-400 mt-1 flex items-center justify-center gap-1">
                          <Clock size={8} />
                          {new Date(p.selectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rejected folder */}
              <div>
                <h3 className="text-md font-serif text-red-400 font-bold border-b border-red-500/10 pb-2 mb-4 flex items-center justify-between">
                  <span>Rejected / Deleted ({rejectedPhotos.length})</span>
                </h3>
                {rejectedPhotos.length === 0 ? (
                  <p className="text-xs text-luxury-white/30 italic">No photos rejected yet by client.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {rejectedPhotos.map(p => (
                      <div key={p._id} className="glass-panel border border-red-500/20 rounded-xl overflow-hidden text-center bg-charcoal-dark/40 p-2">
                        <img src={`http://localhost:5000${p.url}`} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-2 opacity-50" />
                        <p className="text-[10px] truncate font-mono text-luxury-white/70">{p.name}</p>
                        <p className="text-[8px] text-red-400 mt-1 flex items-center justify-center gap-1">
                          <Clock size={8} />
                          {new Date(p.rejectedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remaining folder */}
              <div>
                <h3 className="text-md font-serif text-yellow-500 font-bold border-b border-yellow-500/10 pb-2 mb-4">
                  Awaiting Review / Remaining ({remainingPhotos.length})
                </h3>
                {remainingPhotos.length === 0 ? (
                  <p className="text-xs text-luxury-white/30 italic">All photos reviewed by client!</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {remainingPhotos.map(p => (
                      <div key={p._id} className="glass-panel border border-yellow-500/20 rounded-xl overflow-hidden text-center bg-charcoal-dark/40 p-2">
                        <img src={`http://localhost:5000${p.url}`} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-2" />
                        <p className="text-[10px] truncate font-mono text-luxury-white/70">{p.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. MESSAGES WITH ADMIN */}
        {activeMenu === 'messages' && (
          <div className="h-[80vh] flex flex-col border border-gold/15 rounded-2xl overflow-hidden glass-panel">
            {/* Header info */}
            <div className="p-4 border-b border-gold/10 flex items-center justify-between bg-charcoal-dark">
              <div>
                <h4 className="text-sm font-bold text-gold">AURA Platform Support</h4>
                <p className="text-[10px] text-luxury-white/40">Chat directly with pre-defined system admin</p>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border ${
                onlineUsers.includes('admin') 
                  ? 'bg-green-500/10 text-green-400 border-green-500/25' 
                  : 'bg-luxury-white/5 text-luxury-white/30 border-luxury-white/10'
              }`}>
                {onlineUsers.includes('admin') ? 'Admin Online' : 'Admin Offline'}
              </span>
            </div>

            {/* Chat logs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {chatMessages.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <p className="text-xs">No support history logs. Type a message below to start inquiries.</p>
                </div>
              ) : (
                chatMessages.map((m, idx) => {
                  const isSenderAdmin = m.senderId === 'admin';
                  return (
                    <div key={idx} className={`flex ${!isSenderAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl p-3 border text-xs ${
                        !isSenderAdmin 
                          ? 'bg-gradient-to-br from-gold to-gold-dark text-charcoal-dark border-gold/30 rounded-tr-none font-medium' 
                          : 'bg-charcoal border-gold/10 text-luxury-white rounded-tl-none'
                      }`}>
                        <p>{m.content}</p>

                        {/* File Link rendering */}
                        {m.fileUrl && (
                          <div className="mt-2 pt-2 border-t border-black/10 flex items-center gap-2">
                            <span className="text-[10px]">📎</span>
                            <a 
                              href={`http://localhost:5000${m.fileUrl}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="underline text-[10px] font-semibold break-all"
                            >
                              {m.fileName}
                            </a>
                          </div>
                        )}

                        <span className="text-[8px] opacity-40 block text-right mt-1.5 font-mono">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {adminTyping && (
                <div className="flex justify-start">
                  <div className="bg-charcoal border border-gold/10 rounded-2xl rounded-tl-none p-3 text-xs text-luxury-white/60">
                    <span className="italic mr-1.5">Admin is typing</span>
                    <span className="typing-dots"><span></span><span></span><span></span></span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Chat inputs */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gold/10 bg-charcoal-dark space-y-2">
              {chatAttachment && (
                <div className="bg-charcoal/50 border border-gold/10 p-2 rounded-lg text-xs flex justify-between items-center">
                  <span className="truncate">Selected File: {chatAttachment.name}</span>
                  <button type="button" onClick={() => setChatAttachment(null)} className="text-red-400 hover:text-red-300 font-bold px-1">✕</button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="p-2.5 rounded-xl border border-gold/10 hover:border-gold hover:bg-gold/5 text-gold transition-all cursor-pointer flex-shrink-0" title="Attach file">
                  <Paperclip size={16} />
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setChatAttachment(e.target.files[0])}
                  />
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPanel(!showEmojiPanel)}
                    className="p-2.5 rounded-xl border border-gold/10 hover:border-gold hover:bg-gold/5 text-gold transition-all flex-shrink-0"
                    title="Emoji panel"
                  >
                    <Smile size={16} />
                  </button>
                  {showEmojiPanel && (
                    <div className="absolute bottom-12 left-0 bg-charcoal border border-gold/25 p-2 rounded-lg grid grid-cols-5 gap-1.5 shadow-gold-lg z-35">
                      {['😊', '👍', '❤️', '👏', '💍', '🎉', '📸', '📅', '✨', '💐'].map(emo => (
                        <button 
                          key={emo} 
                          type="button" 
                          onClick={() => insertEmoji(emo)} 
                          className="hover:bg-gold/20 p-1 text-sm rounded"
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Type message for platform admins..."
                  value={chatInput}
                  onChange={(e) => handleChatInputChange(e.target.value)}
                  className="flex-1 bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white placeholder-luxury-white/20 outline-none"
                />

                <button
                  type="submit"
                  className="p-2.5 rounded-xl gold-button flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 6. PROFILE VIEW */}
        {activeMenu === 'profile' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">Studio Settings</h1>
              <p className="text-xs text-luxury-white/50">Edit your photographer credentials and studio branding details.</p>
            </div>

            <div className="glass-panel p-8 rounded-2xl border border-gold/10 max-w-2xl">
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gold/80 mb-2 uppercase tracking-wider">Studio Name</label>
                    <input
                      type="text"
                      required
                      value={studioName}
                      onChange={(e) => setStudioName(e.target.value)}
                      className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-3 px-4 text-xs text-luxury-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gold/80 mb-2 uppercase tracking-wider">Studio Owner Name</label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-3 px-4 text-xs text-luxury-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gold/80 mb-2 uppercase tracking-wider">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-3 px-4 text-xs text-luxury-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gold/80 mb-2 uppercase tracking-wider">Gmail / Email ID</label>
                    <input
                      type="email"
                      disabled
                      value={user ? user.email : ''}
                      className="w-full bg-charcoal-dark border border-gold/5 cursor-not-allowed rounded-xl py-3 px-4 text-xs text-luxury-white/40 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gold/80 mb-2 uppercase tracking-wider">Change Password (Leave blank to keep current)</label>
                  <input
                    type="password"
                    placeholder="Enter new password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-3 px-4 text-xs text-luxury-white placeholder-luxury-white/20 outline-none"
                  />
                </div>

                {profileSuccess && (
                  <p className="text-xs text-green-400 font-semibold">{profileSuccess}</p>
                )}

                <button
                  type="submit"
                  className="py-3 px-6 rounded-xl gold-button text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Save Profile Settings
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CLIENTS VIEW */}
        {activeMenu === 'clients' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">Client Directory</h1>
              <p className="text-xs text-luxury-white/50">Manage contact information and tracking timelines for all event directories.</p>
            </div>

            <div className="glass-panel rounded-2xl border border-gold/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-charcoal text-gold text-xs uppercase tracking-wider font-semibold border-b border-gold/10">
                    <th className="p-4">Client Name</th>
                    <th className="p-4">Event Details</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Proofing Status</th>
                    <th className="p-4">Flipbook Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/5 text-sm">
                  {mySelections.length === 0 && myAlbums.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-luxury-white/40">No client profiles found. Use 'Photo Proofing' or 'Create Album' to get started.</td>
                    </tr>
                  ) : (
                    mySelections.map(sel => {
                      const hasAlbum = myAlbums.find(alb => alb.clientName === sel.title || alb.albumTitle === sel.title);
                      return (
                        <tr key={sel._id} className="hover:bg-gold/5 transition-all">
                          <td className="p-4 font-bold">{sel.title}</td>
                          <td className="p-4 text-xs text-luxury-white/70">Proofing Project</td>
                          <td className="p-4 text-xs text-luxury-white/50">{new Date(sel.createdAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              sel.selectionCompleted 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            }`}>
                              {sel.selectionCompleted ? 'Proofing Completed' : 'In Selection'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              hasAlbum 
                                ? 'bg-gold/15 text-gold border-gold/25' 
                                : 'bg-luxury-white/5 text-luxury-white/30 border-luxury-white/10'
                            }`}>
                              {hasAlbum ? 'Album Created' : 'No Album'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => viewSelectionDetails(sel._id)}
                                className="px-3 py-1 bg-charcoal border border-gold/15 hover:border-gold text-gold text-xs rounded transition-all font-semibold"
                              >
                                View Proofs
                              </button>
                              {sel.selectionCompleted && !hasAlbum && (
                                <button
                                  onClick={() => handleCreateAlbumFromSelection(sel)}
                                  className="px-3 py-1 bg-gold hover:bg-gold-dark text-charcoal-dark text-xs rounded transition-all font-bold"
                                >
                                  Compile Album
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default UserDashboard;
