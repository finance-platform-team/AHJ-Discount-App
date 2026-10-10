import { useEffect, useState, type ReactNode } from 'react';
import { ListChecksIcon, LockKeyIcon, ScalesIcon, SealPercentIcon, TableIcon } from '@phosphor-icons/react';
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
    <div className="gate" role="status" aria-live="polite">
      <div className="gate-card">
        <span className="gate-mark gate-mark-pulse" aria-hidden="true">
          <SealPercentIcon weight="fill" />
        </span>
        <div className="gate-title">{APP_NAME}</div>
        <div className="gate-text">Checking your access</div>
        <div className="gate-progress" aria-hidden="true" />
      </div>
    </div>
  );
}

function NoAccessScreen({ userName }: { userName?: string }) {
  return (
    <div className="gate">
      <div className="gate-card">
        <span className="gate-mark gate-mark-locked" aria-hidden="true">
          <LockKeyIcon weight="bold" />
        </span>
        <h1 className="gate-title">You don't have access to this system</h1>
        <p className="gate-text">
          {userName ? `${userName}, your` : 'Your'} account has no {APP_NAME} security role. Contact the system
          administrator to request access.
        </p>
      </div>
    </div>
  );
}

const SCREEN_META: Record<ScreenKey, { breadcrumb: string[]; title: string; icon: ReactNode; description: string }> = {
  requests: {
    breadcrumb: [APP_NAME, 'Requests'],
    title: 'Discounts Authorization',
    icon: <ScalesIcon weight="bold" />,
    description: 'Discount requests entered in DotCare, classified against the AHJ Discount Policy.',
  },
  transactions: {
    breadcrumb: [APP_NAME, 'Workflow'],
    title: 'Approval Cycle Transactions',
    icon: <ListChecksIcon weight="bold" />,
    description: 'Every accept or reject decision on the requests you entered, with violation flags and comments.',
  },
  matrices: {
    breadcrumb: [APP_NAME, 'Reference'],
    title: 'Discount Limit Matrices',
    icon: <TableIcon weight="bold" />,
    description: 'AHJ Discount Policy, transcribed from the source policy document.',
  },
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
        userName={currentUser?.fullName ?? 'Signed-in User'}
      />
      <main className="app-content" key={screen}>
        <TopBar
          breadcrumb={meta.breadcrumb}
          title={meta.title}
          titleIcon={meta.icon}
          description={meta.description}
          theme={theme}
          onThemeChange={setTheme}
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
      </main>
    </div>
  );
}

export default App;
