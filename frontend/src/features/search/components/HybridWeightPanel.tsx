import { useSearchStore } from '../store/searchStore';

export function HybridWeightPanel() {
  const { bm25Weight, vectorWeight, setWeights } = useSearchStore();

  return (
    <div className="hybrid-weight-panel">
      <div className="sidebar-section-heading">
        <span>Search weights</span>
        <small>{bm25Weight + vectorWeight}% total</small>
      </div>

      <label className="weight-control">
        <span><b>BM25</b><strong>{bm25Weight}%</strong></span>
        <input
          type="range"
          min="0"
          max="100"
          value={bm25Weight}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            setWeights(nextValue, 100 - nextValue);
          }}
          aria-label="BM25 search weight"
        />
      </label>

      <label className="weight-control">
        <span><b>Vector</b><strong>{vectorWeight}%</strong></span>
        <input
          type="range"
          min="0"
          max="100"
          value={vectorWeight}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            setWeights(100 - nextValue, nextValue);
          }}
          aria-label="Vector search weight"
        />
      </label>

      <div className="weight-presets" aria-label="Search weight presets">
        {[['50 / 50', 50], ['70 / 30', 70], ['30 / 70', 30]].map(([label, bm25]) => (
          <button
            key={label}
            type="button"
            onClick={() => setWeights(Number(bm25), 100 - Number(bm25))}
            className={bm25Weight === Number(bm25) ? 'active' : ''}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}