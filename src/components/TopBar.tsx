import type { ReactNode } from 'react';
import { CaretRightIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { cx } from '../lib/classNames';

export type Theme = 'light' | 'dark';

interface TopBarProps {
  breadcrumb: string[];
  title: string;
  /** Shown as a chip after the first word of the title. */
  titleIcon: ReactNode;
  description: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const THEME_OPTIONS: { theme: Theme; label: string; icon: ReactNode }[] = [
  { theme: 'light', label: 'Light mode', icon: <SunIcon /> },
  { theme: 'dark', label: 'Dark mode', icon: <MoonIcon /> },
];

export function TopBar({ breadcrumb, title, titleIcon, description, theme, onThemeChange }: TopBarProps) {
  const [firstWord, ...rest] = title.split(' ');
  return (
    <header className="app-header">
      <div className="app-header-left">
        <nav className="app-header-breadcrumb" aria-label="Breadcrumb">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb} className="app-header-breadcrumb-item">
              {crumb}
              {i < breadcrumb.length - 1 && <CaretRightIcon className="app-header-breadcrumb-sep" aria-hidden="true" />}
            </span>
          ))}
        </nav>
        <h1 className="app-header-title">
          {firstWord}
          <span className="app-header-title-chip" aria-hidden="true">
            {titleIcon}
          </span>
          {rest.join(' ')}
        </h1>
        <p className="app-header-description">{description}</p>
      </div>

      <div className="app-header-right">
        <div className="theme-switch" role="group" aria-label="Color theme">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.theme}
              type="button"
              className={cx('theme-switch-btn', theme === option.theme && 'active')}
              aria-label={option.label}
              aria-pressed={theme === option.theme}
              onClick={() => onThemeChange(option.theme)}
            >
              {option.icon}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
