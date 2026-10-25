import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Leaderboard({ refreshKey, onUpgrade }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.leaderboard().then(setData).catch(() => setData(null));
  }, [refreshKey]);

  if (!data) return null;
  const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);

  return (
    <div className="card">
      <div className="card-head">
        <h2>Leaderboard</h2>
        <span className="muted small">Most items logged</span>
      </div>
      {data.leaderboard.length === 0 ? (
        <p className="muted">Nobody is on the board yet. Add an item to get started.</p>
      ) : (
        <ol className="board">
          {data.leaderboard.map((r) => (
            <li key={r.rank} className={r.you ? 'you' : ''}>
              <span className="rank">{medal(r.rank)}</span>
              <span className="who">{r.name}{r.you ? ' (you)' : ''}{r.premium && <span className="pill">Premium</span>}</span>
              <span className="muted">{r.count} items</span>
            </li>
          ))}
        </ol>
      )}
      {data.me && !data.leaderboard.some((r) => r.you) && (
        <p className="small muted">Your rank: #{data.me.rank} with {data.me.count} items.</p>
      )}
      {data.limitedView && (
        <p className="small muted">
          Showing the top 3. <button className="link" onClick={onUpgrade}>Go Premium</button> to see the top 10.
        </p>
      )}
    </div>
  );
}