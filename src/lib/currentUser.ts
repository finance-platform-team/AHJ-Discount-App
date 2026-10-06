import { useEffect, useState } from 'react';
import { getContext } from '@microsoft/power-apps/app';
import { SystemusersService } from '../generated/services/SystemusersService';
import { RolesService } from '../generated/services/RolesService';

export interface CurrentUser {
  systemUserId: string;
  fullName?: string;
  roleNames: string[];
}

async function roleNamesMatching(filter: string): Promise<string[]> {
  const result = await RolesService.getAll({ select: ['name'], filter });
  if (!result.success) throw result.error ?? new Error('Failed to read security roles.');
  return (result.data ?? []).map((r) => r.name).filter((n): n is string => !!n);
}

/**
 * Every security role the user holds: assigned to them directly, or inherited from any team they
 * belong to (owner teams and Entra ID group teams alike). A failed team lookup only drops the
 * inherited roles — the directly assigned ones still count.
 */
async function fetchRoleNames(systemUserId: string): Promise<string[]> {
  const [direct, inherited] = await Promise.all([
    roleNamesMatching(`systemuserroles_association/any(o:o/systemuserid eq ${systemUserId})`),
    roleNamesMatching(
      `teamroles_association/any(t:t/teammembership_association/any(u:u/systemuserid eq ${systemUserId}))`
    ).catch((e) => {
      console.warn('Could not read team-inherited security roles; using direct roles only.', e);
      return [] as string[];
    }),
  ]);
  return [...new Set([...direct, ...inherited])];
}

/** Resolves the authenticated Power Platform user context into a Dataverse systemuser record. */
export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const context = await getContext();
        const objectId = context.user.objectId;
        if (!objectId) {
          if (!cancelled) setLoading(false);
          return;
        }
        const result = await SystemusersService.getAll({
          select: ['systemuserid', 'fullname'],
          filter: `azureactivedirectoryobjectid eq ${objectId}`,
          top: 1,
        });
        const record = result.data?.[0];
        if (record) {
          const roleNames = await fetchRoleNames(record.systemuserid);
          if (!cancelled) {
            setUser({ systemUserId: record.systemuserid, fullName: record.fullname, roleNames });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
