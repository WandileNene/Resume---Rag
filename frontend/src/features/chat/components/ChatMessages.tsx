import { useChatStore } from '../store/chatStore';
import { LoadingDots } from './LoadingDots';
import { WelcomeMessage } from './WelcomeMessage';

interface ChatMessagesProps {
  isSearching: boolean;
}

export function ChatMessages({ isSearching }: ChatMessagesProps) {
  const messages = useChatStore((state) => state.messages);

  return (
    <div className="chat-messages" aria-live="polite">
      {messages.length === 0 && <WelcomeMessage />}
      {messages.map((message) => (
        <article key={message.id} className={`chat-message ${message.type}`}>
          {message.type === 'user' ? <p>{message.text}</p> : message.content}
          <time>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        </article>
      ))}
      {isSearching && <div className="chat-message bot"><LoadingDots /></div>}
    </div>
  );
}