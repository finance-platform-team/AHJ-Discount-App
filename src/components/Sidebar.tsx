import type { ReactNode } from 'react';
import { ListChecksIcon, ScalesIcon, SealPercentIcon, TableIcon } from '@phosphor-icons/react';
import { cx } from '../lib/classNames';

export type ScreenKey = 'requests' | 'transactions' | 'matrices';

interface SidebarProps {
  active: ScreenKey;
  onNavigate: (screen: ScreenKey) => void;
  outOfAuthorityCount: number;
  decisionCount: number;
  userName: string;
}

interface NavItem {
  key: ScreenKey;
  label: string;
  icon: ReactNode;
  badge?: { count: number; alert?: boolean };
}

/** First two initials of a name ("Ahmed Ali Hassan" → "AA"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Sidebar({ active, onNavigate, outOfAuthorityCount, decisionCount, userName }: SidebarProps) {
  const groups: { heading: string; items: NavItem[] }[] = [
    {
      heading: 'Workflow',
      items: [
        {
          key: 'requests',
          label: 'Request Approvals',
          icon: <ScalesIcon />,
          badge: outOfAuthorityCount > 0 ? { count: outOfAuthorityCount, alert: true } : undefined,
        },
        { key: 'transactions', label: 'Approval Cycle', icon: <ListChecksIcon />, badge: { count: decisionCount } },
      ],
    },
    {
      heading: 'Reference',
      items: [{ key: 'matrices', label: 'Limit Matrices', icon: <TableIcon /> }],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-mark" aria-hidden="true">
          <SealPercentIcon weight="fill" />
        </span>
        <span className="sidebar-brand-text">
          <span className="sidebar-brand-name">AHJ Discounts</span>
          <span className="sidebar-brand-subtitle">Authority Approval</span>
        </span>
      </div>

      <nav className="sidebar-nav" aria-label="Screens">
        {groups.map((group) => (
          <div key={group.heading} className="sidebar-section">
            <div className="sidebar-heading">{group.heading}</div>
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={cx('sidebar-link', active === item.key && 'active')}
                aria-current={active === item.key ? 'page' : undefined}
                title={item.label}
                onClick={() => onNavigate(item.key)}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
                {item.badge && (
                  <span className={cx('sidebar-badge', item.badge.alert && 'sidebar-badge-alert')}>
                    {item.badge.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-user" title={userName}>
        <span className="sidebar-avatar">{initials(userName)}</span>
        <span className="sidebar-user-text">
          <span className="sidebar-user-name">{userName}</span>
          <span className="sidebar-user-role">Signed in</span>
        </span>
      </div>
    </aside>
  );
}
