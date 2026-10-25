import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info);
  }

  reset = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    window.location.assign('/login');
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="center">
        <div className="card notice">
          <h2>Something went wrong</h2>
          <p className="muted">{String(this.state.error.message || this.state.error)}</p>
          <div className="row gap">
            <button className="btn primary" onClick={() => window.location.reload()}>Reload</button>
            <button className="btn ghost" onClick={this.reset}>Log out and start over</button>
          </div>
        </div>
      </div>
    );
  }
}