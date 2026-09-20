interface TopBarProps {
  showCommandBar: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

const COMMANDS = ['Show Chart', 'Refresh', 'Visualize this view', 'Email a Link', 'Flow', 'Run Report', 'Excel Templates'];

export function TopBar({ showCommandBar, onRefresh, refreshing }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-title" />
      {showCommandBar && (
        <div className="topbar-commands">
          {COMMANDS.map((cmd) => (
            <button
              key={cmd}
              className="topbar-command"
              onClick={cmd === 'Refresh' ? onRefresh : undefined}
              disabled={cmd === 'Refresh' && refreshing}
            >
              {cmd === 'Refresh' && refreshing ? 'Refreshing…' : cmd}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
