import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { getToken } from '../api/auth';

interface StoredMessage {
  id: string;
  sender?: string;
  subject?: string;
  message?: string;
  timestamp?: number;
}

export default function DeleteMessages() {
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    // Try loading from server endpoint first, fallback to localStorage
    try {
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/list', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data?.code === 200 && Array.isArray(data.result)) {
        setMessages(data.result.map((m: any) => ({ id: String(m.id), subject: m.subject, message: m.message, timestamp: m.timestamp })));
        return;
      }
    } catch (e) {
      // ignore and fallback
    }

    try {
      const stored = localStorage.getItem('notifications_messages');
      const all = stored ? JSON.parse(stored) : [];
      setMessages(all.map((m: any) => ({ id: m.id, subject: m.subject || m.message || '', message: m.message || m.text || '', timestamp: m.timestamp })));
    } catch {
      setMessages([]);
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteSelected = async () => {
    const ids = Object.keys(selected).filter(id => selected[id]);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} message(s)? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const token = getToken();
      // Try server-side delete
      const res = await fetch('/dev-api/api/messages/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data?.code === 200) {
        // reload
        await loadMessages();
        setSelected({});
      } else {
        // fallback to clearing localStorage entries with matching ids
        const stored = localStorage.getItem('notifications_messages');
        const all = stored ? JSON.parse(stored) : [];
        const remaining = all.filter((m: any) => !ids.includes(String(m.id)));
        localStorage.setItem('notifications_messages', JSON.stringify(remaining));
        setMessages(remaining);
        setSelected({});
      }
    } catch (e) {
      // fallback local
      const stored = localStorage.getItem('notifications_messages');
      const all = stored ? JSON.parse(stored) : [];
      const remaining = all.filter((m: any) => !ids.includes(String(m.id)));
      localStorage.setItem('notifications_messages', JSON.stringify(remaining));
      setMessages(remaining);
      setSelected({});
    } finally {
      setLoading(false);
    }
  };

  const deleteAll = async () => {
    if (!confirm('Delete ALL messages? This cannot be undone.')) return;
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/deleteAll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data?.code === 200) {
        setMessages([]);
        localStorage.removeItem('notifications_messages');
        setSelected({});
      } else {
        // fallback
        setMessages([]);
        localStorage.removeItem('notifications_messages');
        setSelected({});
      }
    } catch (e) {
      setMessages([]);
      localStorage.removeItem('notifications_messages');
      setSelected({});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border-t border-white/10 bg-black/10 rounded-b-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Delete Messages</h3>
          <p className="text-xs text-slate-400">Select messages to remove from the system</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={deleteAll} disabled={loading || messages.length===0} className="px-3 py-1 text-xs rounded bg-red-600/20 text-red-300 hover:bg-red-600/30">Delete All</button>
          <button onClick={deleteSelected} disabled={loading} className="px-3 py-1 text-xs rounded bg-white/5 text-slate-200 hover:bg-white/10 inline-flex items-center gap-2"><Trash2 className="w-4 h-4" />Delete Selected</button>
        </div>
      </div>

      <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-xs text-slate-500">No messages found.</div>
        )}
        {messages.map((m) => (
          <label key={m.id} className="flex items-start gap-3 p-2 rounded hover:bg-white/2">
            <input type="checkbox" checked={!!selected[m.id]} onChange={() => toggle(m.id)} className="mt-1" />
            <div className="flex-1 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-200">{m.subject || (m.message || '').slice(0, 40)}</div>
                <div className="text-xs text-slate-500">{m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</div>
              </div>
              <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{m.message}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
