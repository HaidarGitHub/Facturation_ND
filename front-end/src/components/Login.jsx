import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { saveAuth } from '../utils/auth';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        saveAuth({
          token: data.token,
          username: data.username,
          role: data.role,
          permissions: data.permissions || {},
          office: data.office,
        });
        onLogin();
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <>
      <style>{`
        .login-card {
          max-width: 480px;
          margin: 80px auto;
          padding: 48px 40px 36px 40px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 6px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.10);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .login-card h2 {
          margin-bottom: 32px;
          color: #222;
          font-weight: 700;
          font-size: 2.2rem;
        }
        .login-card form {
          width: 100%;
        }
        .login-input {
          width: 100%;
          padding: 18px 16px;
          margin-bottom: 24px;
          border: 2px solid #d1d5db;
          border-radius: 10px;
          font-size: 1.25rem;
          transition: border 0.2s;
          background: #fafbfc;
        }
        .login-input:focus {
          border-color: #6366f1;
          outline: none;
          background: #fff;
        }
        .login-btn {
          width: 100%;
          padding: 16px 0;
          background: linear-gradient(90deg, #6366f1 0%, #60a5fa 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 1.3rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, box-shadow 0.2s;
          box-shadow: 0 3px 12px rgba(99,102,241,0.10);
        }
        .login-btn:hover {
          background: linear-gradient(90deg, #4f46e5 0%, #2563eb 100%);
        }
        .login-error {
          color: #ef4444;
          background: #fef2f2;
          border: 1.5px solid #fecaca;
          border-radius: 8px;
          padding: 12px 16px;
          margin-top: 18px;
          font-size: 1.1rem;
          text-align: center;
        }
      `}</style>
      <div className="login-card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="login-input"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="login-input"
            />
          </div>
          <button type="submit" className="login-btn">Login</button>
          {error && <div className="login-error">{error}</div>}
        </form>
      </div>
    </>
  );
};

export default Login;
