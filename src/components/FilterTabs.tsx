import { ArrowClockwiseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { cx } from '../lib/classNames';
import { SERVICE_CATEGORY, SERVICE_LEVEL, toSelectOptions } from '../lib/optionSets';
import type { ServiceCategoryFilter, ServiceLevelFilter, StatusFilter } from '../lib/requestFilters';

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'outOfAuthority', label: 'Out of Authority' },
  { key: 'withinAuthority', label: 'Within Authority' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const SERVICE_LEVEL_OPTIONS = toSelectOptions(SERVICE_LEVEL);
const SERVICE_CATEGORY_OPTIONS = toSelectOptions(SERVICE_CATEGORY);

interface FilterTabsProps {
  active: StatusFilter;
  onChange: (key: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}

export function FilterTabs({ active, onChange, counts }: FilterTabsProps) {
  return (
    <div className="filter-tabs" role="tablist" aria-label="Filter requests by status">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={cx(
            'filter-tab',
            active === tab.key && 'active',
            tab.key === 'outOfAuthority' && counts.outOfAuthority > 0 && 'filter-tab-alert'
          )}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          <span className="filter-count">{counts[tab.key]}</span>
        </button>
      ))}
    </div>
  );
}

interface OptionFilterSelectProps<T extends number> {
  label: string;
  allLabel: string;
  options: { value: T; label: string }[];
  value: T | 'all';
  onChange: (value: T | 'all') => void;
}

/** A `<select>` over an option set with a leading "all" entry. */
function OptionFilterSelect<T extends number>({ label, allLabel, options, value, onChange }: OptionFilterSelectProps<T>) {
  return (
    <select
      className="filter-select"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value === 'all' ? 'all' : (Number(e.target.value) as T))}
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface FilterToolbarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  serviceLevel: ServiceLevelFilter;
  onServiceLevelChange: (value: ServiceLevelFilter) => void;
  serviceCategory: ServiceCategoryFilter;
  onServiceCategoryChange: (value: ServiceCategoryFilter) => void;
  shownCount: number;
  totalCount: number;
  onRefresh?: () => void;
}

export function FilterToolbar({
  keyword,
  onKeywordChange,
  serviceLevel,
  onServiceLevelChange,
  serviceCategory,
  onServiceCategoryChange,
  shownCount,
  totalCount,
  onRefresh,
}: FilterToolbarProps) {
  return (
    <div className="grid-toolbar">
      <div className="filter-search-wrap">
        <MagnifyingGlassIcon className="filter-search-icon" aria-hidden="true" />
        <input
          className="filter-search"
          placeholder="Search patient, ID, service, staff"
          aria-label="Filter by keyword"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>
      <OptionFilterSelect
        label="Filter by Service Level"
        allLabel="All Service Levels"
        options={SERVICE_LEVEL_OPTIONS}
        value={serviceLevel}
        onChange={onServiceLevelChange}
      />
      <OptionFilterSelect
        label="Filter by Service Category"
        allLabel="All Service Categories"
        options={SERVICE_CATEGORY_OPTIONS}
        value={serviceCategory}
        onChange={onServiceCategoryChange}
      />
      <div className="grid-toolbar-end">
        <span className="grid-result-count">
          Showing <strong>{shownCount}</strong> of {totalCount}
        </span>
        {onRefresh && (
          <button type="button" className="filter-btn" onClick={onRefresh}>
            <ArrowClockwiseIcon aria-hidden="true" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
