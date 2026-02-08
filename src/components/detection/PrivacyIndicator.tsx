"use client";

export default function PrivacyIndicator() {
  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full bg-gray-900/90 px-3 py-1.5 shadow-lg backdrop-blur-sm border border-gray-700/50">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <span className="text-xs font-medium text-gray-300">Camera Active</span>
      <span className="hidden text-xs text-gray-500 sm:inline">
        &middot; Video stays on your device
      </span>
    </div>
  );
}
