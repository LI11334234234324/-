import React from 'react';

interface WaveformVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  className?: string;
  theme?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isPlaying,
  barCount = 18,
  className = '',
  theme = 'light',
}) => {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  // Determine bar active colors based on theme
  const getBarColor = (index: number) => {
    if (theme === 'dark') return 'bg-cyan-400';
    if (theme === 'sepia') return 'bg-amber-700';
    if (theme === 'slate') return 'bg-indigo-400';
    return 'bg-blue-600';
  };

  return (
    <div className={`flex items-end justify-center gap-[3px] h-8 px-2 overflow-hidden ${className}`}>
      {bars.map((i) => {
        // Generate pseudo-random delay and height for realistic sound wave effect
        const baseHeight = 20 + Math.sin(i * 0.8) * 15;
        const animationDuration = 0.4 + (i % 5) * 0.15;
        
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-200 ${getBarColor(i)} ${
              isPlaying ? 'animate-pulse' : 'opacity-40'
            }`}
            style={{
              height: isPlaying ? `${Math.max(15, Math.min(100, baseHeight + (i % 3) * 20))}%` : '20%',
              animationDuration: `${animationDuration}s`,
              animationDelay: `${(i % 4) * 0.1}s`,
            }}
          />
        );
      })}
    </div>
  );
};
