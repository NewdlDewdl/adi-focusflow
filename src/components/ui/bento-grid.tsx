import { ReactNode } from 'react';
import { ArrowRightIcon } from '@radix-ui/react-icons';

import { cn } from '@/lib/utils';

const BentoGrid = ({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'grid w-full auto-rows-[32rem] grid-cols-3 gap-6',
        className
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  onClick
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: any;
  description: string;
  href: string;
  cta: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn(
      'group relative col-span-3 flex flex-col justify-start overflow-hidden rounded-2xl cursor-pointer',
      // Glassmorphic styles with subtle colors
      'bg-white/40 backdrop-blur-xl',
      '[box-shadow:0_0_0_1px_rgba(67,48,43,.08),0_2px_8px_rgba(67,48,43,.06),0_12px_32px_rgba(67,48,43,.08)]',
      'border border-white/60',
      'transform-gpu transition-all duration-300',
      'hover:[box-shadow:0_0_0_1px_rgba(67,48,43,.12),0_4px_16px_rgba(67,48,43,.1),0_20px_48px_rgba(67,48,43,.12)]',
      'hover:scale-[1.02]',
      className
    )}
  >
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 bg-gradient-to-b from-warmBeige/95 via-warmBeige/60 to-transparent pb-20">
      <div className="flex items-center gap-3">
        <Icon className="h-10 w-10 text-warmCoral/90 drop-shadow-sm" />
        <div>
          <h3 className="text-xl font-semibold text-warmBrown tracking-tight">
            {name}
          </h3>
          <p className="text-sm text-warmBrownMuted/80">{description}</p>
        </div>
      </div>
    </div>

    <div
      className={cn(
        'pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-6 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100',
        'bg-gradient-to-t from-warmBeige/95 to-transparent'
      )}
    >
      <button className="flex items-center gap-2 text-warmCoral hover:text-warmCoralLight transition-colors font-medium">
        {cta}
        <ArrowRightIcon className="h-5 w-5" />
      </button>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-warmCoral/[.04]" />
  </div>
);

export { BentoCard, BentoGrid };
