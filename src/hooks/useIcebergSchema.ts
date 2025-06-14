
import { useQuery } from '@tanstack/react-query';
import { getTableSchema } from '@/lib/api/iceberg';
import authService from '@/services/AuthService';

export const useIcebergSchema = (namespace: string, tableName: string) => {
  return useQuery({
    queryKey: ['iceberg-schema', namespace, tableName],
    queryFn: async () => {
      const token = await authService.getValidToken();
      console.log('[useIcebergSchema] Fetching schema for:', { namespace, tableName });
      
      const schema = await getTableSchema(namespace, tableName, token || undefined);
      console.log('[useIcebergSchema] Retrieved schema:', schema);
      
      return schema;
    },
    enabled: !!(namespace && tableName),
  });
};
