import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingStates, setTypingStates] = useState({}); // senderId -> boolean
  const [alerts, setAlerts] = useState([]); // Real-time client updates list
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to backend port 5000
    const socketInstance = io('http://localhost:5000');
    setSocket(socketInstance);

    const socketUserId = user.role === 'admin' ? 'admin' : user.id;

    socketInstance.on('connect', () => {
      console.log('Socket connected to backend:', socketInstance.id);
      socketInstance.emit('identify', socketUserId);
    });

    // Listen to online users list
    socketInstance.on('onlineList', (list) => {
      setOnlineUsers(list);
    });

    // Listen to typing updates
    socketInstance.on('typingState', ({ senderId, isTyping }) => {
      setTypingStates(prev => ({
        ...prev,
        [senderId]: isTyping
      }));
    });

    // Listen to client selection tracking alerts
    socketInstance.on('clientActivityAlert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50)); // keep latest 50 alerts
      // Support triggering audio micro-alert or custom system notifications if needed
    });

    // Listen for live selection details changes (Selected/Rejected)
    socketInstance.on('selectionStatsUpdate', (statUpdate) => {
      setAlerts(prev => [{
        selectionId: statUpdate.selectionId,
        title: statUpdate.title,
        action: 'selection_change',
        message: statUpdate.message,
        timestamp: statUpdate.timestamp,
        stats: statUpdate.stats
      }, ...prev].slice(0, 50));
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const clearAlerts = () => setAlerts([]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, typingStates, alerts, clearAlerts }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
