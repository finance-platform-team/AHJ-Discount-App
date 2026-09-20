import { useEffect, useState } from 'react';
import { getContext } from '@microsoft/power-apps/app';
import { SystemusersService } from '../generated/services/SystemusersService';

export interface CurrentUser {
  systemUserId: string;
  fullName?: string;
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
        if (!cancelled && record) {
          setUser({ systemUserId: record.systemuserid, fullName: record.fullname });
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
