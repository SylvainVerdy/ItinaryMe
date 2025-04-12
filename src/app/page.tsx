'use client';

import {ChatInterface} from '@/components/ChatInterface';
import {RoamReadySidebar} from '@/components/Sidebar';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';

type TaskType = 'document' | 'planning' | 'travel';

export default function Home() {
  const [activeTask, setActiveTask] = useState<TaskType | null>(null);
  const [documentContent, setDocumentContent] = useState('');

  const renderTaskContent = () => {
    switch (activeTask) {
      case 'document':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Document Task</CardTitle>
              <CardDescription>Create and edit a document.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Start writing your document here..."
                value={documentContent}
                onChange={e => setDocumentContent(e.target.value)}
                className="min-h-[300px]"
              />
            </CardContent>
            <CardFooter>
              <Button>Save Document</Button>
            </CardFooter>
          </Card>
        );
      case 'planning':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Planning Task</CardTitle>
              <CardDescription>Plan your schedule.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Implement planning interface here */}
              <p>Planning interface coming soon...</p>
            </CardContent>
            <CardFooter>
              <Button>Save Plan</Button>
            </CardFooter>
          </Card>
        );
      case 'travel':
        return <ChatInterface />;
      default:
        return <p>Select a task type to start.</p>;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <RoamReadySidebar />
      <div className="flex flex-col flex-1 p-6">
        <div className="flex space-x-4 mb-4">
          <Button onClick={() => setActiveTask('document')}>
            New Document
          </Button>
          <Button onClick={() => setActiveTask('planning')}>
            New Planning
          </Button>
          <Button onClick={() => setActiveTask('travel')}>Plan a Trip</Button>
        </div>
        <div className="flex-1">{renderTaskContent()}</div>
      </div>
    </div>
  );
}
