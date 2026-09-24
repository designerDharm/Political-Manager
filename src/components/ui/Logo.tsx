import React from 'react';
import Image from 'next/image';

export interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'icon-white' | 'logo-white';
  showSubtitle?: boolean;
  width?: number;
  height?: number;
}

export function Logo({
  className = '',
  variant = 'dark',
  showSubtitle = true,
  width,
  height,
}: LogoProps) {
  // If explicitly requesting the icon white symbol (square mark):
  if (variant === 'icon-white') {
    return (
      <div className={`relative flex items-center justify-center flex-shrink-0 ${className}`}>
        <Image
          src="/icon-white.png"
          alt="CampaignOps AI Icon"
          width={width || 32}
          height={height || 32}
          className="object-contain"
          priority
        />
      </div>
    );
  }

  // If requesting the full white logo asset (transparent white typography + emblem for dark navy headers):
  if (variant === 'light' || variant === 'logo-white') {
    return (
      <div className={`relative flex items-center ${className}`}>
        <Image
          src="/logo-white.png"
          alt="CampaignOps AI"
          width={width || 160}
          height={height || 54}
          className="object-contain max-h-10 w-auto"
          priority
        />
      </div>
    );
  }

  // Default 'dark' variant for light backgrounds: full dark/color logo asset
  return (
    <div className={`relative flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="CampaignOps AI"
        width={width || 160}
        height={height || 54}
        className="object-contain max-h-10 w-auto"
        priority
      />
    </div>
  );
}
