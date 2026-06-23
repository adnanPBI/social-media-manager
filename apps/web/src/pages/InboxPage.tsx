import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { io, Socket } from 'socket.io-client';
import { Send, UserCircle2, Facebook, Instagram, Twitter, MessageSquare } from 'lucide-react';

interface Contact {
  name: string;
  avatarUrl: string | null;
  platform: string;
}

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  socialAccountId: string;
  contact: Contact;
  messages: Message[];
  updatedAt: string;
}

export function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/inbox/conversations');
      setConversations(res.data);
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    }
  };

  const fetchMessages = async (convoId: string) => {
    try {
      const res = await api.get(`/inbox/conversations/${convoId}/messages`);
      setMessages(res.data);
    } catch (e) {
      console.error('Failed to fetch messages', e);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Connect to WebSocket using current host but path /inbox
    // For this boilerplate, assuming same host as API base URL
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
    
    socketRef.current = io(`${socketUrl}/inbox`, {
      query: { workspaceId: 'mock-workspace' }, // Hardcoded for MVP as in backend
      transports: ['websocket'],
    });

    socketRef.current.on('newMessage', (payload: any) => {
      // Update conversations list (bump to top or update latest message snippet)
      fetchConversations();
      
      // If the incoming message belongs to the currently active chat, append it
      if (payload.conversationId === selectedConvoId) {
        setMessages((prev) => [...prev, payload.message]);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [selectedConvoId]); // Rebind socket handler if selectedConvoId changes so closure has fresh state

  useEffect(() => {
    if (selectedConvoId) {
      fetchMessages(selectedConvoId);
    }
  }, [selectedConvoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvoId) return;

    try {
      await api.post(`/inbox/conversations/${selectedConvoId}/reply`, { content: replyText });
      setReplyText('');
      // Message will come back via websocket, but we could also append optimistically
    } catch (e) {
      console.error('Failed to send reply', e);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'FACEBOOK': return <Facebook size={16} color="#1877f2" />;
      case 'INSTAGRAM': return <Instagram size={16} color="#e1306c" />;
      case 'TWITTER': return <Twitter size={16} color="#1da1f2" />;
      default: return <UserCircle2 size={16} />;
    }
  };

  const selectedConvo = conversations.find(c => c.id === selectedConvoId);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      
      {/* Sidebar: Conversation List */}
      <div style={{ width: '320px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Conversations</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No messages yet.</div>
          ) : (
            conversations.map((c) => (
              <div 
                key={c.id} 
                onClick={() => setSelectedConvoId(c.id)}
                style={{ 
                  padding: '16px', 
                  borderBottom: '1px solid #f3f4f6', 
                  cursor: 'pointer',
                  background: selectedConvoId === c.id ? '#f0fdf4' : 'transparent',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {c.contact?.avatarUrl ? <img src={c.contact.avatarUrl} alt="" style={{width: '100%', height: '100%', borderRadius: '50%'}}/> : <UserCircle2 size={24} color="#9ca3af" />}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.contact?.name || 'Unknown'}</span>
                    {getPlatformIcon(c.contact?.platform)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px' }}>
                    {c.messages?.[0]?.content || 'No messages'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Panel: Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
        {selectedConvo ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCircle2 size={20} color="#9ca3af" />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{selectedConvo.contact?.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>via {selectedConvo.contact?.platform}</div>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((m) => {
                const isOutbound = m.direction === 'OUTBOUND';
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isOutbound ? 'flex-end' : 'flex-start' }}>
                    <div style={{ 
                      maxWidth: '70%', 
                      padding: '10px 16px', 
                      borderRadius: '16px', 
                      background: isOutbound ? '#2563eb' : 'white',
                      color: isOutbound ? 'white' : '#111827',
                      border: isOutbound ? 'none' : '1px solid #e5e7eb',
                      borderBottomRightRadius: isOutbound ? '4px' : '16px',
                      borderBottomLeftRadius: isOutbound ? '16px' : '4px',
                      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                    }}>
                      <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{m.content}</div>
                      <div style={{ fontSize: '0.7rem', color: isOutbound ? '#bfdbfe' : '#9ca3af', marginTop: '4px', textAlign: 'right' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #e5e7eb' }}>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="text" 
                  placeholder={`Reply to ${selectedConvo.contact?.name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid #d1d5db', outline: 'none' }}
                />
                <button type="submit" disabled={!replyText.trim()} style={{ 
                  background: replyText.trim() ? '#2563eb' : '#9ca3af', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '46px', 
                  height: '46px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: replyText.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s'
                }}>
                  <Send size={18} style={{ marginLeft: '2px' }} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexDirection: 'column', gap: '12px' }}>
            <MessageSquare size={48} color="#d1d5db" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>

    </div>
  );
}
