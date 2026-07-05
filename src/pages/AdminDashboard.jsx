import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Users, Layers, MessageSquare, LogOut, ShieldAlert, CheckCircle, 
  Trash2, Eye, EyeOff, Search, Send, Paperclip, Smile 
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAlbums: 0,
    totalSelections: 0,
    photoStats: { totalPhotos: 0, totalSelected: 0, totalRejected: 0, totalPending: 0 },
    services: []
  });
  
  const [usersList, setUsersList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [albumsList, setAlbumsList] = useState([]);
  const [selectionsList, setSelectionsList] = useState([]);
  
  // Chat States
  const [chatUsers, setChatUsers] = useState([]); // user list for chat sidebar
  const [activeChatUser, setActiveChatUser] = useState(null); // currently selected user
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [chatAttachment, setChatAttachment] = useState(null);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);

  const { token, logout } = useAuth();
  const { socket, onlineUsers, typingStates, alerts } = useSocket();
  const chatBottomRef = useRef(null);

  const API_URL = 'http://localhost:5000/api';

  // Fetch admin general stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all users list
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUsersList(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all services
  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setServicesList(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all albums
  const fetchAlbums = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/albums`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setAlbumsList(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all proofing folders
  const fetchSelections = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/selections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSelectionsList(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch admin chat user list
  const fetchChatUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/messages/admin/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setChatUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch chat history for selected user
  const fetchChatHistory = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/messages/history/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(data);
        // Decrease unread count locally
        setChatUsers(prev => prev.map(cu => cu.userId === userId ? { ...cu, unreadCount: 0 } : cu));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchServices();
    fetchAlbums();
    fetchSelections();
    fetchChatUsers();
  }, [activeMenu]);

  // Load chat history when active chat user changes
  useEffect(() => {
    if (activeChatUser) {
      fetchChatHistory(activeChatUser.userId);
    }
  }, [activeChatUser]);

  // Socket listener for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // If message is from/to the currently active user, append to messages
      if (activeChatUser && (msg.senderId === activeChatUser.userId || msg.receiverId === activeChatUser.userId)) {
        setChatMessages(prev => [...prev, msg]);
        // Call API to mark as read
        fetch(`${API_URL}/messages/history/${activeChatUser.userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        // Increment unread count in sidebar list
        setChatUsers(prev => prev.map(cu => {
          if (cu.userId === msg.senderId) {
            return {
              ...cu,
              unreadCount: cu.unreadCount + 1,
              latestMessage: msg.content,
              lastActive: new Date().toISOString()
            };
          }
          return cu;
        }));
      }
    };

    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket, activeChatUser]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // User Actions: Block/Unblock
  const toggleBlockUser = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/toggle-block`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // User Actions: Delete
  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Service Actions: Toggle Visibility (Hide/Show)
  const toggleServiceVisibility = async (serviceId) => {
    try {
      const res = await fetch(`${API_URL}/admin/services/${serviceId}/toggle-visibility`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchServices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() && !chatAttachment) return;
    if (!activeChatUser) return;

    const formData = new FormData();
    formData.append('receiverId', activeChatUser.userId);
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
        // Reset typing indicator on socket
        socket.emit('stopTyping', { senderId: 'admin', receiverId: activeChatUser.userId });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Chat typing handler
  const handleChatInputChange = (val) => {
    setChatInput(val);
    if (!socket || !activeChatUser) return;
    
    if (val.length > 0) {
      socket.emit('typing', { senderId: 'admin', receiverId: activeChatUser.userId });
    } else {
      socket.emit('stopTyping', { senderId: 'admin', receiverId: activeChatUser.userId });
    }
  };

  // Emoji Click
  const insertEmoji = (emoji) => {
    handleChatInputChange(chatInput + emoji);
    setShowEmojiPanel(false);
  };

  // Search User in Chat Sidebar
  const filteredChatUsers = chatUsers.filter(u => 
    u.email.toLowerCase().includes(chatSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen bg-charcoal-dark overflow-hidden font-sans text-luxury-white">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-charcoal border-r border-gold/15 flex flex-col justify-between p-6">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10 border-b border-gold/10 pb-4">
            <span className="text-xl font-serif font-bold tracking-widest text-gold">AURA</span>
            <span className="text-[10px] bg-gold/15 text-gold border border-gold/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">ADMIN</span>
          </div>

          {/* Menus */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveMenu('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'dashboard' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <Layers size={18} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveMenu('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'users' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <Users size={18} />
              All Studios
            </button>
            <button
              onClick={() => setActiveMenu('selections')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'selections' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <Users size={18} />
              All Clients
            </button>
            <button
              onClick={() => setActiveMenu('albums')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'albums' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <Layers size={18} />
              All Albums
            </button>
            <button
              onClick={() => setActiveMenu('services')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'services' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <Layers size={18} />
              All Services
            </button>
            <button
              onClick={() => setActiveMenu('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeMenu === 'messages' ? 'bg-gold text-charcoal-dark shadow-gold-sm font-bold' : 'text-luxury-white/70 hover:bg-gold/5 hover:text-luxury-white'
              }`}
            >
              <MessageSquare size={18} />
              Message Box
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

        {/* 1. ADMIN DASHBOARD METRICS VIEW */}
        {activeMenu === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">Admin Statistics Overview</h1>
              <p className="text-xs text-luxury-white/50">Manage platforms, active studios, and customer services.</p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-2xl border border-gold/10">
                <p className="text-xs text-gold font-bold uppercase tracking-wider">Registered Studios</p>
                <p className="text-4xl font-serif font-bold text-luxury-white mt-2">{stats.totalUsers}</p>
                <div className="h-1 w-12 bg-gold mt-4 rounded" />
              </div>
              <div className="glass-panel p-6 rounded-2xl border border-gold/10">
                <p className="text-xs text-gold font-bold uppercase tracking-wider">Flipbook Albums Created</p>
                <p className="text-4xl font-serif font-bold text-luxury-white mt-2">{stats.totalAlbums}</p>
                <div className="h-1 w-12 bg-gold mt-4 rounded" />
              </div>
              <div className="glass-panel p-6 rounded-2xl border border-gold/10">
                <p className="text-xs text-gold font-bold uppercase tracking-wider">Proofing Collections</p>
                <p className="text-4xl font-serif font-bold text-luxury-white mt-2">{stats.totalSelections}</p>
                <div className="h-1 w-12 bg-gold mt-4 rounded" />
              </div>
            </div>

            {/* Sub-Metrics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Photo Proofing Global Breakdown */}
              <div className="glass-panel p-6 rounded-2xl border border-gold/10">
                <h3 className="text-lg font-serif text-gold font-semibold mb-4">Proofing Photo Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-luxury-white/5 pb-2">
                    <span className="text-luxury-white/60">Total Proofing Photos</span>
                    <span className="font-bold font-mono">{stats.photoStats.totalPhotos}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-luxury-white/5 pb-2">
                    <span className="text-green-400">Client Selected Favorites</span>
                    <span className="font-bold font-mono text-green-400">{stats.photoStats.totalSelected}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-luxury-white/5 pb-2">
                    <span className="text-red-400">Client Rejected / Deleted</span>
                    <span className="font-bold font-mono text-red-400">{stats.photoStats.totalRejected}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-yellow-500">Awaiting Client Review</span>
                    <span className="font-bold font-mono text-yellow-500">{stats.photoStats.totalPending}</span>
                  </div>
                </div>
              </div>

              {/* Real-time system activity alerts log */}
              <div className="glass-panel p-6 rounded-2xl border border-gold/10 flex flex-col h-[300px]">
                <h3 className="text-lg font-serif text-gold font-semibold mb-4">Live Platform Activity Logs</h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-luxury-white/30 text-center py-10">No live interactions recorded yet...</p>
                  ) : (
                    alerts.map((al, idx) => (
                      <div key={idx} className="bg-charcoal/40 border border-gold/5 p-3 rounded-lg text-xs flex justify-between gap-3">
                        <div>
                          <span className="font-bold text-gold mr-1">Selection:</span>
                          <span className="text-luxury-white/80">{al.message}</span>
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
          </div>
        )}

        {/* 2. ALL USERS VIEW */}
        {activeMenu === 'users' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">Registered Photographers / Studios</h1>
              <p className="text-xs text-luxury-white/50">Manage accounts, status, and block access for violating studios.</p>
            </div>

            <div className="glass-panel rounded-2xl border border-gold/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-charcoal text-gold text-xs uppercase tracking-wider font-semibold border-b border-gold/10">
                    <th className="p-4">User ID</th>
                    <th className="p-4">Gmail / Email</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created Date</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/5 text-sm">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-luxury-white/40">No photographer studios registered yet.</td>
                    </tr>
                  ) : (
                    usersList.map(u => (
                      <tr key={u.id} className="hover:bg-gold/5 transition-all">
                        <td className="p-4 font-mono text-xs text-luxury-white/60">{u.id}</td>
                        <td className="p-4 font-semibold">{u.email}</td>
                        <td className="p-4 font-mono text-xs">{u.phone}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            u.status === 'active' 
                              ? 'bg-green-500/10 text-green-400 border-green-500/25' 
                              : 'bg-red-500/10 text-red-400 border-red-500/25'
                          }`}>
                            {u.status === 'active' ? <CheckCircle size={10} /> : <ShieldAlert size={10} />}
                            {u.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-luxury-white/50">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => toggleBlockUser(u.id)}
                              className={`px-3 py-1 text-xs rounded font-bold border transition-all ${
                                u.status === 'active' 
                                  ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' 
                                  : 'border-green-500/20 text-green-400 hover:bg-green-500/10'
                              }`}
                            >
                              {u.status === 'active' ? 'Block Studio' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="p-1.5 text-luxury-white/40 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded transition-all"
                              title="Delete Studio"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ALL CLIENTS & PROOFING LINKS VIEW */}
        {activeMenu === 'selections' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">All Clients & Proofing links</h1>
              <p className="text-xs text-luxury-white/50">Monitor proofing folder metrics, links, and completion statuses across all studios.</p>
            </div>

            <div className="glass-panel rounded-2xl border border-gold/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-charcoal text-gold text-xs uppercase tracking-wider font-semibold border-b border-gold/10">
                    <th className="p-4">Client Event</th>
                    <th className="p-4">Studio ID</th>
                    <th className="p-4 text-center">Selected</th>
                    <th className="p-4 text-center">Rejected</th>
                    <th className="p-4 text-center">Pending</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Secure Proofing URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/5 text-sm">
                  {selectionsList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-luxury-white/40">No client proofing links active on the platform.</td>
                    </tr>
                  ) : (
                    selectionsList.map(sel => {
                      const selCount = sel.photos.filter(p => p.status === 'selected').length;
                      const rejCount = sel.photos.filter(p => p.status === 'rejected').length;
                      const penCount = sel.photos.filter(p => p.status === 'pending').length;
                      
                      return (
                        <tr key={sel._id} className="hover:bg-gold/5 transition-all">
                          <td className="p-4 font-bold">{sel.title}</td>
                          <td className="p-4 font-mono text-xs text-luxury-white/60">{sel.ownerId}</td>
                          <td className="p-4 text-center font-mono text-green-400 font-semibold">{selCount}</td>
                          <td className="p-4 text-center font-mono text-red-400 font-semibold">{rejCount}</td>
                          <td className="p-4 text-center font-mono text-yellow-500">{penCount}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              sel.selectionCompleted 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            }`}>
                              {sel.selectionCompleted ? 'Completed' : 'Reviewing'}
                            </span>
                          </td>
                          <td className="p-4">
                            <a 
                              href={`${window.location.origin}/select/${sel._id}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-gold hover:underline text-xs font-mono"
                            >
                              /select/{sel._id}
                            </a>
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

        {/* ALL ALBUMS VIEW */}
        {activeMenu === 'albums' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">All Compiled Wedding Albums</h1>
              <p className="text-xs text-luxury-white/50">View all completed 3D page-flip wedding books generated by platform studios.</p>
            </div>

            <div className="glass-panel rounded-2xl border border-gold/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-charcoal text-gold text-xs uppercase tracking-wider font-semibold border-b border-gold/10">
                    <th className="p-4">Album Title</th>
                    <th className="p-4">Client Name</th>
                    <th className="p-4">Studio Name</th>
                    <th className="p-4">Sheets</th>
                    <th className="p-4">Soundtrack</th>
                    <th className="p-4">Secure Album Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/5 text-sm">
                  {albumsList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-luxury-white/40">No wedding flipbook albums generated yet.</td>
                    </tr>
                  ) : (
                    albumsList.map(alb => (
                      <tr key={alb._id} className="hover:bg-gold/5 transition-all">
                        <td className="p-4 font-serif font-bold text-gold">{alb.albumTitle || 'Wedding Album'}</td>
                        <td className="p-4">{alb.clientName || 'N/A'}</td>
                        <td className="p-4 font-semibold">{alb.studioName}</td>
                        <td className="p-4 font-mono text-xs">{alb.sheets ? alb.sheets.length : 0} Spreads</td>
                        <td className="p-4 text-xs max-w-[150px] truncate">{alb.songType === 'website' ? 'Preset' : 'Uploaded Custom MP3'}</td>
                        <td className="p-4">
                          <a 
                            href={alb.albumUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-gold hover:underline text-xs font-mono"
                          >
                            Launch Flipbook
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ALL SERVICES VIEW */}
        {activeMenu === 'services' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif text-gold font-bold">Platform Services Setup</h1>
              <p className="text-xs text-luxury-white/50">Two predefined wedding packages. Admin can toggle visibility (Hide/Show) but cannot modify schemas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {servicesList.map(s => (
                <div key={s._id} className="glass-panel p-6 rounded-2xl border border-gold/10 flex flex-col justify-between relative overflow-hidden group">
                  {/* Status Indicator Tag */}
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      !s.hidden 
                        ? 'bg-green-500/10 text-green-400 border-green-500/25' 
                        : 'bg-red-500/10 text-red-400 border-red-500/25'
                    }`}>
                      {!s.hidden ? 'Visible' : 'Hidden'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-serif text-gold font-bold mb-3">{s.name}</h3>
                    <p className="text-sm text-luxury-white/60 leading-relaxed mb-6">{s.description}</p>
                  </div>

                  {/* Actions Toggle */}
                  <div className="border-t border-gold/5 pt-4 flex justify-between items-center mt-4">
                    <span className="text-xs text-luxury-white/40 font-mono">ID: {s._id}</span>
                    <button
                      onClick={() => toggleServiceVisibility(s._id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        !s.hidden 
                          ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' 
                          : 'border-green-500/20 text-green-400 hover:bg-green-500/10'
                      }`}
                    >
                      {s.hidden ? (
                        <>
                          <Eye size={14} />
                          Show Service
                        </>
                      ) : (
                        <>
                          <EyeOff size={14} />
                          Hide Service
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. CHAT SYSTEM (MESSAGE BOX) */}
        {activeMenu === 'messages' && (
          <div className="h-[80vh] flex border border-gold/15 rounded-2xl overflow-hidden glass-panel">
            
            {/* Chat Sidebar: Users List */}
            <div className="w-1/3 bg-charcoal-dark border-r border-gold/10 flex flex-col">
              <div className="p-4 border-b border-gold/10">
                <h3 className="text-md font-serif text-gold font-bold mb-3">Support Contacts</h3>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-luxury-white/30">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search studio email..."
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    className="w-full bg-charcoal border border-gold/10 focus:border-gold rounded-lg py-2 pl-9 pr-4 text-xs text-luxury-white placeholder-luxury-white/20 outline-none"
                  />
                </div>
              </div>

              {/* Contacts scrollable */}
              <div className="flex-1 overflow-y-auto divide-y divide-gold/5">
                {filteredChatUsers.length === 0 ? (
                  <p className="text-xs text-luxury-white/40 text-center py-8">No matching contacts.</p>
                ) : (
                  filteredChatUsers.map(cu => {
                    const isOnline = onlineUsers.includes(cu.userId);
                    const isTyping = typingStates[cu.userId];
                    const isSelected = activeChatUser && activeChatUser.userId === cu.userId;

                    return (
                      <button
                        key={cu.userId}
                        onClick={() => setActiveChatUser(cu)}
                        className={`w-full text-left p-4 hover:bg-gold/5 transition-all flex items-center justify-between ${
                          isSelected ? 'bg-gold/10' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold truncate block text-luxury-white">{cu.email}</span>
                            {/* Online node */}
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-luxury-white/20'}`} />
                          </div>
                          
                          <p className="text-[10px] text-luxury-white/40 truncate">
                            {isTyping ? (
                              <span className="text-gold italic font-bold">Typing...</span>
                            ) : cu.latestMessage ? (
                              cu.latestMessage
                            ) : cu.latestFile ? (
                              `📎 ${cu.latestFile}`
                            ) : (
                              'Click to start support chat.'
                            )}
                          </p>
                        </div>

                        {/* Unread Alert Indicator */}
                        {cu.unreadCount > 0 && (
                          <span className="bg-gold text-charcoal-dark font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce">
                            {cu.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Body: Active Chat window */}
            <div className="flex-1 flex flex-col bg-charcoal/20">
              {activeChatUser ? (
                <>
                  {/* Active User Header */}
                  <div className="p-4 border-b border-gold/10 flex items-center justify-between bg-charcoal-dark">
                    <div>
                      <h4 className="text-sm font-bold text-gold">{activeChatUser.email}</h4>
                      <p className="text-[10px] text-luxury-white/40 font-mono">User ID: {activeChatUser.userId}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border ${
                      onlineUsers.includes(activeChatUser.userId) 
                        ? 'bg-green-500/10 text-green-400 border-green-500/25' 
                        : 'bg-luxury-white/5 text-luxury-white/30 border-luxury-white/10'
                    }`}>
                      {onlineUsers.includes(activeChatUser.userId) ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* Messages logs */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                    {chatMessages.map((m, idx) => {
                      const isAdminMsg = m.senderId === 'admin';
                      return (
                        <div key={idx} className={`flex ${isAdminMsg ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl p-3 border text-xs ${
                            isAdminMsg 
                              ? 'bg-gradient-to-br from-gold to-gold-dark text-charcoal-dark border-gold/30 rounded-tr-none font-medium' 
                              : 'bg-charcoal border-gold/10 text-luxury-white rounded-tl-none'
                          }`}>
                            <p>{m.content}</p>
                            
                            {/* Render File Sharing Links */}
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
                    })}

                    {/* Typing state */}
                    {typingStates[activeChatUser.userId] && (
                      <div className="flex justify-start">
                        <div className="bg-charcoal border border-gold/10 rounded-2xl rounded-tl-none p-3 text-xs text-luxury-white/60">
                          <span className="italic mr-1.5">User is typing</span>
                          <span className="typing-dots"><span></span><span></span><span></span></span>
                        </div>
                      </div>
                    )}

                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Input panel */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gold/10 bg-charcoal-dark space-y-2">
                    {/* Render attachment preview */}
                    {chatAttachment && (
                      <div className="bg-charcoal/50 border border-gold/10 p-2 rounded-lg text-xs flex justify-between items-center">
                        <span className="truncate">Selected File: {chatAttachment.name}</span>
                        <button type="button" onClick={() => setChatAttachment(null)} className="text-red-400 hover:text-red-300 font-bold px-1">✕</button>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {/* File attachment toggle */}
                      <label className="p-2.5 rounded-xl border border-gold/10 hover:border-gold hover:bg-gold/5 text-gold transition-all cursor-pointer flex-shrink-0" title="Attach file">
                        <Paperclip size={16} />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => setChatAttachment(e.target.files[0])}
                        />
                      </label>

                      {/* Emoji panel toggle */}
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

                      {/* Input field */}
                      <input
                        type="text"
                        placeholder="Type standard help response..."
                        value={chatInput}
                        onChange={(e) => handleChatInputChange(e.target.value)}
                        className="flex-1 bg-charcoal border border-gold/10 focus:border-gold rounded-xl py-2.5 px-4 text-xs text-luxury-white placeholder-luxury-white/20 outline-none"
                      />

                      {/* Send Button */}
                      <button
                        type="submit"
                        className="p-2.5 rounded-xl gold-button flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <span className="text-4xl mb-2 text-gold font-serif">❦</span>
                  <h3 className="text-md font-serif text-gold font-bold">No Support Chat Active</h3>
                  <p className="text-xs">Select a studio photographer from the sidebar to review and reply to inquiries.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
