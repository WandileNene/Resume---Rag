export function WelcomeMessage() {
  return (
    <div className="welcome-message">
      <span className="message-kicker">RecruitBot assistant</span>
      <h2>Find the right candidate faster.</h2>
      <p>Search indexed resumes using semantic similarity, exact keywords, or a combined hybrid approach.</p>
      <div className="mode-explanation">
        <span><b>Vector</b> understands meaning</span>
        <span><b>BM25</b> matches exact terms</span>
        <span><b>Hybrid</b> combines both signals</span>
      </div>
    </div>
  );
}