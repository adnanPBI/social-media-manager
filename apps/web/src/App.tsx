import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, FileText, Link2, Newspaper } from 'lucide-react';
import { AccountsPage } from './pages/AccountsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CalendarPage } from './pages/CalendarPage';
import { ContentPage } from './pages/ContentPage';
import { ReportsPage } from './pages/ReportsPage';
import { InboxPage } from './pages/InboxPage';
import { MessageSquare } from 'lucide-react';
import { api } from './lib/api';

type Page = 'analytics' | 'inbox' | 'accounts' | 'content' | 'calendar' | 'reports';

const nav = [
  { key: 'analytics' as Page, label: 'Dashboard', icon: BarChart3 },
  { key: 'inbox' as Page, label: 'Inbox', icon: MessageSquare },
  { key: 'accounts' as Page, label: 'Accounts', icon: Link2 },
  { key: 'content' as Page, label: 'Content', icon: Newspaper },
  { key: 'calendar' as Page, label: 'Calendar', icon: CalendarDays },
  { key: 'reports' as Page, label: 'Reports', icon: FileText },
];

export default function App() {
  const [page, setPage] = useState<Page>('analytics');
  const [ready, setReady] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('smm_token')) {
      setReady(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('smm_token', response.data.accessToken);
      setReady(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    }
  }

  if (!ready) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px', padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h2 style={{ margin: 0 }}>Sign In</h2>
          {error && <div style={{ color: 'red', fontSize: '0.875rem' }}>{error}</div>}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          <button type="submit" style={{ padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>SocialOps</strong>
            <span>Multi-platform manager</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => setPage(item.key)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>{nav.find((n) => n.key === page)?.label}</h1>
            <p>Schedule, publish, measure, and export campaign performance.</p>
          </div>
          <div className="pill">Hybrid mock publishing mode</div>
        </header>
        {page === 'analytics' && <AnalyticsPage />}
        {page === 'inbox' && <InboxPage />}
        {page === 'accounts' && <AccountsPage />}
        {page === 'content' && <ContentPage />}
        {page === 'calendar' && <CalendarPage />}
        {page === 'reports' && <ReportsPage />}
      </main>
    </div>
  );
}
