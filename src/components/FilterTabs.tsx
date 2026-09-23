import type {
  Dis_discountrequestsdis_servicecategory,
  Dis_discountrequestsdis_servicelevel,
} from '../generated/models/Dis_discountrequestsModel';
import { SERVICE_CATEGORY, SERVICE_LEVEL } from '../lib/optionSets';

export type FilterKey = 'all' | 'outOfAuthority' | 'withinAuthority' | 'approved' | 'rejected';

interface FilterTabsProps {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
  counts: Record<FilterKey, number>;
  keyword: string;
  onKeywordChange: (value: string) => void;
  serviceLevel: Dis_discountrequestsdis_servicelevel | 'all';
  onServiceLevelChange: (value: Dis_discountrequestsdis_servicelevel | 'all') => void;
  serviceCategory: Dis_discountrequestsdis_servicecategory | 'all';
  onServiceCategoryChange: (value: Dis_discountrequestsdis_servicecategory | 'all') => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'outOfAuthority', label: 'Out of Authority' },
  { key: 'withinAuthority', label: 'Within Authority' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const SERVICE_LEVEL_OPTIONS = Object.entries(SERVICE_LEVEL).map(([value, label]) => ({
  value: Number(value) as Dis_discountrequestsdis_servicelevel,
  label,
}));
const SERVICE_CATEGORY_OPTIONS = Object.entries(SERVICE_CATEGORY).map(([value, label]) => ({
  value: Number(value) as Dis_discountrequestsdis_servicecategory,
  label,
}));

export function FilterTabs({
  active,
  onChange,
  counts,
  keyword,
  onKeywordChange,
  serviceLevel,
  onServiceLevelChange,
  serviceCategory,
  onServiceCategoryChange,
  onRefresh,
  refreshing,
}: FilterTabsProps) {
  return (
    <div className="filter-row">
      <div className="filter-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
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
        <div className="filter-group">
          <select
            className="filter-select"
            aria-label="Filter by Service Level"
            value={serviceLevel}
            onChange={(e) =>
              onServiceLevelChange(
                e.target.value === 'all' ? 'all' : (Number(e.target.value) as Dis_discountrequestsdis_servicelevel)
              )
            }
          >
            <option value="all">All Service Levels</option>
            {SERVICE_LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            aria-label="Filter by Service Category"
            value={serviceCategory}
            onChange={(e) =>
              onServiceCategoryChange(
                e.target.value === 'all' ? 'all' : (Number(e.target.value) as Dis_discountrequestsdis_servicecategory)
              )
            }
          >
            <option value="all">All Service Categories</option>
            {SERVICE_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {onRefresh && (
          <button type="button" className="filter-btn" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>
    </div>
  );
}
