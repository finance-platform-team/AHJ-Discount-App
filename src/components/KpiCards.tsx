import { cx } from '../lib/classNames';

interface KpiCardsProps {
  total: number;
  outOfYourAuthority: number;
  approved: number;
  rejected: number;
}

export function KpiCards({ total, outOfYourAuthority, approved, rejected }: KpiCardsProps) {
  const cards = [
    { label: 'Total Requests', value: total, caption: 'from DotCare today' },
    {
      label: 'Out of Your Authority',
      value: outOfYourAuthority,
      caption: outOfYourAuthority > 0 ? 'need your review — exceed your limit' : 'nothing exceeds your limit',
      // The one number on this screen that asks the viewer to act, so it is the only one that stands out.
      alert: outOfYourAuthority > 0,
    },
    { label: 'Approved', value: approved, caption: 'approved by default' },
    { label: 'Rejected', value: rejected, caption: 'rejected with justification' },
  ];

  return (
    <div className="kpi-row">
      {cards.map((card) => (
        <div className={cx('kpi-card', card.alert && 'kpi-card-alert')} key={card.label}>
          <div className="kpi-label">{card.label}</div>
          <div className="kpi-value">{card.value}</div>
          <div className="kpi-caption">{card.caption}</div>
        </div>
      ))}
    </div>
  );
}
