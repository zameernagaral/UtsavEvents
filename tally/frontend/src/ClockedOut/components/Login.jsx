import { useState } from 'react';
import { login } from '../api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      onLogin();
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', padding: '2rem', border: '1px solid #eee', borderRadius: 12, fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Leaderboard Admin</h2>
      <input
        style={inputStyle}
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <input
        style={{ ...inputStyle, marginTop: 10 }}
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />
      {error && <p style={{ color: 'red', fontSize: 13, marginTop: 8 }}>{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ marginTop: 14, width: '100%', padding: '9px', background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </div>
  );
}

const inputStyle = {
  display: 'block', width: '100%', padding: '8px 10px',
  border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box'
};