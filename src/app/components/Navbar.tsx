'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';
import { storage } from '@/utils/storage';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show navbar on sign-in page
  if (pathname === '/signin') {
    return null;
  }

  const handleLogout = () => {
    storage.clearUser();
    router.push('/signin');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link 
          href="/resume-analysis" 
          className={`${styles.navLink} ${pathname === '/resume-analysis' ? styles.active : ''}`}
        >
          Resume Analysis
        </Link>
          <Link 
          href="/job-recommendations" 
          className={`${styles.navLink} ${pathname === '/job-recommendations' ? styles.active : ''}`}
          >
          Job Recommendations
          </Link>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>
    </nav>
  );
} 