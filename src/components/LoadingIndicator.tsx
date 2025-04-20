import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = 'Chargement en cours...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-center text-gray-700 font-medium">{message}</p>
    </div>
  );
};

export default LoadingIndicator; 