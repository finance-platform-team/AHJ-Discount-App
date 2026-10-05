import type { ReactNode } from 'react';
import { cx } from '../lib/classNames';

export type Theme = 'light' | 'dark';

interface TopBarProps {
  breadcrumb: string[];
  title: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  userName: string;
  userSubtitle: string;
}

/** First two initials of a name ("Ahmed Ali Hassan" → "AA"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

const SVG_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const THEME_OPTIONS: { theme: Theme; label: string; icon: ReactNode }[] = [
  {
    theme: 'light',
    label: 'Light mode',
    icon: (
      <svg {...SVG_PROPS} strokeLinejoin={undefined}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    theme: 'dark',
    label: 'Dark mode',
    icon: (
      <svg {...SVG_PROPS}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
];

export function TopBar({ breadcrumb, title, theme, onThemeChange, userName, userSubtitle }: TopBarProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="app-header-breadcrumb">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb} className="app-header-breadcrumb-item">
              {crumb}
              {i < breadcrumb.length - 1 && <span className="app-header-breadcrumb-sep">›</span>}
            </span>
          ))}
        </div>
        <h1 className="app-header-title">{title}</h1>
      </div>

      <div className="app-header-right">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.theme}
            type="button"
            className={cx('app-header-icon-btn', theme === option.theme && 'active')}
            aria-label={option.label}
            aria-pressed={theme === option.theme}
            onClick={() => onThemeChange(option.theme)}
          >
            {option.icon}
          </button>
        ))}
        <button type="button" className="app-header-icon-btn" aria-label="Search">
          <svg {...SVG_PROPS}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </button>

        <div className="app-header-user">
          <div className="app-header-avatar">{initials(userName)}</div>
          <div className="app-header-user-text">
            <div className="app-header-user-name">{userName}</div>
            <div className="app-header-user-subtitle">{userSubtitle}</div>
          </div>
          <svg {...SVG_PROPS} className="app-header-user-chevron" width={14} height={14}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </header>
  );
}
