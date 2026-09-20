interface BadgeProps {
  /** Clinical/workflow status tones from the HMIS design system (§3.6) */
  tone: 'success' | 'urgent' | 'error' | 'pending' | 'awaiting';
  icon?: string;
  children: React.ReactNode;
}

export function Badge({ tone, icon, children }: BadgeProps) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon && <span className="badge-icon">{icon}</span>}
      {children}
    </span>
  );
}
