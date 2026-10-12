import { create } from 'zustand';
import axios from 'axios';
import { searchCandidates, type SearchMode, type SearchResult } from '../services/searchApi';

interface SearchState {
  query: string;
  searchType: SearchMode;
  useLlm: boolean;
  bm25Weight: number;
  vectorWeight: number;
  topK: number;
  results: SearchResult[];
  duration: number;
  isSearching: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setSearchType: (mode: SearchMode) => void;
  setUseLlm: (useLlm: boolean) => void;
  setWeights: (bm25Weight: number, vectorWeight: number) => void;
  setTopK: (topK: number) => void;
  search: (queryOverride?: string) => Promise<void>;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  searchType: 'vector',
  useLlm: false,
  bm25Weight: 50,
  vectorWeight: 50,
  topK: 5,
  results: [],
  duration: 0,
  isSearching: false,
  error: null,
  setQuery: (query) => set({ query }),
  setSearchType: (searchType) => set({ searchType }),
  setUseLlm: (useLlm) => set({ useLlm }),
  setWeights: (bm25Weight, vectorWeight) => set({ bm25Weight, vectorWeight }),
  setTopK: (topK) => set({ topK }),
  clear: () => set({ query: '', results: [], duration: 0, error: null, isSearching: false }),
  search: async (queryOverride) => {
    const activeQuery = (queryOverride ?? get().query).trim();

    if (!activeQuery) {
      set({ error: 'Please enter a search query.', results: [] });
      return;
    }

    set({ isSearching: true, error: null });

    try {
      const response = await searchCandidates(get().searchType, activeQuery, get().topK, get().useLlm);
      set({
        results: response.results,
        duration: response.timings?.totalMs ?? response.timings?.durationMs ?? 0,
        isSearching: false,
      });
    } catch (caughtError) {
      const responseMessage = axios.isAxiosError(caughtError)
        ? (caughtError.response?.data as { message?: string } | undefined)?.message
        : undefined;
      const message = responseMessage ?? (caughtError instanceof Error
        ? caughtError.message
        : 'Search failed. Please try again.');
      set({ error: message, isSearching: false, results: [], duration: 0 });
    }
  },
}));
