import { useSearchStore } from '../search/store/searchStore';
import { useChatStore } from './store/chatStore';
import { ChatInputBar } from './components/ChatInputBar';
import { ChatMessages } from './components/ChatMessages';
import { ChatTopbar } from './components/ChatTopbar';
import { SuggestionChips } from './components/SuggestionChips';
import { ResultsList } from '../search/components/ResultsList';
import { CandidateModal } from '../candidate/CandidateModal';
import { useCandidateModal } from '../candidate/useCandidateModal';

export function ChatMain() {
  const { isSearching, setQuery, search, results, searchType, duration, error } = useSearchStore();
  const { messages, addUserMessage, addBotMessage } = useChatStore();
  const candidateModal = useCandidateModal();

  const submitQuery = async (nextQuery: string) => {
    setQuery(nextQuery);
    addUserMessage(nextQuery);
    await search(nextQuery);
    const latestSearch = useSearchStore.getState();
    if (latestSearch.error) {
      addBotMessage(<p className="chat-error-message">{latestSearch.error}</p>);
    } else {
      addBotMessage(
        <ResultsList
          results={latestSearch.results}
          mode={latestSearch.searchType}
          duration={latestSearch.duration}
          onSelect={candidateModal.openCandidateModal}
        />,
      );
    }
  };

  return (
    <section id="retrieval" className="chat-main" aria-label="RecruitBot candidate search">
      <ChatTopbar />
      <ChatMessages isSearching={isSearching} />
      {error && messages.length === 0 && <p className="chat-error-message">{error}</p>}
      {messages.length > 0 && !isSearching && results.length > 0 && (
        <div className="results-module-preview" aria-hidden="true">
          <span>{results.length} results · {searchType}</span>
          <span>{duration > 0 ? `${duration} ms` : 'Ready'}</span>
        </div>
      )}
      {messages.length === 0 && <SuggestionChips onSelect={submitQuery} />}
      <ChatInputBar disabled={isSearching} onSubmit={submitQuery} />
      <CandidateModal {...candidateModal} onClose={candidateModal.closeModal} />
    </section>
  );
}