import { useEffect, useState } from 'react';
import { Sidebar, type ScreenKey } from './components/Sidebar';
import { TopBar, type Theme } from './components/TopBar';
import { RequestApprovalsScreen } from './screens/RequestApprovalsScreen';
import { DiscountMatricesScreen } from './screens/DiscountMatricesScreen';
import { ApprovalCycleScreen } from './screens/ApprovalCycleScreen';
import { useCurrentUser } from './lib/currentUser';
import { hasAppAccess } from './lib/accessScope';
import { canUseDevDataActions } from './lib/devAccess';
import { isMockMode } from './lib/devMockRows';
import './styles.css';

const APP_NAME = 'AHJ Discount Approval';

function AppLoadingScreen() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading-card">
        <div className="app-loading-spinner" aria-hidden="true" />
        <div className="app-loading-title">{APP_NAME}</div>
        <div className="app-loading-text">Checking your access…</div>
      </div>
    </div>
  );
}

function NoAccessScreen({ userName }: { userName?: string }) {
  return (
    <div className="no-access">
      <div className="no-access-card">
        <h1>You don't have access to this system</h1>
        <p>
          {userName ? `${userName}, your` : 'Your'} account has no {APP_NAME} security role. Contact the system
          administrator to request access.
        </p>
      </div>
    </div>
  );
}

const SCREEN_META: Record<ScreenKey, { breadcrumb: string[]; title: string }> = {
  requests: { breadcrumb: [APP_NAME, 'Requests'], title: 'Discounts Authorization' },
  transactions: { breadcrumb: [APP_NAME, 'Workflow'], title: 'Approval Cycle Transactions' },
  matrices: { breadcrumb: [APP_NAME, 'Reference'], title: 'Discount Limit Matrices' },
};

function App() {
  const [screen, setScreen] = useState<ScreenKey>('requests');
  const [outOfAuthorityCount, setOutOfAuthorityCount] = useState(0);
  const [decisionCount, setDecisionCount] = useState(0);
  const [theme, setTheme] = useState<Theme>('light');
  // Resolved once here and shared, so the signed-in user and their roles are only fetched once.
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const meta = SCREEN_META[screen];

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
  }, [theme]);

  // Nothing — not even the sidebar or the matrix screen — renders until the role check finishes,
  // and a user without an app role never gets past the no-access screen.
  if (!isMockMode()) {
    if (userLoading) return <AppLoadingScreen />;
    if (!hasAppAccess(currentUser)) return <NoAccessScreen userName={currentUser?.fullName} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={screen}
        onNavigate={setScreen}
        outOfAuthorityCount={outOfAuthorityCount}
        decisionCount={decisionCount}
      />
      <div className="app-content">
        <TopBar
          breadcrumb={meta.breadcrumb}
          title={meta.title}
          theme={theme}
          onThemeChange={setTheme}
          userName={currentUser?.fullName ?? 'Signed-in User'}
          userSubtitle={APP_NAME}
        />
        {screen === 'requests' && (
          <RequestApprovalsScreen
            currentUser={currentUser}
            userLoading={userLoading}
            onOutOfAuthorityCountChange={setOutOfAuthorityCount}
          />
        )}
        {screen === 'transactions' && (
          <ApprovalCycleScreen
            currentUser={currentUser}
            userLoading={userLoading}
            onDecisionCountChange={setDecisionCount}
          />
        )}
        {screen === 'matrices' && <DiscountMatricesScreen canManageData={canUseDevDataActions(currentUser)} />}
      </div>
    </div>
  );
}

export default App;
