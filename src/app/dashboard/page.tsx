'use client';

import { useEffect, useState } from 'react';
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid';
import { AnalyticsModal } from '@/components/dashboard/AnalyticsModal';
import { FocusHeatmap } from '@/components/dashboard/FocusHeatmap';
import { ZoneDistribution } from '@/components/dashboard/ZoneDistribution';
import { ProductivityScore } from '@/components/dashboard/ProductivityScore';
import { DistractionPatterns } from '@/components/dashboard/DistractionPatterns';
import { StreakCalendar } from '@/components/dashboard/StreakCalendar';
import { AIAssistant } from '@/components/dashboard/AIAssistant';
import {
  HeatmapIcon,
  ZoneIcon,
  ProductivityIcon,
  DistractionIcon,
  StreakIcon,
  AIIcon
} from '@/components/dashboard/CustomIcons';
import {
  calculateHeatmap,
  calculateZoneDistribution,
  calculateProductivityScore,
  analyzeDistractionPatterns,
  generateStreakCalendar,
  calculateStreak,
  Session
} from '@/lib/analytics-engine';
import { seedDemoDataIfEmpty } from '@/lib/demo-data';

type ModalType = 'heatmap' | 'zones' | 'productivity' | 'distractions' | 'streak' | 'ai' | null;

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const loadSessions = () => {
    seedDemoDataIfEmpty();
    const stored = localStorage.getItem('focus-sessions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSessions(parsed);
      } catch (error) {
        console.error('Error parsing sessions:', error);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSessions();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'focus-sessions') {
        loadSessions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(() => {
      loadSessions();
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warmBeige flex items-center justify-center">
        <div className="text-warmBrown text-xl">Loading analytics...</div>
      </div>
    );
  }

  // Calculate analytics
  const heatmapData = calculateHeatmap(sessions);
  const zoneData = calculateZoneDistribution(sessions);
  const currentStreak = calculateStreak(sessions);
  const productivityData = calculateProductivityScore(sessions, currentStreak);
  const distractionData = analyzeDistractionPatterns(sessions);
  const streakCalendar = generateStreakCalendar(sessions, 90);

  const userContext = {
    streak: currentStreak,
    productivityScore: productivityData.overall,
    avgFocus: productivityData.breakdown.avgFocus,
    topDistraction: distractionData[0]?.label || 'None',
    sessionsThisWeek: sessions.filter(s => Date.now() - s.startTime < 7 * 24 * 60 * 60 * 1000).length,
    totalSessions: sessions.length,
    deepFocusPercentage: zoneData.deepFocus
  };

  const features = [
    {
      Icon: HeatmapIcon,
      name: 'Focus Heatmap',
      description: 'When you focus best',
      href: '#',
      cta: 'View details',
      background: (
        <div className="absolute inset-0 opacity-80 p-4">
          <FocusHeatmap data={heatmapData} />
        </div>
      ),
      className: 'lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2',
      onClick: () => setOpenModal('heatmap')
    },
    {
      Icon: ZoneIcon,
      name: 'Focus Zones',
      description: `${zoneData.deepFocus}% deep focus`,
      href: '#',
      cta: 'View details',
      background: (
        <div className="absolute inset-0 opacity-80 flex items-center justify-center p-8">
          <div className="w-full h-full max-h-[400px]">
            <ZoneDistribution data={zoneData} />
          </div>
        </div>
      ),
      className: 'lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2',
      onClick: () => setOpenModal('zones')
    },
    {
      Icon: ProductivityIcon,
      name: 'Productivity',
      description: `${productivityData.overall}/100 score`,
      href: '#',
      cta: 'View details',
      background: (
        <div className="absolute inset-0 opacity-80 flex items-center justify-center p-8">
          <div className="w-full h-full max-h-[400px]">
            <ProductivityScore data={productivityData} />
          </div>
        </div>
      ),
      className: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2',
      onClick: () => setOpenModal('productivity')
    },
    {
      Icon: DistractionIcon,
      name: 'Distractions',
      description: distractionData.length > 0 ? `${distractionData[0].label} most common` : 'No data',
      href: '#',
      cta: 'View details',
      background: (
        <div className="absolute inset-0 opacity-80 flex items-center justify-center p-8">
          <div className="w-full h-full max-h-[400px]">
            {distractionData.length > 0 ? (
              <DistractionPatterns data={distractionData} />
            ) : (
              <div className="flex items-center justify-center h-full text-warmBrownMuted">
                Complete sessions to see patterns
              </div>
            )}
          </div>
        </div>
      ),
      className: 'lg:col-start-1 lg:col-end-2 lg:row-start-2 lg:row-end-3',
      onClick: () => setOpenModal('distractions')
    },
    {
      Icon: StreakIcon,
      name: 'Focus Streak',
      description: `${currentStreak} day streak`,
      href: '#',
      cta: 'View details',
      background: (
        <div className="absolute inset-0 opacity-80 flex items-center justify-center p-6">
          <div className="w-full h-full max-h-[400px]">
            <StreakCalendar data={streakCalendar} currentStreak={currentStreak} />
          </div>
        </div>
      ),
      className: 'lg:col-start-2 lg:col-end-4 lg:row-start-2 lg:row-end-3',
      onClick: () => setOpenModal('streak')
    },
    {
      Icon: AIIcon,
      name: 'AI Coach',
      description: 'Chat about your focus',
      href: '#',
      cta: 'Start chat',
      background: (
        <div className="absolute inset-0 bg-gradient-to-br from-warmCoral/[0.05] via-transparent to-warmCoralLight/[0.06] opacity-55" />
      ),
      className: 'lg:col-start-1 lg:col-end-4 lg:row-start-3 lg:row-end-4',
      onClick: () => setOpenModal('ai')
    }
  ];

  return (
    <main className="min-h-screen bg-warmBeige text-warmBrown p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-warmBrown mb-2">
          Focus Analytics
        </h1>
        <p className="text-warmBrownMuted">
          {sessions.length > 0
            ? `Insights from ${sessions.length} focus sessions`
            : 'Complete your first session to unlock insights'}
        </p>
      </div>

      {/* BentoGrid */}
      <div className="max-w-7xl mx-auto">
        <BentoGrid className="lg:grid-rows-3">
          {features.map(feature => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </div>

      {/* Modals */}
      <AnalyticsModal
        isOpen={openModal === 'heatmap'}
        onClose={() => setOpenModal(null)}
        title="Focus Score Heatmap"
      >
        <div className="h-96">
          <FocusHeatmap data={heatmapData} />
        </div>
        <p className="mt-4 text-sm text-warmBrownMuted">
          This heatmap shows your average focus score by hour and day of the week.
          Darker colors indicate higher focus levels.
        </p>
      </AnalyticsModal>

      <AnalyticsModal
        isOpen={openModal === 'zones'}
        onClose={() => setOpenModal(null)}
        title="Focus Zone Distribution"
      >
        <div className="h-96">
          <ZoneDistribution data={zoneData} />
        </div>
        <p className="mt-4 text-sm text-warmBrownMuted">
          Time spent in each focus zone: Deep Focus (80-100), Moderate (50-79), Distracted (0-49).
        </p>
      </AnalyticsModal>

      <AnalyticsModal
        isOpen={openModal === 'productivity'}
        onClose={() => setOpenModal(null)}
        title="Productivity Score"
      >
        <div className="h-96">
          <ProductivityScore data={productivityData} />
        </div>
        <p className="mt-4 text-sm text-warmBrownMuted">
          Composite score combining average focus (40%), completion rate (30%), streak (20%), and improvement (10%).
        </p>
      </AnalyticsModal>

      <AnalyticsModal
        isOpen={openModal === 'distractions'}
        onClose={() => setOpenModal(null)}
        title="Distraction Patterns"
      >
        <div className="h-96">
          {distractionData.length > 0 ? (
            <DistractionPatterns data={distractionData} />
          ) : (
            <div className="flex items-center justify-center h-full text-warmBrownMuted">
              Complete sessions with distraction tracking to see patterns
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-warmBrownMuted">
          Frequency and recovery time for different types of distractions.
        </p>
      </AnalyticsModal>

      <AnalyticsModal
        isOpen={openModal === 'streak'}
        onClose={() => setOpenModal(null)}
        title="Focus Streak Calendar"
      >
        <div className="h-96">
          <StreakCalendar data={streakCalendar} currentStreak={currentStreak} />
        </div>
        <p className="mt-4 text-sm text-warmBrownMuted">
          GitHub-style calendar showing your focus activity over the last 90 days.
        </p>
      </AnalyticsModal>

      <AnalyticsModal
        isOpen={openModal === 'ai'}
        onClose={() => setOpenModal(null)}
        title="AI Focus Coach"
      >
        <div className="h-[600px]">
          <AIAssistant userContext={userContext} />
        </div>
      </AnalyticsModal>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-8 text-center text-sm text-warmBrownMuted">
        Live updates every 2 seconds • Click any card to view details
      </div>
    </main>
  );
}
