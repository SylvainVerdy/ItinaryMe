
'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const ChatInterface = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (inputValue.trim() !== '') {
      setMessages([...messages, inputValue]);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-4 space-y-4">
      <div className="flex-grow overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className="mb-2 p-2 rounded-md bg-secondary text-secondary-foreground">
            {message}
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter your travel request..."
          className="flex-grow"
        />
        <Button onClick={handleSendMessage}>Send</Button>
      </div>
    </div>
  );
};
