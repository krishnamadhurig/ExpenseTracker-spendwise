import { useState } from 'react';
import { api } from '../api.js';
import { inr } from '../format.js';

export default function AiPanel({ onAdded, onUpgrade }) {
  const [text, setText] = useState('');
  const [quickMsg, setQuickMsg] = useState('');
  const [insights, setInsights] = useState(null);
  const [busy, setBusy] = useState('');
  const [locked, setLocked] = useState(false);

  function handle(err) {
    if (err.code === 'PREMIUM_REQUIRED') setLocked(true);
    return err.message;
  }

  async function quickAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy('quick');
    setQuickMsg('');
    try {
      const { entry } = await api.parse(text);
      setLocked(false);
      await api.addItem(entry);
      setQuickMsg(`Added “${entry.name}” · ${inr(entry.amount)} · ${entry.category}`);
      setText('');
      onAdded();
    } catch (err) {
      setQuickMsg(handle(err));
    } finally {
      setBusy('');
    }
  }

  async function getInsights() {
    setBusy('insights');
    try {
      const { insights } = await api.insights();
      setLocked(false);
      setInsights(insights);
    } catch (err) {
      setInsights([handle(err)]);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>AI assistant <span className="pill">Premium</span></h2>
      </div>

      <form className="row gap" onSubmit={quickAdd}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Try: “Spent 450 on dinner yesterday”"
          aria-label="Describe an expense"
        />
        <button className="btn primary" disabled={busy === 'quick'}>{busy === 'quick' ? '…' : 'Add'}</button>
      </form>
      {quickMsg && <p className="small muted">{quickMsg}</p>}

      <div className="insights-head">
        <strong>Spending insights</strong>
        <button className="btn ghost small" onClick={getInsights} disabled={busy === 'insights'}>
          {busy === 'insights' ? 'Thinking…' : 'Generate'}
        </button>
      </div>
      {insights && <ul className="insights">{insights.map((t, i) => <li key={i}>{t}</li>)}</ul>}

      {locked && (
        <p className="small muted">
          This is a Premium feature. <button className="link" onClick={onUpgrade}>Go Premium</button>
        </p>
      )}
    </div>
  );
}