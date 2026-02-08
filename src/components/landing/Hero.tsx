'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Play, Eye } from 'lucide-react';
import styles from '@/styles/warm-theme.module.css';

export default function Hero() {
  const heroTitleRef = useRef<HTMLHeadingElement>(null);

  // Cursor follow effect for hero title
  useEffect(() => {
    const heroTitle = heroTitleRef.current;
    if (!heroTitle) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = heroTitle.getBoundingClientRect();
      heroTitle.style.setProperty('--x', `${e.clientX - rect.left}px`);
      heroTitle.style.setProperty('--y', `${e.clientY - rect.top}px`);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-warmBeige text-warmBrown flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-warmCoral/20 selection:text-warmBrown">
      {/* Organic Background Elements */}
      <div className={`absolute inset-0 ${styles.bgTexture} z-0 pointer-events-none mix-blend-multiply`} />
      <div className={`absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#E8DCC4] rounded-full blur-[100px] opacity-60 pointer-events-none ${styles.animateFloat}`} />
      <div className={`absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-[#D8E2DC] rounded-full blur-[120px] opacity-60 pointer-events-none ${styles.animateFloatDelayed}`} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#F2E8DE] rounded-full blur-[80px] opacity-40 pointer-events-none" />

      {/* Main Content Wrapper */}
      <main className="relative z-10 w-full max-w-[1280px] flex flex-col items-center px-6 pt-20 pb-4 md:pt-28 md:pb-6 gap-10">
        {/* Hero Title - Zodiak Bold - Moved Down */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <h1
            ref={heroTitleRef}
            className={`text-6xl md:text-8xl font-['Zodiak'] font-bold tracking-tight cursor-default drop-shadow-sm ${styles.heroTitle}`}
          >
            Focus Flow
          </h1>
          <p className="text-xs md:text-sm tracking-[0.2em] uppercase font-normal text-[#8D7F7D] font-['Plus_Jakarta_Sans']">
            AI - Powered Focus Tracking
          </p>
        </motion.div>

        {/* Camera Preview Box - 35% smaller: 832px × 624px (4:3 ratio), 40px corners */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative w-full max-w-[832px] aspect-[4/3] bg-[#F5F2EB] rounded-[40px] border-[6px] border-[#FFFFFF]/80 ring-1 ring-[#EBE5DA] shadow-[0_20px_40px_-12px_rgba(67,48,43,0.1)] overflow-hidden"
        >
          {/* Content Container */}
          <div className="absolute inset-0 flex flex-col items-center justify-between px-8 py-10 text-center z-10">
            {/* Top Section - Badge, Headline, Description */}
            <div className="flex flex-col items-center gap-4">
              {/* Badge */}
              <div className={`inline-flex items-center gap-2 rounded-full border border-warmCoral/20 ${styles.glassOrganic} px-4 py-1.5 text-xs text-warmBrownMuted`}>
                <Eye className="h-3.5 w-3.5 text-warmCoral" />
                Built for Hacklahoma 2026
              </div>

              {/* Main Message */}
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                <span className="text-warmBrown">Your focus, </span>
                <span className={`${styles.animateShimmer} bg-gradient-to-r from-warmCoral via-warmCoralLight to-warmCoral bg-clip-text text-transparent`}>
                  tracked privately
                </span>
              </h2>

              {/* Description */}
              <p className="text-base md:text-lg text-warmBrownMuted max-w-2xl leading-relaxed">
                Real-time AI coaching that never records. Your webcam stays local, your data stays yours.
              </p>
            </div>

            {/* Bottom Section - Button: Full width up to 384px, 48px tall */}
            <div className="w-full max-w-[384px]">
              <Link href="/session" className="block">
                <button className="group relative w-full h-12 flex items-center justify-center rounded-full transition-all duration-[800ms] hover:scale-[1.02] cursor-pointer">
                  {/* Blur Glow (Behind) */}
                  <div className={`absolute -inset-1 rounded-full opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-70 ${styles.animateGradientSweep}`} />
                  {/* Button Background - Terracotta gradient sweeping left-to-right over 3s */}
                  <div className={`absolute inset-0 rounded-full ${styles.animateGradientSweep} shadow-xl shadow-[#E07856]/20`} />
                  {/* Texture Overlay */}
                  <div className={`absolute inset-0 ${styles.bgTexture} mix-blend-overlay opacity-30 rounded-full pointer-events-none`} />

                  <span className="relative z-10 flex items-center justify-center gap-3 text-[#FDFBF7] font-semibold text-lg tracking-wide">
                    <Play className="h-5 w-5 fill-current" />
                    Begin Session
                  </span>
                </button>
              </Link>
            </div>
          </div>

          {/* Dot Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#43302B_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.03] pointer-events-none" />

          {/* Scanning Effect */}
          <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-[#C06C4C]/10 to-transparent h-full w-full ${styles.animateScan} pointer-events-none`} />
        </motion.div>
      </main>
    </div>
  );
}
