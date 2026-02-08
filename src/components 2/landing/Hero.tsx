'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Eye, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const words = ['real-time', 'AI-powered', 'intelligent', 'webcam-based'];

function CyclingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={words[index]}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="inline-block text-blue-400"
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
}

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex min-h-screen flex-col items-center justify-center px-4"
    >
      <div className="mx-auto max-w-4xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-4 py-1.5 text-sm text-gray-300"
        >
          <Eye className="h-4 w-4 text-blue-400" />
          Built for Hacklahoma 2026
        </motion.div>

        {/* Heading */}
        <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Stay focused with{' '}
          <CyclingWord />{' '}
          coaching
        </h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mx-auto mb-4 max-w-2xl text-lg text-gray-400 sm:text-xl"
        >
          AI-powered focus detection that runs entirely in your browser.
          Your video never leaves your device.
        </motion.p>

        {/* Privacy badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mb-10 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500"
        >
          <span className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-green-500" />
            No recording
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-green-500" />
            Browser-based
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-green-500" />
            Instant feedback
          </span>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Link href="/session">
            <Button size="lg" className="gap-2">
              Start Focus Session
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}
