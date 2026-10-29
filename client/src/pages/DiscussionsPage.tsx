import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { DiscussionMessage } from '../types';
import {
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  Check,
  X,
  Hash,
  Users,
  Smile,
  RefreshCw
} from 'lucide-react';

const CHANNELS = [
  { id: 'general', name: 'general-chat', desc: 'Team-wide announcements & discussion' },
  { id: 'sprint-planning', name: 'sprint-planning', desc: 'Sprint scope & backlog coordination' },
  { id: 'devops-releases', name: 'devops-and-qa', desc: 'Deployments, builds & QA updates' }
];

export const DiscussionsPage: React.FC = () => {
  const { currentWorkspace, currentProject } = useProject();
  const { user, role } = useAuth();

  const [activeChannel, setActiveChannel] = useState(CHANNELS[0].id);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    if (!currentWorkspace) return;
    try {
      const data = await api.discussions.getAll(currentWorkspace.id, activeChannel, 'team');
      setMessages(data);
    } catch (err) {
      console.error('[Discussions] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [currentWorkspace?.id, activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !content.trim()) return;
    const textToSend = content.trim();
    setContent('');
    try {
      await api.discussions.create({
        workspace_id: currentWorkspace.id,
        project_id: currentProject?.id,
        channel_type: 'team',
        channel_id: activeChannel,
        content: textToSend
      });
      loadMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to post message');
      setContent(textToSend);
    }
  };

  const handleStartEdit = (msg: DiscussionMessage) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      await api.discussions.update(id, editContent.trim());
      setEditingId(null);
      loadMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to edit message');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.discussions.delete(id);
      loadMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  const channelObj = CHANNELS.find((c) => c.id === activeChannel) || CHANNELS[0];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Team Communication
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Team Chat & Discussions
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Real-time persisted team messaging for sprint alignment, project coordination, and release discussions.
          </p>
        </div>

        <button
          onClick={loadMessages}
          className="px-3.5 py-1.5 rounded-full bg-white border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Messages</span>
        </button>
      </div>

      {/* Main Chat Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-16rem)] min-h-[500px]">
        {/* Channel Sidebar */}
        <div className="glass-panel rounded-3xl p-4 border border-emerald-950/10 shadow-soft flex flex-col space-y-4">
          <div className="flex items-center gap-2 px-2 pb-2 border-b border-zinc-100">
            <Users className="h-4 w-4 text-emerald-800" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 font-sans">
              Workspace Channels
            </h3>
          </div>

          <div className="space-y-1 flex-1 overflow-y-auto">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeChannel === ch.id
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Hash className="h-3.5 w-3.5" />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-500">
            Messages are persisted in the active workspace and scoped to verified members only.
          </div>
        </div>

        {/* Message Thread Area */}
        <div className="md:col-span-3 glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft flex flex-col">
          {/* Thread Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-mint-100 text-emerald-900">
                <Hash className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 font-sans">{channelObj.name}</h3>
                <p className="text-[11px] text-zinc-500">{channelObj.desc}</p>
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-zinc-400">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2 text-zinc-400">
                <div className="p-3 rounded-full bg-zinc-100 text-zinc-500">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div className="text-xs font-semibold text-zinc-700">No messages in #{channelObj.name} yet</div>
                <p className="text-[11px] max-w-sm">
                  Start the conversation! Share updates, coordinate sprint blockers, or discuss deliverables.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.user_id === user?.id;
                const canDelete = isOwn || role === 'WorkspaceAdmin';
                const isEditing = editingId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    {/* User Avatar */}
                    <div className="h-8 w-8 rounded-full bg-mint-200 text-emerald-900 flex-shrink-0 flex items-center justify-center font-bold text-xs uppercase overflow-hidden border border-emerald-950/10">
                      {msg.user?.avatar_url ? (
                        <img src={msg.user.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(msg.user?.display_name || 'U').substring(0, 2)}</span>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[75%] space-y-1 ${isOwn ? 'items-end text-right' : ''}`}>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <span className="font-bold text-zinc-700">{msg.user?.display_name || 'Team Member'}</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.edited && <span className="text-[10px] italic text-zinc-400">(edited)</span>}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-emerald-950/20 shadow-sm">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="text-xs px-2 py-1 rounded bg-zinc-50 border border-zinc-200 focus:outline-none flex-1"
                          />
                          <button
                            onClick={() => handleSaveEdit(msg.id)}
                            className="p-1 rounded text-emerald-800 hover:bg-emerald-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded text-zinc-400 hover:bg-zinc-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed text-left ${
                            isOwn
                              ? 'bg-zinc-900 text-white rounded-tr-sm'
                              : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-2xs'
                          }`}
                        >
                          {msg.content}
                        </div>
                      )}

                      {/* Hover Actions */}
                      {!isEditing && (
                        <div
                          className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-zinc-400 text-[10px] ${
                            isOwn ? 'justify-end' : ''
                          }`}
                        >
                          {isOwn && (
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="p-1 hover:text-zinc-700 hover:bg-zinc-100 rounded"
                              title="Edit message"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete message"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-zinc-100 flex items-center gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Message #${channelObj.name}... (Press Enter to send)`}
              className="flex-1 text-xs px-4 py-2.5 rounded-full bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
            <button
              type="submit"
              disabled={!content.trim()}
              className="btn-pill-primary px-4 py-2.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
