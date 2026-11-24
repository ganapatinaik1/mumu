import { useQuery } from '@tanstack/react-query';
import { search } from '../services/search';

export const useSearch = (query: string) =>
  useQuery({
    queryKey: ['search', query],
    queryFn: () => search(query),
    enabled: query.trim().length > 0,
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
