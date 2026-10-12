import { ClearChatButton } from '../../features/search/components/ClearChatButton';
import { HybridWeightPanel } from '../../features/search/components/HybridWeightPanel';
import { ResultsLimitSelect } from '../../features/search/components/ResultsLimitSelect';
import { SearchModeNav } from '../../features/search/components/SearchModeNav';
import { useSearchStore } from '../../features/search/store/searchStore';
import { ThemeToggle } from './ThemeToggle';

export function Sidebar() {
  const { searchType, setSearchType, useLlm, setUseLlm } = useSearchStore();

  return (
    <aside className="workspace-sidebar" aria-label="RecruitBot navigation">
      <div className="brand-lockup">
        <div className="brand-avatar" aria-hidden="true">RB</div>
        <div>
          <strong>RecruitBot</strong>
          <span><i className="status-dot" /> Ingestion + retrieval</span>
        </div>
      </div>

      <ThemeToggle />

      <nav className="workspace-nav" aria-label="Workspace sections">
        <a className="workspace-nav-link active" href="#ingestion">
          <span>01</span>
          Resume ingestion
        </a>
        <a className="workspace-nav-link" href="#retrieval">
          <span>02</span>
          Candidate retrieval
        </a>
      </nav>

      <div className="sidebar-control-section">
        <span className="sidebar-section-label">Search mode</span>
        <SearchModeNav activeMode={searchType} onChange={setSearchType} />
      </div>

      {searchType === 'hybrid' && <HybridWeightPanel />}

      <label className="llm-toggle">
        <input type="checkbox" checked={useLlm} onChange={(event) => setUseLlm(event.target.checked)} />
        <span>
          <strong>Use LLM ranking</strong>
          <small>Show reasoning and candidate summaries</small>
        </span>
      </label>

      <div className="sidebar-control-section">
        <span className="sidebar-section-label">Results limit</span>
        <ResultsLimitSelect />
      </div>

      <ClearChatButton />

      <div className="sidebar-note">
        <span className="eyebrow">Current flow</span>
        <p>Upload a resume, confirm vector readiness, then search the indexed candidate records.</p>
      </div>

      <footer className="sidebar-footer">RecruitBot frontend · Phase 11</footer>
    </aside>
  );
}