
import { useQuery } from '@tanstack/react-query';
import { getTableSnapshotsOnly } from '@/lib/api/iceberg';
import authService from '@/services/AuthService';

export const useIcebergSnapshots = (namespace: string, tableName: string) => {
  return useQuery({
    queryKey: ['iceberg-snapshots', namespace, tableName],
    queryFn: async () => {
      const token = await authService.getValidToken();
      console.log('[useIcebergSnapshots] Fetching snapshots for:', { namespace, tableName });
      
      const snapshots = await getTableSnapshotsOnly(namespace, tableName, token || undefined);
      console.log('[useIcebergSnapshots] Retrieved snapshots:', snapshots);
      
      return snapshots;
    },
    enabled: !!(namespace && tableName),
  });
};
