import type { ReactNode } from 'react';
import { cx } from '../lib/classNames';

/** `accent` is reserved for the one number on a screen that asks the viewer to act. */
export type StatTone = 'plain' | 'accent' | 'dark';

export interface StatCard {
  label: string;
  value: number;
  caption: string;
  icon: ReactNode;
  tone?: StatTone;
  /** When set, the card shows its share of this total as a percent chip and a segmented capsule bar. */
  of?: number;
}

const SEGMENTS = 8;

function ShareBar({ value, of }: { value: number; of: number }) {
  const share = of > 0 ? value / of : 0;
  const filled = Math.round(share * SEGMENTS);
  return (
    <div className="stat-bar" aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span key={i} className={cx('stat-seg', i < filled && 'stat-seg-on')} style={{ ['--i' as string]: i }} />
      ))}
    </div>
  );
}

export function StatCards({ cards }: { cards: StatCard[] }) {
  return (
    <div className="stat-row">
      {cards.map((card, i) => {
        const share = card.of != null && card.of > 0 ? Math.round((card.value / card.of) * 100) : null;
        return (
          <section
            key={card.label}
            className={cx('stat-card', `stat-card-${card.tone ?? 'plain'}`)}
            style={{ ['--i' as string]: i }}
            aria-label={card.label}
          >
            <header className="stat-head">
              <span className="stat-icon">{card.icon}</span>
              <span className="stat-label">{card.label}</span>
            </header>
            <div className="stat-figure">
              <span className="stat-value">{card.value.toLocaleString()}</span>
              {card.of != null && <span className="stat-of">/ {card.of.toLocaleString()}</span>}
              {share != null && <span className="stat-share">{share}%</span>}
            </div>
            {card.of != null && <ShareBar value={card.value} of={card.of} />}
            <p className="stat-caption">{card.caption}</p>
          </section>
        );
      })}
    </div>
  );
}
