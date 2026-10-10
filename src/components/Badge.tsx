import type { ReactNode } from 'react';

interface BadgeProps {
  /** Workflow status tones */
  tone: 'success' | 'urgent' | 'error' | 'pending' | 'awaiting';
  icon?: ReactNode;
  children: ReactNode;
}

export function Badge({ tone, icon, children }: BadgeProps) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon && <span className="badge-icon">{icon}</span>}
      {children}
    </span>
  );
}
