'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // For now, we'll just do basic validation and redirect
      // In a real app, this would connect to an auth service
      if (email && password) {
        // Store some indication that the user is logged in
        sessionStorage.setItem('isLoggedIn', 'true');
        router.push('/'); // Redirect to the resume upload page
      } else {
        setError('Please fill in all fields');
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.formCard}>
          <h1 className={styles.title}>Welcome to JobMatch</h1>
          <p className={styles.subtitle}>Sign in to find your perfect job match</p>
          
          {error && <div className={styles.error}>{error}</div>}
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className={styles.links}>
            <a href="#" className={styles.link}>Forgot password?</a>
            <a href="#" className={styles.link}>Create an account</a>
          </div>
        </div>
      </div>
    </main>
  );
} 