/**
 * Capita Bee Financial Services - Official Brand Logo Component
 * Implements the silver house roof emblem with chimney, azure blue 'C'
 * and vibrant orange 'B' monogram, plus metallic typography and orange tagline.
 */

import React, { useState } from 'react';
import { BRAND } from '../../config/brand';

export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  variant?: 'inline' | 'mark' | 'badge' | 'image';
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  onClick?: () => void;
}

/**
 * High-precision vector emblem of the Capita Bee house silhouette and CB monogram
 */
export const CapitaBeeEmblemSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Capita Bee Emblem"
    >
      <defs>
        {/* Silver Metallic Gradient for House & Chimney */}
        <linearGradient id="cbRoofGradient" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#E2E8F0" />
          <stop offset="70%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* Azure / Sky-Blue Gradient for 'C' */}
        <linearGradient id="cbBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>

        {/* Vibrant Orange Gradient for 'B' */}
        <linearGradient id="cbOrangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>

        {/* Inner glow and drop shadow */}
        <filter id="cbShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* House Chimney (Right side) */}
      <path
        d="M 67 31 L 67 17.5 C 67 15.5 68.5 14 70.5 14 L 73.5 14 C 75.5 14 77 15.5 77 17.5 L 77 39"
        stroke="url(#cbRoofGradient)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#cbShadow)"
      />

      {/* House Roofline - Double Outline Profile */}
      {/* Outer Gable Roof with extended right wall corner */}
      <path
        d="M 17 48 L 50 16 L 83 48 L 83 78"
        stroke="url(#cbRoofGradient)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#cbShadow)"
      />

      {/* Inner Gable Roof Outline */}
      <path
        d="M 23 48 L 50 22 L 77 48 L 77 78"
        stroke="url(#cbRoofGradient)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.95"
      />

      {/* Monogram Group */}
      <g filter="url(#cbShadow)" transform="translate(0, 1)">
        {/* Azure Blue Crescent 'C' */}
        <path
          d="M 48 36 C 36.5 36 27.5 45 27.5 56.5 C 27.5 68 36.5 77 48 77 C 41.5 73.5 37 65.5 37 56.5 C 37 47.5 41.5 39.5 48 36 Z"
          fill="url(#cbBlueGradient)"
        />

        {/* Vibrant Orange 'B' Monogram */}
        {/* Outer body of 'B' */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 47 40.5 C 47 38.5 48.5 37 50.5 37 L 60.5 37 C 67.5 37 72 40.8 72 46.2 C 72 50.2 69.2 53.2 64.5 54.4 C 70.2 55.6 73.5 59.2 73.5 64.6 C 73.5 71.2 68 76 60.5 76 L 50.5 76 C 48.5 76 47 74.5 47 72.5 L 47 40.5 Z M 53.5 42.5 L 53.5 52.5 L 59.8 52.5 C 63.8 52.5 66.2 50.4 66.2 47.5 C 66.2 44.6 63.8 42.5 59.8 42.5 L 53.5 42.5 Z M 53.5 58 L 53.5 70.5 L 60.2 70.5 C 64.8 70.5 67.6 68.2 67.6 64.2 C 67.6 60.2 64.8 58 60.2 58 L 53.5 58 Z"
          fill="url(#cbOrangeGradient)"
        />
      </g>
    </svg>
  );
};

export const CapitabeeLogo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = true,
  variant = 'inline',
  className = '',
  theme = 'auto',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  // Size mapping for the emblem container
  const dimensionMap = {
    xs: { box: 28, svg: 22, text: 'text-xs', sub: 'text-[7.5px]', full: 'w-24' },
    sm: { box: 36, svg: 28, text: 'text-sm', sub: 'text-[8.5px]', full: 'w-32' },
    md: { box: 44, svg: 34, text: 'text-base', sub: 'text-[9.5px]', full: 'w-44' },
    lg: { box: 56, svg: 44, text: 'text-xl', sub: 'text-[11px]', full: 'w-56' },
    xl: { box: 72, svg: 58, text: 'text-2xl', sub: 'text-xs', full: 'w-72' },
  };

  const dim = dimensionMap[size];

  // 1. Badge Variant (Official Dark Navy Rounded Card with Full 3D Asset or Vector)
  if (variant === 'badge') {
    return (
      <div
        id="capita-bee-badge"
        onClick={onClick}
        className={`relative inline-flex flex-col items-center justify-center p-4 rounded-2xl bg-[#0A1224] border border-[#1E293B] shadow-xl select-none group transition-transform hover:scale-[1.01] ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {!imageError ? (
          <img
            src={BRAND.logoUrl}
            alt="Capita Bee Financial Services Logo"
            className={`${dim.full} h-auto rounded-xl object-contain shadow-md`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-xl bg-[#0E1A33] border border-[#1E293B] mb-3">
              <CapitaBeeEmblemSvg size={dim.svg * 1.5} />
            </div>
            <span className="font-bold tracking-widest text-white text-lg">CAPITA BEE</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-[1px] w-6 bg-[#EA580C]" />
              <span className="sans-micro text-[10px] font-semibold text-[#FB923C] tracking-[0.2em]">
                FINANCIAL SERVICES
              </span>
              <div className="h-[1px] w-6 bg-[#EA580C]" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Mark-Only Variant
  if (variant === 'mark') {
    return (
      <div
        id="capita-bee-mark"
        onClick={onClick}
        style={{ width: dim.box, height: dim.box }}
        className={`relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-[#0A1224] via-[#0E1A33] to-[#0A1224] shadow-md border border-[#1E293B] select-none ${
          onClick ? 'cursor-pointer hover:border-[#0284C7]/60 transition-colors' : ''
        } ${className}`}
      >
        <CapitaBeeEmblemSvg size={dim.svg} />
      </div>
    );
  }

  // 3. Image-Only Variant
  if (variant === 'image') {
    return (
      <div
        id="capita-bee-image"
        onClick={onClick}
        className={`inline-flex items-center justify-center select-none ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <img
          src={BRAND.logoUrl}
          alt="Capita Bee Logo"
          className={`${dim.full} h-auto object-contain rounded-xl`}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // 4. Default Inline Variant (Emblem tile on left + typography on right)
  const isDarkText = theme === 'light' || theme === 'auto';

  return (
    <div
      className={`flex items-center gap-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      id="capitabee-brand-logo"
      onClick={onClick}
    >
      {/* Brand Emblem Icon Frame (Navy backdrop with House + CB Monogram) */}
      <div
        className="relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-b from-[#0A1224] via-[#0D182E] to-[#080E1D] shadow-sm border border-[#1E2B45] transition-all group-hover:border-[#0284C7]/60"
        style={{ width: dim.box, height: dim.box }}
      >
        <CapitaBeeEmblemSvg size={dim.svg} />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span
            className={`font-extrabold tracking-wider ${dim.text} ${
              isDarkText ? 'text-[#121212]' : 'text-white'
            }`}
            style={{ letterSpacing: '0.08em' }}
          >
            CAPITA BEE
          </span>
        </div>

        {showTagline && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`sans-micro font-bold tracking-[0.22em] text-[#EA580C] uppercase ${dim.sub}`}
            >
              FINANCIAL SERVICES
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
