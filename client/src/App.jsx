import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const { checking, offline, retry, logout } = useAuth();

  if (checking) return <div className="center muted">Loading…</div>;

  if (offline) {
    return (
      <div className="center">
        <div className="card notice">
          <h2>Can't reach the server</h2>
          <p className="muted">
            Make sure the backend is running (<code>npm run dev</code> in the <code>server</code> folder), then try again.
            You are still logged in.
          </p>
          <div className="row gap">
            <button className="btn primary" onClick={retry}>Try again</button>
            <button className="btn ghost" onClick={logout}>Log out</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {}
      <Route path="/login" element={<PublicOnlyRoute><AuthPage key="login" mode="login" /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><AuthPage key="signup" mode="signup" /></PublicOnlyRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}