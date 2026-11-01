/**
 * @file MattKonnectLogo.tsx
 * @description Logo officiel vectoriel Matt Konnect (mattkonnect.com) & My Konnect
 * Symbole de connectivité digitale, nœuds de réseau et typographie haute fidélité.
 */

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const MattKonnectLogo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblème Vectoriel Matt Konnect : Nœuds de connexion réseau & Monogramme MK */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            <linearGradient id="mkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="mkNode" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Hexagone / Cadre de connexion sobre */}
          <rect
            x="2"
            y="2"
            width="44"
            height="44"
            rx="10"
            className="fill-slate-900 stroke-slate-800"
            strokeWidth="1.5"
          />

          {/* Lignes de liaison "Konnect" */}
          <path
            d="M13 14V34"
            stroke="url(#mkGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M13 24H24L33 14"
            stroke="url(#mkGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24 24L34 34"
            stroke="url(#mkGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Nœuds de connexion (points réseau) */}
          <circle cx="13" cy="14" r="2.5" fill="url(#mkNode)" />
          <circle cx="13" cy="24" r="2" fill="#ffffff" />
          <circle cx="13" cy="34" r="2.5" fill="url(#mkNode)" />
          <circle cx="33" cy="14" r="2.5" fill="#38bdf8" />
          <circle cx="34" cy="34" r="2.5" fill="#38bdf8" />
          <circle cx="24" cy="24" r="2.5" fill="#ffffff" />
        </svg>
      </div>

      {/* Typographie Matt Konnect / My Konnect */}
      <div className="flex flex-col leading-tight">
        <div className={`font-bold tracking-tight text-white flex items-center gap-1.5 ${textSizes[size]}`}>
          <span>My Konnect</span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] text-slate-400 font-medium tracking-wide">
            par <span className="text-sky-400">mattkonnect.com</span>
          </div>
        )}
      </div>
    </div>
  );
};
