import ClientDetectionLoader from '@/components/detection/ClientDetectionLoader';

export default function SessionPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="fixed left-0 top-0 z-40 w-full border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-4xl items-center px-4">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-blue-400">Focus</span>
            <span className="text-white">Flow</span>
          </h1>
        </div>
      </header>

      <ClientDetectionLoader />
    </main>
  );
}
