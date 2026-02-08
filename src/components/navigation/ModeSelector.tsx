'use client';

import { usePathname, useRouter } from 'next/navigation';
import styles from '@/styles/warm-theme.module.css';

export default function ModeSelector() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${styles.glassOrganic} rounded-full px-1 py-1 flex items-center gap-1 shadow-lg shadow-[#43302B]/5 border border-white/60`}>
      <button
        onClick={() => router.push('/')}
        className={`flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 ${
          isActive('/')
            ? 'text-warmBrown bg-warmBeige border border-warmBorder'
            : 'text-warmBrownMuted hover:text-[#5D524F] hover:bg-[#F2E8DE]/50'
        } ${styles.slideInLeft1}`}
      >
        Solo
      </button>
      <button
        onClick={() => router.push('/multiplayer')}
        className={`flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 ${
          isActive('/multiplayer')
            ? 'text-warmBrown bg-warmBeige border border-warmBorder'
            : 'text-warmBrownMuted hover:text-[#5D524F] hover:bg-[#F2E8DE]/50'
        } ${styles.slideInLeft2}`}
      >
        Multiplayer
      </button>
      <button
        onClick={() => router.push('/dashboard')}
        className={`flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 ${
          isActive('/dashboard')
            ? 'text-warmBrown bg-warmBeige border border-warmBorder'
            : 'text-warmBrownMuted hover:text-[#5D524F] hover:bg-[#F2E8DE]/50'
        } ${styles.slideInLeft3}`}
      >
        Dashboard
      </button>
    </nav>
  );
}
