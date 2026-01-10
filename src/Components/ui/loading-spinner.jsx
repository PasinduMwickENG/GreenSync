import React from 'react';
import { cn } from '../../lib/utils';

export const LoadingSpinner = ({ size = 'md', className, text }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className={cn(
        "border-3 border-green-500 border-t-transparent rounded-full animate-spin",
        sizes[size]
      )} />
      {text && (
        <p className="text-sm font-medium text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );
};

export const FullPageLoader = ({ text = "Loading..." }) => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-100 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
        <p className="text-lg font-semibold text-gray-700">{text}</p>
      </div>
    </div>
  );
};

export const InlineLoader = ({ text }) => (
  <div className="flex items-center justify-center py-12">
    <LoadingSpinner size="lg" text={text} />
  </div>
);
