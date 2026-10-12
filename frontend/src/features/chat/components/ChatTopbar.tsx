import { useSearchStore } from '../../search/store/searchStore';

const modeLabels = {
  vector: 'Vector Search · Semantic similarity',
  bm25: 'BM25 · Keyword matching',
  hybrid: 'Hybrid · Combined retrieval',
};

export function ChatTopbar() {
  const searchType = useSearchStore((state) => state.searchType);

  return (
    <header className="chat-topbar">
      <div className="chat-title-group">
        <div className="chat-avatar" aria-hidden="true">RB</div>
        <div>
          <strong>RecruitBot</strong>
          <span>{modeLabels[searchType]}</span>
        </div>
      </div>
      <span className={`mode-badge ${searchType}`}>{searchType === 'bm25' ? 'BM25' : searchType}</span>
    </header>
  );
}