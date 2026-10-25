import { useState } from 'react';
import { api } from '../api.js';
import { toInputDate } from '../format.js';

export default function ItemForm({ categories, onAdded, onUpgrade }) {
  const empty = { name: '', amount: '', category: 'auto', date: toInputDate(new Date()) };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [limitHit, setLimitHit] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLimitHit(false);
    setBusy(true);
    try {
      await api.addItem({ ...form, amount: Number(form.amount) });
      setForm(empty);
      onAdded();
    } catch (err) {
      setError(err.message);
      setLimitHit(err.code === 'LIMIT_REACHED');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Add an item</h2>
      <div className="form-grid">
        <label>Item
          <input value={form.name} onChange={set('name')} placeholder="e.g. Lunch at cafe" maxLength={120} required />
        </label>
        <label>Amount (₹)
          <input type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" required />
        </label>
        <label>Category
          <select value={form.category} onChange={set('category')}>
            <option value="auto">✨ Auto-detect (AI)</option>
            {(categories || []).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Date
          <input type="date" value={form.date} onChange={set('date')} required />
        </label>
        <button className="btn primary" disabled={busy}>{busy ? 'Adding…' : 'Add'}</button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}{' '}
          {limitHit && <button type="button" className="link" onClick={onUpgrade}>Go Premium</button>}
        </p>
      )}
    </form>
  );
}