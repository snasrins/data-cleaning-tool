import React from 'react';

export const IconUpload = () => (
  <svg viewBox="0 0 44 44" fill="none" className="drop-icon-svg">
    <rect x="6" y="6" width="32" height="32" rx="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
    <path d="M22 28V16M22 16l-5 5M22 16l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 32h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconPlay = () => (
  <svg viewBox="0 0 15 15" fill="none"><path d="M5 3l7 4.5L5 12V3z" fill="currentColor" /></svg>
);

export const IconValidate = () => (
  <svg viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M7.5 4.5v4M7.5 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const IconDownload = () => (
  <svg viewBox="0 0 15 15" fill="none">
    <path d="M7.5 2v8M4 7l3.5 3.5L11 7M2 12h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconLogo = () => (
  <svg className="logo-icon" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#111520" />
    <rect x="6" y="20" width="4" height="6" rx="1" fill="#4f8ef7" />
    <rect x="12" y="14" width="4" height="12" rx="1" fill="#38d9c0" />
    <rect x="18" y="9" width="4" height="17" rx="1" fill="#4f8ef7" opacity="0.7" />
    <rect x="24" y="16" width="2" height="10" rx="1" fill="#38d9c0" opacity="0.5" />
    <circle cx="8" cy="18" r="2" fill="#38d9c0" />
    <circle cx="14" cy="12" r="2" fill="#4f8ef7" />
    <circle cx="20" cy="7" r="2" fill="#38d9c0" />
  </svg>
);

export const IconCleanedDownload = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--success)" strokeWidth="1.3" />
    <path d="M8 5v5M5.5 8l2.5 2.5 2.5-2.5" stroke="var(--success)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
