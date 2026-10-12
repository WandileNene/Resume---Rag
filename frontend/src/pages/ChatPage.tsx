import { ResumeUploadCard } from '../features/ingestion/components/ResumeUploadCard';
import { ChatMain } from '../features/chat/ChatMain';
import { AppShell } from '../components/layout/AppShell';

export function ChatPage() {
  return (
    <AppShell>
      <div className="app-frame app-frame--split">
        <section id="ingestion">
          <ResumeUploadCard />
        </section>
        <ChatMain />
      </div>
    </AppShell>
  );
}