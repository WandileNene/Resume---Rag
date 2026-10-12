import { useSearchStore } from '../store/searchStore';

export function ResultsLimitSelect() {
  const { topK, setTopK } = useSearchStore();

  return (
    <label className="results-limit-control">
      <span>Show top</span>
      <select value={topK} onChange={(event) => setTopK(Number(event.target.value))}>
        {[3, 5, 10, 20].map((value) => (
          <option key={value} value={value}>{value} results</option>
        ))}
      </select>
    </label>
  );
}