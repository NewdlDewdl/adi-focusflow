'use client';

import { ReactNode, useEffect } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function AnalyticsModal({ isOpen, onClose, title, children }: AnalyticsModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-warmBrown/30 backdrop-blur-md transition-all duration-300"
        onClick={onClose}
        style={{
          animation: 'backdropFadeIn 0.2s ease-out'
        }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-5xl max-h-[85vh] bg-warmBeige rounded-2xl shadow-2xl shadow-warmBrown/20 border-2 border-warmBorder overflow-hidden"
        style={{
          animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header with gradient */}
        <div className="flex items-center justify-between px-8 py-5 border-b-2 border-warmBorder bg-gradient-to-r from-warmSurface to-warmBeige">
          <h2 className="text-3xl font-bold text-warmBrown tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-warmCoral/10 active:scale-95 transition-all duration-200 group"
            aria-label="Close modal"
          >
            <Cross2Icon className="w-6 h-6 text-warmBrown group-hover:text-warmCoral transition-colors" />
          </button>
        </div>

        {/* Content with custom scrollbar */}
        <div className="p-8 overflow-y-auto max-h-[calc(85vh-88px)] custom-scrollbar">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes backdropFadeIn {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(12px);
          }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F5F2EB;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #C06C4C;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #E07856;
        }
      `}</style>
    </div>
  );
}
