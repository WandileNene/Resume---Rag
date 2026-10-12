import { useSearchStore } from '../store/searchStore';
import { useChatStore } from '../../chat/store/chatStore';

export function ClearChatButton() {
  const clear = useSearchStore((state) => state.clear);
  const clearMessages = useChatStore((state) => state.clearMessages);

  return (
    <button
      type="button"
      className="clear-search-button"
      onClick={() => {
        clear();
        clearMessages();
      }}
    >
      <span aria-hidden="true">×</span>
      Clear search
    </button>
  );
}