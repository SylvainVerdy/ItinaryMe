
import { ChatInterface } from '@/components/ChatInterface';
import { RoamReadySidebar } from '@/components/Sidebar';

export default function Home() {
  return (
    <div className="flex h-screen bg-background">
      <RoamReadySidebar />
      <ChatInterface />
    </div>
  );
}

