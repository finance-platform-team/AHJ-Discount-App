import { useEffect, useState } from 'react';
import { Sidebar, type ScreenKey } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { RequestApprovalsScreen } from './screens/RequestApprovalsScreen';
import { DiscountMatricesScreen } from './screens/DiscountMatricesScreen';
import { useCurrentUser } from './lib/currentUser';
import './styles.css';

const SCREEN_META: Record<ScreenKey, { breadcrumb: string[]; title: string }> = {
  requests: { breadcrumb: ['AHJ Discount Approval', 'Requests'], title: 'Discounts Authorization' },
  matrices: { breadcrumb: ['AHJ Discount Approval', 'Reference'], title: 'Discount Limit Matrices' },
};

function App() {
  const [screen, setScreen] = useState<ScreenKey>('requests');
  const [outOfAuthorityCount, setOutOfAuthorityCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { user: currentUser } = useCurrentUser();
  const meta = SCREEN_META[screen];

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
  }, [theme]);

  return (
    <div className="app-shell">
      <Sidebar active={screen} onNavigate={setScreen} outOfAuthorityCount={outOfAuthorityCount} />
      <div className="app-content">
        <TopBar
          breadcrumb={meta.breadcrumb}
          title={meta.title}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          userName={currentUser?.fullName ?? 'Signed-in User'}
          userSubtitle="AHJ Discount Approval"
        />
        {screen === 'requests' ? (
          <RequestApprovalsScreen onOutOfAuthorityCountChange={setOutOfAuthorityCount} />
        ) : (
          <DiscountMatricesScreen />
        )}
      </div>
    </div>
  );
}

export default App;
