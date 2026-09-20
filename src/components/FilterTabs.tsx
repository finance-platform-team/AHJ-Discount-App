export type FilterKey = 'all' | 'outOfAuthority' | 'withinAuthority' | 'approved' | 'rejected';

interface FilterTabsProps {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
  counts: Record<FilterKey, number>;
  keyword: string;
  onKeywordChange: (value: string) => void;
}

const TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'outOfAuthority', label: 'Out of Your Authority' },
  { key: 'withinAuthority', label: 'Within Authority' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export function FilterTabs({ active, onChange, counts, keyword, onKeywordChange }: FilterTabsProps) {
  return (
    <div className="filter-row">
      <div className="filter-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`filter-tab ${active === tab.key ? 'active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            <span className="filter-count">{counts[tab.key]}</span>
          </button>
        ))}
      </div>
      <div className="filter-actions">
        <input
          className="filter-search"
          placeholder="Filter by keyword"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
        <button className="filter-btn">Edit columns</button>
        <button className="filter-btn">Edit filters</button>
      </div>
    </div>
  );
}
