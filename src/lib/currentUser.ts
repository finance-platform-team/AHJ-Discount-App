import { useEffect, useState } from 'react';
import { getContext } from '@microsoft/power-apps/app';
import { SystemusersService } from '../generated/services/SystemusersService';
import { RolesService } from '../generated/services/RolesService';

export const DISCOUNT_BASIC_USER_ROLE = 'Discount Basic User';

export interface CurrentUser {
  systemUserId: string;
  fullName?: string;
  roleNames: string[];
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
          const rolesResult = await RolesService.getAll({
            select: ['name'],
            filter: `systemuserroles_association/any(o:o/systemuserid eq ${record.systemuserid})`,
          });
          const roleNames = (rolesResult.data ?? []).map((r) => r.name).filter((n): n is string => !!n);
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
