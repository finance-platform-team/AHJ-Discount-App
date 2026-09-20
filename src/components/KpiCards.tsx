interface KpiCardsProps {
  total: number;
  outOfYourAuthority: number;
  approved: number;
  rejected: number;
}

export function KpiCards({ total, outOfYourAuthority, approved, rejected }: KpiCardsProps) {
  const cards = [
    { label: 'TOTAL REQUESTS', value: total, caption: 'from DotCare today' },
    { label: 'OUT OF YOUR AUTHORITY', value: outOfYourAuthority, caption: 'exceeds authorized-by limit' },
    { label: 'APPROVED', value: approved, caption: 'approved by default' },
    { label: 'REJECTED', value: rejected, caption: 'rejected with justification' },
  ];

  return (
    <div className="kpi-row">
      {cards.map((card) => (
        <div className="kpi-card" key={card.label}>
          <div className="kpi-label">{card.label}</div>
          <div className="kpi-value">{card.value}</div>
          <div className="kpi-caption">{card.caption}</div>
        </div>
      ))}
    </div>
  );
}
