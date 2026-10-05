export type ScreenKey = 'requests' | 'transactions' | 'matrices';

interface SidebarProps {
  active: ScreenKey;
  onNavigate: (screen: ScreenKey) => void;
  outOfAuthorityCount: number;
  decisionCount: number;
}

export function Sidebar({ active, onNavigate, outOfAuthorityCount, decisionCount }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">Discount Authority Approval</div>
        <div className="sidebar-brand-subtitle">Finance Group AHQ · DotCare Integration</div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-heading">WORKFLOW</div>
        <button
          className={`sidebar-link ${active === 'requests' ? 'active' : ''}`}
          onClick={() => onNavigate('requests')}
        >
          <span>Request Approvals</span>
          {outOfAuthorityCount > 0 && <span className="sidebar-badge sidebar-badge-red">{outOfAuthorityCount}</span>}
        </button>
        <button
          className={`sidebar-link ${active === 'transactions' ? 'active' : ''}`}
          onClick={() => onNavigate('transactions')}
          title="Approval Cycle Transactions"
        >
          <span>Approval Cycle Trans...</span>
          <span className="sidebar-badge sidebar-badge-grey">{decisionCount}</span>
        </button>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-heading">REFERENCE</div>
        <button
          className={`sidebar-link ${active === 'matrices' ? 'active' : ''}`}
          onClick={() => onNavigate('matrices')}
        >
          <span>Discount Limit Matrices</span>
        </button>
      </div>
    </aside>
  );
}
