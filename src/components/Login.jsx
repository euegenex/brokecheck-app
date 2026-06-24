import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/'); // Redirect to dashboard after successful login
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">BrokeCheck</h1>
          <p className="text-sm text-slate-500 mt-1">Stay Broke? Not on Our Watch.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none transition-colors"
              placeholder="eugene@palm.edu.gh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-slate-900 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;