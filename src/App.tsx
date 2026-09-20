import { useState } from 'react';
import { Sidebar, type ScreenKey } from './components/Sidebar';
import { RequestApprovalsScreen } from './screens/RequestApprovalsScreen';
import { DiscountMatricesScreen } from './screens/DiscountMatricesScreen';
import './styles.css';

function App() {
  const [screen, setScreen] = useState<ScreenKey>('requests');
  const [outOfAuthorityCount, setOutOfAuthorityCount] = useState(0);

  return (
    <div className="app-shell">
      <Sidebar active={screen} onNavigate={setScreen} outOfAuthorityCount={outOfAuthorityCount} />
      <div className="app-content">
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
