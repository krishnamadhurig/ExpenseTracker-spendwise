import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { inr } from '../format.js';
import ItemForm from '../components/ItemForm.jsx';
import ItemList from '../components/ItemList.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import PremiumCard from '../components/PremiumCard.jsx';
import AiPanel from '../components/AiPanel.jsx';

const emptyPage = { items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false } };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(emptyPage);
  const [summary, setSummary] = useState({ total: 0, count: 0, byCategory: [], limit: null });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: '', category: '' });
  const [boardKey, setBoardKey] = useState(0);
  const [error, setError] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const premiumRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
api.meta().then((m) => setCategories(Array.isArray(m.categories) ? m.categories : [])).catch(() => {});  }, []);
  const load = useCallback(async (wanted, f) => {
    try {
      const params = { page: wanted };
      if (f.q) params.q = f.q;
      if (f.category) params.category = f.category;
      const [res, sum] = await Promise.all([api.items(params), api.summary()]);
      setData(res);
      setSummary(sum);
      setPage(res.pagination.page);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(page, filters), filters.q ? 250 : 0);
    return () => clearTimeout(t);
  }, [page, filters.q, filters.category]);

  const refreshAll = () => {
    setBoardKey((k) => k + 1);
    return load(page, filters);
  };

  const onFilters = (f) => {
    setPage(1);
    setFilters(f);
  };

  const onAdded = () => {
    setBoardKey((k) => k + 1);
    if (page === 1) load(1, filters);
    else setPage(1);
  };

  const scrollToPremium = () => premiumRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  async function exportCsv() {
    try {
      const res = await api.exportCsv();
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: 'expenses.csv' });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.code === 'PREMIUM_REQUIRED' ? 'CSV export is a Premium feature.' : err.message);
    }
  }

  const topCats = summary.byCategory.slice(0, 5);
  const maxCat = Math.max(1, ...topCats.map((c) => c.total));

  return (
    <>
      <header className="topbar">
        <div className="brand"><span className="logo">₹</span> Spendwise</div>
        <div className="row gap">
          <span className={`badge ${user.isPremium ? 'premium' : ''}`}>{user.isPremium ? 'Premium' : 'Free'}</span>
          <span className="muted hide-sm">{user.name}</span>
          <button className="icon-btn" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">◐</button>
          <button className="btn ghost small" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="container">
        <h1 className="greeting">Hi {user.name.split(' ')[0]} 👋</h1>
        {error && <p className="error banner" role="alert">{error}</p>}

        {!user.isPremium && summary.limit != null && (
          <div className="usage">
            <div className="row between small">
              <span>{summary.count} of {summary.limit} free items used</span>
              <button className="link" onClick={scrollToPremium}>Go Premium</button>
            </div>
            <div className="bar"><span style={{ width: `${Math.min((summary.count / summary.limit) * 100, 100)}%` }} /></div>
          </div>
        )}

        <ItemForm categories={categories} onAdded={onAdded} onUpgrade={scrollToPremium} />

        <ItemList
          data={data}
          categories={categories}
          total={summary.total}
          filters={filters}
          setFilters={onFilters}
          onPage={setPage}
          onChanged={refreshAll}
          onError={setError}
        />

        {topCats.length > 0 && (
          <div className="card">
            <div className="card-head">
              <h2>Where your money goes</h2>
              <button className="btn ghost small" onClick={exportCsv}>Export CSV <span className="pill">Premium</span></button>
            </div>
            <div className="cats">
              {topCats.map((c) => (
                <div key={c.category} className="cat-row">
                  <span>{c.category}</span>
                  <div className="bar"><span style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
                  <span className="num">{inr(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid-2">
          <Leaderboard refreshKey={boardKey} onUpgrade={scrollToPremium} />
          <PremiumCard ref={premiumRef} onPremiumChange={() => setBoardKey((k) => k + 1)} />
        </div>

        <AiPanel onAdded={onAdded} onUpgrade={scrollToPremium} />
      </main>
    </>
  );
}