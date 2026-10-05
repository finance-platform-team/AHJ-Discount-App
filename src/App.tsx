import { useEffect, useState } from 'react';
import { Sidebar, type ScreenKey } from './components/Sidebar';
import { TopBar, type Theme } from './components/TopBar';
import { RequestApprovalsScreen } from './screens/RequestApprovalsScreen';
import { DiscountMatricesScreen } from './screens/DiscountMatricesScreen';
import { ApprovalCycleScreen } from './screens/ApprovalCycleScreen';
import { useCurrentUser } from './lib/currentUser';
import './styles.css';

const APP_NAME = 'AHJ Discount Approval';

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
        {screen === 'matrices' && <DiscountMatricesScreen />}
      </div>
    </div>
  );
}

export default App;
