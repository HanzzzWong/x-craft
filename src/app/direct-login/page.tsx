'use client';

import { useState } from 'react';

export default function DirectLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [diagnostics, setDiagnostics] = useState<any>(null);

  async function runDiagnostics() {
    setLoading(true);
    setError('');
    setMessage('Running database diagnostics...');
    
    try {
      const response = await fetch('/api/auth-test');
      const data = await response.json();
      
      setDiagnostics(data);
      setMessage(data.connectionTest.success 
        ? 'Database connection successful!' 
        : 'Database connection failed. See diagnostics below.');
    } catch (e) {
      setError('Error running diagnostics: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        // Login
        setMessage('Logging in...');
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        localStorage.setItem('auth_token', data.token);
        setMessage(`Login successful! Welcome back, ${data.user.name}. Redirecting to home page...`);
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        // Register
        if (!name) {
          throw new Error('Name is required');
        }
        
        setMessage('Creating account...');
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        localStorage.setItem('auth_token', data.token);
        setMessage(`Account created successfully! Welcome, ${data.user.name}. Redirecting to home page...`);
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">
          {isLogin ? 'Direct Login' : 'Direct Registration'}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required={!isLogin}
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            {!isLogin && (
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters and include uppercase, lowercase, 
                numeric, and special characters.
              </p>
            )}
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading}
            >
              {loading 
                ? 'Please wait...' 
                : isLogin 
                  ? 'Log In' 
                  : 'Create Account'}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {isLogin 
              ? "Don't have an account? Register" 
              : "Already have an account? Log in"}
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={runDiagnostics}
            className="text-sm text-gray-600 hover:text-gray-500 underline"
          >
            Run Database Diagnostics
          </button>
        </div>
        
        {diagnostics && (
          <div className="mt-6 text-xs">
            <h3 className="font-bold">Diagnostics Results:</h3>
            <div className="mt-2 bg-gray-100 p-3 rounded overflow-auto max-h-64">
              <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 