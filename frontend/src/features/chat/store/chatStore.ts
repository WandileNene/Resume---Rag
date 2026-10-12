import { create } from 'zustand';
import type { ReactNode } from 'react';

export type ChatMessage = {
  id: string;
  type: 'user' | 'bot';
  text?: string;
  content?: ReactNode;
  timestamp: Date;
};

interface ChatState {
  messages: ChatMessage[];
  addUserMessage: (text: string) => void;
  addBotMessage: (content: ReactNode) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addUserMessage: (text) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: crypto.randomUUID(), type: 'user', text, timestamp: new Date() },
      ],
    })),
  addBotMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: crypto.randomUUID(), type: 'bot', content, timestamp: new Date() },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
}));