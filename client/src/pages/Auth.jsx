import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export function Auth({ register }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const path = register ? '/auth/register' : '/auth/login';
      const payload = register
        ? form
        : { login: form.email, password: form.password };

      const { data } = await api.post(path, payload);
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="brand centered" to="/">
          <span><Code2 size={23} /></span>CodeForge
        </Link>
        <h1>{register ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {register
            ? 'Join the community and start solving problems today.'
            : 'Log in to continue your coding journey.'}
        </p>

        {error && <p className="error">{error}</p>}

        {register && (
          <label>
            Full name
            <input
              required
              placeholder="e.g. Alex Turing"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
        )}

        {register && (
          <label>
            Username
            <input
              required
              placeholder="e.g. alexturing"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>
        )}

        <label>
          Email or username
          <input
            required
            type={register ? 'email' : 'text'}
            placeholder="user@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label>
          Password
          <input
            required
            minLength="6"
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>

        <button className="button full" disabled={loading}>
          {loading ? 'Processing...' : register ? 'Create account' : 'Log in'}
        </button>

        <p className="switch">
          {register ? 'Already have an account?' : 'New to CodeForge?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Log in' : 'Create one'}
          </Link>
        </p>
      </form>
    </div>
  );
}

