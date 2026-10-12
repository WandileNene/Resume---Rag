import { useState } from 'react';

interface ChatInputBarProps {
  disabled: boolean;
  onSubmit: (query: string) => void;
}

export function ChatInputBar({ disabled, onSubmit }: ChatInputBarProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const query = value.trim();
    if (!query || disabled) return;
    onSubmit(query);
    setValue('');
  };

  return (
    <div className="chat-input-wrap">
      <textarea
        value={value}
        rows={1}
        placeholder="Ask for a candidate by skills, role, or experience..."
        aria-label="Candidate search query"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <button type="button" className="chat-send-button" onClick={submit} disabled={disabled || !value.trim()}>
        {disabled ? 'Searching' : 'Search'}
      </button>
      <small>Press Enter to search · Shift+Enter for a new line</small>
    </div>
  );
}