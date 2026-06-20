import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../lib/api';
import { ContentItem, ScheduledPost, SocialAccount } from '../types';

export function CalendarPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [contentItemId, setContentItemId] = useState('');
  const [scheduledTime, setScheduledTime] = useState(new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16));

  async function load() {
    const [scheduledResponse, contentResponse, accountResponse] = await Promise.all([
      api.get('/schedule'),
      api.get('/content?status=APPROVED'),
      api.get('/platforms/accounts'),
    ]);
    setPosts(scheduledResponse.data);
    setContent(contentResponse.data);
    setAccounts(accountResponse.data.filter((a: SocialAccount) => a.status === 'CONNECTED'));
    if (!contentItemId && contentResponse.data[0]) setContentItemId(contentResponse.data[0].id);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const events = useMemo(
    () =>
      posts.map((post) => ({
        id: post.id,
        title: `${post.contentItem.title} · ${post.status}`,
        start: post.scheduledTime,
        backgroundColor: statusColor(post.status),
        borderColor: statusColor(post.status),
      })),
    [posts],
  );

  async function schedule() {
    const selected = content.find((item) => item.id === contentItemId);
    const variants = accounts.map((account) => ({
      platform: account.platform,
      socialAccountId: account.id,
      caption: selected?.body || 'Campaign update',
      hashtags: selected?.hashtags?.length ? selected.hashtags : ['Cancel910gas', 'GasPricing'],
      linkUrl: selected?.linkUrl || 'https://youtube.com/@cancel910gas',
    }));

    if (!contentItemId || !variants.length) return alert('Add approved content and connect at least one account first.');

    await api.post('/schedule', {
      contentItemId,
      scheduledTime: new Date(scheduledTime).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      variants,
    });
    await load();
  }

  async function publishNow(id: string) {
    await api.post(`/schedule/${id}/publish-now`);
    await load();
  }

  return (
    <div className="split wide-left">
      <section className="card calendar-card">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          events={events}
          editable
          eventDrop={async (info) => {
            await api.post(`/schedule/${info.event.id}/reschedule`, { scheduledTime: info.event.start?.toISOString() });
            await load();
          }}
          eventClick={(info) => publishNow(info.event.id)}
          height="auto"
        />
      </section>

      <aside className="card form-card">
        <h2>Schedule approved content</h2>
        <label>
          Content
          <select value={contentItemId} onChange={(e) => setContentItemId(e.target.value)}>
            {content.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <label>
          Schedule time
          <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
        </label>
        <button className="primary full" onClick={schedule}>Schedule to all connected platforms</button>
        <div className="hint">Drag a calendar event to reschedule. Click an event to publish now. The API trigger uses the scheduled time; platform visibility can still depend on platform processing.</div>
        <h3>Recent jobs</h3>
        <div className="mini-list">
          {posts.slice(0, 6).map((post) => (
            <div key={post.id}>
              <strong>{post.contentItem.title}</strong>
              <span>{post.status} · {new Date(post.scheduledTime).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function statusColor(status: string) {
  if (status === 'PUBLISHED') return '#16a34a';
  if (status === 'FAILED') return '#dc2626';
  if (status === 'PARTIALLY_FAILED') return '#f59e0b';
  if (status === 'PUBLISHING') return '#2563eb';
  return '#64748b';
}
