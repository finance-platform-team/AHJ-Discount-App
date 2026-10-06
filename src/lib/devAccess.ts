import { hasFullAccess } from './accessScope';
import type { CurrentUser } from './currentUser';

/**
 * Dev data actions bulk-write or wipe whole Dataverse tables, so they exist only in a
 * `npm run dev` build and only for full-access users — a production build never offers them.
 */
export function canUseDevDataActions(user: CurrentUser | null): boolean {
  return import.meta.env.DEV && hasFullAccess(user);
}
