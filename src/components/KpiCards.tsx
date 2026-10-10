import { CheckCircleIcon, ShieldWarningIcon, StackIcon, XCircleIcon } from '@phosphor-icons/react';
import { StatCards } from './StatCards';

interface KpiCardsProps {
  total: number;
  outOfYourAuthority: number;
  approved: number;
  rejected: number;
}

export function KpiCards({ total, outOfYourAuthority, approved, rejected }: KpiCardsProps) {
  return (
    <StatCards
      cards={[
        { label: 'Total Requests', value: total, caption: 'Received from DotCare', icon: <StackIcon />, tone: 'dark' },
        {
          label: 'Out of Your Authority',
          value: outOfYourAuthority,
          of: total,
          caption: outOfYourAuthority > 0 ? 'Exceed your limit and need your review' : 'Nothing exceeds your limit',
          icon: <ShieldWarningIcon />,
          // The one number on this screen that asks the viewer to act, so it is the only one that stands out.
          tone: outOfYourAuthority > 0 ? 'accent' : 'plain',
        },
        { label: 'Approved', value: approved, of: total, caption: 'Approved by default', icon: <CheckCircleIcon /> },
        { label: 'Rejected', value: rejected, of: total, caption: 'Rejected with justification', icon: <XCircleIcon /> },
      ]}
    />
  );
}
