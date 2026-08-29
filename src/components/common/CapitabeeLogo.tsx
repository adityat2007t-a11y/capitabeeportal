/**
 * Capita Bee Financial Services - Official Brand Logo Component
 * Implements the silver house roof emblem with chimney, azure blue 'C'
 * and vibrant orange 'B' monogram, plus metallic typography and orange tagline.
 */

import React, { useState } from 'react';
import { BRAND } from '../../config/brand';

export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showTagline?: boolean;
  variant?: 'inline' | 'mark' | 'badge' | 'image' | 'full';
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  onClick?: () => void;
}

/**
 * Ultra-precise vector emblem of the Capita Bee house silhouette and CB monogram
 * faithfully reproducing the official brand geometry, gradients, and metallic highlights.
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
        <linearGradient id="cbRoofGradient" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#F1F5F9" />
          <stop offset="55%" stopColor="#CBD5E1" />
          <stop offset="85%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Highlight Gradient for Inner Roof Line */}
        <linearGradient id="cbRoofInnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* Azure / Sky-Blue Gradient for 'C' */}
        <linearGradient id="cbBlueGradient" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="40%" stopColor="#0EA5E9" />
          <stop offset="75%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>

        {/* Vibrant Orange Gradient for 'B' */}
        <linearGradient id="cbOrangeGradient" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="45%" stopColor="#F97316" />
          <stop offset="80%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>

        {/* Drop shadow filter for 3D realism */}
        <filter id="cb3dShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.8" stdDeviation="1.6" floodColor="#000000" floodOpacity="0.5" />
        </filter>

        {/* Soft glow filter */}
        <filter id="cbGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* House Frame & Chimney Group with 3D shadow */}
      <g filter="url(#cb3dShadow)">
        {/* Right Chimney */}
        <path
          d="M 66 31 L 66 17 C 66 14.8 67.8 13 70 13 L 73 13 C 75.2 13 77 14.8 77 17 L 77 39"
          stroke="url(#cbRoofGradient)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Outer Gable Roof + Right Wall */}
        <path
          d="M 16 48 L 50 16 L 84 48 L 84 76"
          stroke="url(#cbRoofGradient)"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Inner Gable Roof + Inner Right Wall */}
        <path
          d="M 23 48 L 50 22.5 L 77 48 L 77 76"
          stroke="url(#cbRoofInnerGradient)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
        />
      </g>

      {/* Central CB Monogram Group */}
      <g filter="url(#cb3dShadow)" transform="translate(0, 0)">
        {/* Left: Sky-Blue Crescent 'C' */}
        <path
          d="M 48 37 C 36 37 27 46 27 57.5 C 27 69 36 78 48 78 C 41 74 36.5 66 36.5 57.5 C 36.5 49 41 41 48 37 Z"
          fill="url(#cbBlueGradient)"
        />

        {/* Right: Vibrant Orange 'B' Monogram */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 47 40.5 C 47 38.5 48.5 37 50.5 37 L 61 37 C 67.8 37 72.5 40.8 72.5 46.2 C 72.5 50.2 69.5 53.2 65 54.4 C 70.8 55.6 74 59.2 74 64.6 C 74 71.4 68.5 76 61 76 L 50.5 76 C 48.5 76 47 74.5 47 72.5 L 47 40.5 Z M 53.8 42.5 L 53.8 52.5 L 60.5 52.5 C 64.2 52.5 66.8 50.4 66.8 47.5 C 66.8 44.6 64.2 42.5 60.5 42.5 L 53.8 42.5 Z M 53.8 58 L 53.8 70.5 L 60.8 70.5 C 65.2 70.5 68 68.2 68 64.2 C 68 60.2 65.2 58 60.8 58 L 53.8 58 Z"
          fill="url(#cbOrangeGradient)"
        />
      </g>
    </svg>
  );
};

/**
 * Full Official 3D Badge Lockup - reproducing the complete Navy/Metallic Badge
 */
export const CapitaBeeFullLockupSvg: React.FC<{ width?: number | string; height?: number | string; className?: string }> = ({
  width = 300,
  height = 300,
  className = '',
}) => {
  return (
    <svg
      viewBox="0 0 400 400"
      width={width}
      height={height}
      className={`select-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Capita Bee Financial Services Official Brand Logo"
    >
      <defs>
        {/* Navy Canvas Gradient */}
        <radialGradient id="cbCardBg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#0F1F3D" />
          <stop offset="45%" stopColor="#0A1428" />
          <stop offset="100%" stopColor="#040812" />
        </radialGradient>

        {/* Ambient Top Light Flare */}
        <radialGradient id="cbLightGlow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
          <stop offset="40%" stopColor="#0284C7" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
        </radialGradient>

        {/* Silver Metallic Gradient for House & Text */}
        <linearGradient id="cbSilverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#F8FAFC" />
          <stop offset="60%" stopColor="#CBD5E1" />
          <stop offset="90%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Text 3D Chrome Bevel */}
        <linearGradient id="cbTextChrome" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#E2E8F0" />
          <stop offset="75%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* Blue Crescent Gradient */}
        <linearGradient id="cbBlueGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>

        {/* Orange 'B' Gradient */}
        <linearGradient id="cbOrangeGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>

        {/* Card Border Stroke */}
        <linearGradient id="cbBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Deep Drop Shadow */}
        <filter id="cbFullShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.6" />
        </filter>

        <filter id="cbTextShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Card Background */}
      <rect width="400" height="400" rx="32" fill="url(#cbCardBg)" stroke="url(#cbBorderGrad)" strokeWidth="2" />
      
      {/* Ambient Blue Back-Glow */}
      <circle cx="200" cy="170" r="160" fill="url(#cbLightGlow)" />

      {/* Emblem Scaled and Centered */}
      <g transform="translate(110, 48) scale(1.8)" filter="url(#cbFullShadow)">
        {/* Right Chimney */}
        <path
          d="M 66 31 L 66 17 C 66 14.8 67.8 13 70 13 L 73 13 C 75.2 13 77 14.8 77 17 L 77 39"
          stroke="url(#cbSilverGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Outer Gable Roof + Right Wall */}
        <path
          d="M 16 48 L 50 16 L 84 48 L 84 76"
          stroke="url(#cbSilverGrad)"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Inner Gable Roof + Inner Right Wall */}
        <path
          d="M 23 48 L 50 22.5 L 77 48 L 77 76"
          stroke="url(#cbSilverGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
        />

        {/* Blue Crescent 'C' */}
        <path
          d="M 48 37 C 36 37 27 46 27 57.5 C 27 69 36 78 48 78 C 41 74 36.5 66 36.5 57.5 C 36.5 49 41 41 48 37 Z"
          fill="url(#cbBlueGradFull)"
        />

        {/* Orange 'B' */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 47 40.5 C 47 38.5 48.5 37 50.5 37 L 61 37 C 67.8 37 72.5 40.8 72.5 46.2 C 72.5 50.2 69.5 53.2 65 54.4 C 70.8 55.6 74 59.2 74 64.6 C 74 71.4 68.5 76 61 76 L 50.5 76 C 48.5 76 47 74.5 47 72.5 L 47 40.5 Z M 53.8 42.5 L 53.8 52.5 L 60.5 52.5 C 64.2 52.5 66.8 50.4 66.8 47.5 C 66.8 44.6 64.2 42.5 60.5 42.5 L 53.8 42.5 Z M 53.8 58 L 53.8 70.5 L 60.8 70.5 C 65.2 70.5 68 68.2 68 64.2 C 68 60.2 65.2 58 60.8 58 L 53.8 58 Z"
          fill="url(#cbOrangeGradFull)"
        />
      </g>

      {/* Main Brand Title: "CAPITA BEE" with Metallic Chrome Bevel */}
      <g filter="url(#cbTextShadow)">
        <text
          x="200"
          y="280"
          textAnchor="middle"
          fill="url(#cbTextChrome)"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="35"
          letterSpacing="0.14em"
        >
          CAPITA BEE
        </text>
      </g>

      {/* Subtitle Tagline: "—— FINANCIAL SERVICES ——" */}
      <g transform="translate(0, 310)">
        {/* Left Orange Rule */}
        <line x1="45" y1="0" x2="105" y2="0" stroke="#EA580C" strokeWidth="2.2" strokeLinecap="round" />
        
        {/* Center Orange Text */}
        <text
          x="200"
          y="4.5"
          textAnchor="middle"
          fill="#FB923C"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontWeight="700"
          fontSize="13.5"
          letterSpacing="0.28em"
        >
          FINANCIAL SERVICES
        </text>

        {/* Right Orange Rule */}
        <line x1="295" y1="0" x2="355" y2="0" stroke="#EA580C" strokeWidth="2.2" strokeLinecap="round" />
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
    xs: { box: 28, svg: 22, text: 'text-xs', sub: 'text-[7.5px]', full: 'w-24', lockup: 100 },
    sm: { box: 36, svg: 28, text: 'text-sm', sub: 'text-[8.5px]', full: 'w-32', lockup: 140 },
    md: { box: 44, svg: 34, text: 'text-base', sub: 'text-[9.5px]', full: 'w-44', lockup: 180 },
    lg: { box: 56, svg: 44, text: 'text-xl', sub: 'text-[11px]', full: 'w-56', lockup: 240 },
    xl: { box: 72, svg: 58, text: 'text-2xl', sub: 'text-xs', full: 'w-72', lockup: 300 },
    '2xl': { box: 96, svg: 78, text: 'text-3xl', sub: 'text-sm', full: 'w-88', lockup: 380 },
  };

  const dim = dimensionMap[size];

  // 1. Full 3D Lockup Vector (Exact Official Badge)
  if (variant === 'full') {
    return (
      <div
        id="capita-bee-full-badge"
        onClick={onClick}
        className={`inline-flex items-center justify-center transition-transform hover:scale-[1.01] ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <CapitaBeeFullLockupSvg width={dim.lockup} height={dim.lockup} />
      </div>
    );
  }

  // 2. Badge Variant (Official Dark Navy Rounded Card with Vector or Raster Asset)
  if (variant === 'badge') {
    return (
      <div
        id="capita-bee-badge"
        onClick={onClick}
        className={`relative inline-flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0A1224] border border-[#1E293B] shadow-xl select-none group transition-transform hover:scale-[1.01] ${
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
          <CapitaBeeFullLockupSvg width={dim.lockup} height={dim.lockup} />
        )}
      </div>
    );
  }

  // 3. Mark-Only Variant
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

  // 4. Image-Only Variant
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

  // 5. Default Inline Variant (Emblem tile on left + typography on right)
  const isDarkText = theme === 'light' || (theme === 'auto' && true);

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
              theme === 'dark' ? 'text-white' : 'text-[#121212]'
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

