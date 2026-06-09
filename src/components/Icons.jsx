import React from 'react';

const iconPaths = {
  chevron: (sw) => <path d="m9 18 6-6-6-6" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />,
  folder: (sw) => <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />,
  'folder-open': (sw) => (
    <>
      <path d="M2 18V6a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 10h20" strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  file: (sw) => (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  min: (sw) => <path d="M5 12h14" strokeWidth={sw} strokeLinecap="round" />,
  max: (sw) => <rect width="14" height="14" x="5" y="5" rx="2" strokeWidth={sw} />,
  x: (sw) => <path d="M18 6 6 18M6 6l12 12" strokeWidth={sw} strokeLinecap="round" />,
  git: (sw) => (
    <>
      <circle cx="18" cy="18" r="3" strokeWidth={sw} />
      <circle cx="6" cy="6" r="3" strokeWidth={sw} />
      <circle cx="6" cy="18" r="3" strokeWidth={sw} />
      <path d="M6 9v6M9 6h6a3 3 0 0 1 3 3v6" strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  swap: (sw) => (
    <>
      <path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  search: (sw) => (
    <>
      <circle cx="11" cy="11" r="8" strokeWidth={sw} />
      <path d="m21 21-4.3-4.3" strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  plus: (sw) => <path d="M5 12h14M12 5v14" strokeWidth={sw} strokeLinecap="round" />,
  refresh: (sw) => (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" strokeWidth={sw} strokeLinecap="round" />
      <path d="M21 3v5h-5" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeWidth={sw} strokeLinecap="round" />
      <path d="M3 21v-5h5" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  terminal: (sw) => (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" strokeWidth={sw} />
      <path d="m7 8 3 2-3 2M12 12h4" strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  eye: (sw) => (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeWidth={sw} />
    </>
  ),
  pencil: (sw) => (
    <>
      <path d="M12 20h9" strokeWidth={sw} strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  bolt: (sw) => <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />,
  check: (sw) => <path d="M20 6 9 17l-5-5" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />,
  layers: (sw) => (
    <>
      <path d="m12 3-10 5 10 5 10-5-10-5Z" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="m2 17 10 5 10-5" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="m2 12l10 5 10-5" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sparkle: (sw) => (
    <path
      d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  send: (sw) => (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2 11 13" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  settings: (sw) => (
    <>
      <circle cx="12" cy="12" r="3" strokeWidth={sw} />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

export function Icon({ name, size = 16, sw = 1.8, style, className }) {
  const draw = iconPaths[name];
  if (!draw) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      style={style}
      className={className}
    >
      {draw(sw)}
    </svg>
  );
}

export default Icon;
