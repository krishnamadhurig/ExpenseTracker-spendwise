import { useState } from 'react';
import { api } from '../api.js';
import { fmtDate, inr, toInputDate } from '../format.js';

function Row({ item, categories, onChanged, onError }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirming, setConfirming] = useState(false);

  function startEdit() {
    setDraft({ name: item.name, amount: item.amount, category: item.category, date: toInputDate(item.date) });
    setEditing(true);
  }

  async function save() {
    try {
      await api.updateItem(item._id, { ...draft, amount: Number(draft.amount) });
      setEditing(false);
      onChanged(false);
    } catch (err) {
      onError(err.message);
    }
  }

  async function remove() {
    try {
      await api.deleteItem(item._id);
      onChanged(true);
    } catch (err) {
      setConfirming(false);
      onError(err.message);
    }
  }

  if (editing) {
    const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
    return (
      <tr>
        <td><input type="date" value={draft.date} onChange={set('date')} /></td>
        <td><input value={draft.name} onChange={set('name')} maxLength={120} /></td>
        <td>
          <select value={draft.category} onChange={set('category')}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </td>
        <td><input type="number" min="0.01" step="0.01" value={draft.amount} onChange={set('amount')} /></td>
        <td className="actions">
          <button className="link" onClick={save}>Save</button>
          <button className="link" onClick={() => setEditing(false)}>Cancel</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{fmtDate(item.date)}</td>
      <td>{item.name}</td>
      <td><span className="tag">{item.category}</span></td>
      <td className="num">{inr(item.amount)}</td>
      <td className="actions">
        {confirming ? (
          <>
            <span className="small muted">Delete?</span>
            <button className="link danger" onClick={remove}>Yes</button>
            <button className="link" onClick={() => setConfirming(false)}>No</button>
          </>
        ) : (
          <>
            <button className="link" onClick={startEdit}>Edit</button>
            <button className="link danger" onClick={() => setConfirming(true)}>Delete</button>
          </>
        )}
      </td>
    </tr>
  );
}

export default function ItemList({ data, categories, total, filters, setFilters, onPage, onChanged, onError }) {
  const { items, pagination } = data;
  const { page, totalPages, total: count, pageSize, hasPrev, hasNext } = pagination;
  const from = count ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, count);

  return (
    <div className="card">
      <div className="card-head">
        <h2>Your items</h2>
        <div className="row gap">
          <input
            className="search"
            placeholder="Search…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            aria-label="Search items"
          />
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="empty">No items yet. Add your first one above.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Item</th><th>Category</th><th className="num">Amount</th><th /></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <Row key={it._id} item={it} categories={categories} onChanged={onChanged} onError={onError} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pager">
        <span className="muted small">{from}–{to} of {count}</span>
        <div className="row gap">
          <button className="btn ghost small" disabled={!hasPrev} onClick={() => onPage(page - 1)}>‹ Prev</button>
          <span className="small">Page {page} of {totalPages}</span>
          <button className="btn ghost small" disabled={!hasNext} onClick={() => onPage(page + 1)}>Next ›</button>
        </div>
      </div>

      <div className="total-bar">
        <span>Total amount</span>
        <strong>{inr(total)}</strong>
      </div>
    </div>
  );
}