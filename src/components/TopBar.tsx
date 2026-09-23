interface TopBarProps {
  breadcrumb: string[];
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  userName: string;
  userSubtitle: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function TopBar({ breadcrumb, title, theme, onToggleTheme, userName, userSubtitle }: TopBarProps) {
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
        <button
          type="button"
          className={`app-header-icon-btn ${theme === 'light' ? 'active' : ''}`}
          aria-label="Light mode"
          aria-pressed={theme === 'light'}
          onClick={() => theme !== 'light' && onToggleTheme()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </button>
        <button
          type="button"
          className={`app-header-icon-btn ${theme === 'dark' ? 'active' : ''}`}
          aria-label="Dark mode"
          aria-pressed={theme === 'dark'}
          onClick={() => theme !== 'dark' && onToggleTheme()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>
        <button type="button" className="app-header-icon-btn" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <svg className="app-header-user-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </header>
  );
}
