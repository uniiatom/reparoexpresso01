import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useMediaLibrary(search = '') {
  return useQuery({
    queryKey: ['media-library', search.trim().toLowerCase()],
    queryFn: async () => {
      const items = await base44.entities.MediaLibrary.list('-created_at', 500);
      const q = search.trim().toLowerCase();
      if (!q) return items;
      return items.filter((item) => {
        const haystack = [
          item.file_name,
          item.file_url,
          item.source,
          item.storage_path,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      });
    },
    staleTime: 30_000,
  });
}
