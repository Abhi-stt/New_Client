import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationErrorProps {
  error?: string;
  className?: string;
}

export function ValidationError({ error, className }: ValidationErrorProps) {
  if (!error) return null;

  return (
    <div className={cn("flex items-center gap-1 text-sm text-red-600 mt-1", className)}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}

interface ValidationSuccessProps {
  message?: string;
  className?: string;
}

export function ValidationSuccess({ message, className }: ValidationSuccessProps) {
  if (!message) return null;

  return (
    <div className={cn("flex items-center gap-1 text-sm text-green-600 mt-1", className)}>
      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

interface ValidationHintProps {
  hint?: string;
  className?: string;
}

export function ValidationHint({ hint, className }: ValidationHintProps) {
  if (!hint) return null;

  return (
    <div className={cn("text-sm text-gray-500 mt-1", className)}>
      {hint}
    </div>
  );
}
