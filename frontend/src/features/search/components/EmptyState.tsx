export function EmptyState() {
  return (
    <div className="empty-results-state">
      <span aria-hidden="true">⌕</span>
      <strong>No candidates found</strong>
      <p>Try broadening the role, skill, or experience terms in your query.</p>
    </div>
  );
}