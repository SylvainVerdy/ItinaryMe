'use client';

import React, {useState, useCallback} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {interpretTravelRequest} from '@/ai/flows/interpret-travel-request';
import {analyzeBrowserContent} from '@/ai/flows/analyze-browser-content';

export const ChatInterface = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = async () => {
    if (inputValue.trim() !== '') {
      setMessages([...messages, inputValue]);
      // Call the interpretTravelRequest flow
      try {
        const travelRequest = await interpretTravelRequest({request: inputValue});
        // Display the travel request details
        setMessages(prevMessages => [
          ...prevMessages,
          `Destination: ${travelRequest.destination}, Start Date: ${travelRequest.startDate}, End Date: ${travelRequest.endDate}`,
        ]);
      } catch (error) {
        console.error('Error interpreting travel request:', error);
        setMessages(prevMessages => [
          ...prevMessages,
          'Sorry, I couldn\'t understand your request. Please try again.',
        ]);
      }
      setInputValue('');
    } else {
      // If the input is empty, display a message to the user
      setMessages(prevMessages => [...prevMessages, 'Please enter your travel request.']);
    }
  };

  // Function to analyze browser content and set input value
  const handleAnalyzeBrowserContent = useCallback(async () => {
    try {
      // This is a placeholder - replace with actual browser content retrieval
      const browserContent = 'Looking for a trip to Paris from July 10th to July 20th';
      const analysisResult = await analyzeBrowserContent({text: browserContent});
      if (analysisResult) {
        setInputValue(
          `I want to travel to ${analysisResult.destination || ''} from ${analysisResult.startDate || ''} to ${analysisResult.endDate || ''} with preferences for ${analysisResult.preferences || ''}`
        );
      }
    } catch (error) {
      console.error('Error analyzing browser content:', error);
      setMessages(prevMessages => [...prevMessages, 'Failed to analyze browser content.']);
    }
  }, [setInputValue, setMessages]);

  return (
    <div className="flex flex-col h-full w-full p-6 space-y-5 bg-gradient-to-br from-green-50 to-beige-50 rounded-2xl shadow-lg">
      <div className="flex-grow overflow-y-auto space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground shadow-md text-sm"
          >
            {message}
          </div>
        ))}
      </div>
      <div className="flex space-x-3">
        <Textarea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Enter your travel request..."
          className="flex-grow rounded-md border-green-200 bg-green-50 text-gray-700 shadow-sm focus:border-green-400 focus:ring-green-400"
        />
        <Button
          onClick={handleSendMessage}
          className="bg-gradient-to-r from-teal-400 to-green-500 text-white font-semibold rounded-md shadow-md hover:from-teal-500 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1"
        >
          Send
        </Button>
      </div>
      <Button variant="outline" onClick={handleAnalyzeBrowserContent}>
        Analyze Browser Content
      </Button>
    </div>
  );
};
