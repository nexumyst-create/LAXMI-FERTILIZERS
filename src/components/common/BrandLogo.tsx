import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  onDark?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, onDark = false }) => {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={compact ? 34 : 40}
        height={compact ? 34 : 40}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect width="44" height="44" rx="10" fill={onDark ? '#FFFFFF' : '#176B3A'} />
        <path
          d="M22 9C16.5 13 13.5 18.5 13.5 24C13.5 29 17.2 33 22 33C26.8 33 30.5 29 30.5 24C30.5 18.5 27.5 13 22 9Z"
          fill={onDark ? '#176B3A' : '#4CAF50'}
          fillOpacity={onDark ? '0.16' : '0.35'}
        />
        <path
          d="M22 11C18.2 15.5 16.5 20.3 17 25.5C17.4 29.2 19.6 31.8 22 33C24.4 31.8 26.6 29.2 27 25.5C27.5 20.3 25.8 15.5 22 11Z"
          stroke={onDark ? '#176B3A' : '#FFFFFF'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M22 13V33M22 20L26 17M22 25L18 22"
          stroke="#F5B82E"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="22" cy="10" r="2.2" fill="#F5B82E" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span
          className={`font-display font-bold tracking-tight whitespace-nowrap ${
            compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
          } ${onDark ? 'text-white' : 'text-[#176B3A]'}`}
        >
          Laksmi Agri Store
        </span>
        {!compact && (
          <span
            className={`text-[11px] font-medium whitespace-nowrap hidden sm:block ${
              onDark ? 'text-emerald-100/80' : 'text-neutral-500'
            }`}
          >
            Fertilizers · Pesticides · Seeds
          </span>
        )}
      </div>
    </div>
  );
};
