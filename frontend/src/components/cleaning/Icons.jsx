/**
 * SVG Icons for KKM Data Cleaning Tool
 * Clean, professional iconography
 */
import React from 'react';

export const IconUpload = ({ size = 48, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="6" y="6" width="36" height="36" rx="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
    <path d="M24 32V16M24 16l-6 6M24 16l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 36h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconFile = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 2v4h4M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconCheck = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconDownload = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconPlay = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M6 4l10 6-10 6V4z" fill="currentColor" />
  </svg>
);

export const IconArrowRight = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconArrowLeft = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M16 10H4M8 6l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconRefresh = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M3 10a7 7 0 0112.9-3.8M17 10a7 7 0 01-12.9 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 3v4h-4M4 17v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconChart = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="2" y="10" width="3" height="8" rx="1" fill="currentColor" opacity="0.6" />
    <rect x="7" y="6" width="3" height="12" rx="1" fill="currentColor" opacity="0.8" />
    <rect x="12" y="2" width="3" height="16" rx="1" fill="currentColor" />
    <circle cx="3.5" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8.5" cy="4" r="1.5" fill="currentColor" />
    <circle cx="13.5" cy="1" r="1" fill="currentColor" />
  </svg>
);

export const IconTable = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2 7h16M2 12h16M7 7v11M12 7v11" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const IconRules = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M3 5h14M3 10h14M3 15h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="16" cy="15" r="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const IconFormula = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <text x="2" y="14" fontFamily="serif" fontSize="14" fontStyle="italic" fill="currentColor">Z</text>
    <path d="M10 6h7M10 10h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9 14l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconWarning = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M10 2l8 14H2L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M10 8v3M10 13v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconError = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconSuccess = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconInfo = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 9v5M10 6v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconGender = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="7" cy="11" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 8l3-3M13 5h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 15v3M5.5 16.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconWeight = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 18h12l-2-7H6l-2 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const IconHeight = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M10 2v16M7 5l3-3 3 3M7 15l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10h3M12 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconCalendar = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2 8h16M6 2v4M14 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="6" cy="12" r="1" fill="currentColor" />
    <circle cx="10" cy="12" r="1" fill="currentColor" />
    <circle cx="14" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const IconExcel = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 7l4 6M10 7l-4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M13 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconCsv = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 10h8M6 7h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconSpinner = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={`animate-spin ${className}`}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" opacity="0.2" />
    <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconLogo = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="8" fill="#0891b2" />
    <rect x="6" y="18" width="4" height="8" rx="1" fill="white" opacity="0.9" />
    <rect x="12" y="12" width="4" height="14" rx="1" fill="white" />
    <rect x="18" y="8" width="4" height="18" rx="1" fill="white" opacity="0.9" />
    <circle cx="8" cy="15" r="2" fill="white" opacity="0.7" />
    <circle cx="14" cy="9" r="2" fill="white" opacity="0.7" />
    <circle cx="20" cy="5" r="1.5" fill="white" opacity="0.7" />
  </svg>
);

export const IconDatabase = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <ellipse cx="10" cy="5" rx="7" ry="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 5v10c0 1.66 3.13 3 7 3s7-1.34 7-3V5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 10c0 1.66 3.13 3 7 3s7-1.34 7-3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const IconFilter = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M2 4h16M4 9h12M7 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconExpand = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconUser = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 18c0-3.31 3.13-6 7-6s7 2.69 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconId = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="7" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 14c0-1.1.9-2 2-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 8h4M12 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconScale = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M10 2v16M3 6l7-4 7 4M3 6v2c0 1.1.9 2 2 2h3M17 6v2c0 1.1-.9 2-2 2h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="6" y="14" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const IconRuler = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
    <rect x="2" y="7" width="16" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 7v2M8 7v3M11 7v2M14 7v3M17 7v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
