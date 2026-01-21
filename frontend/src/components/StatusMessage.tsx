'use client';

import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

type StatusType = 'success' | 'error' | 'info';

interface StatusMessageProps {
  type: StatusType;
  message: string;
  onClose?: () => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
  info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
};

const iconStyles = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
};

export function StatusMessage({ type, message, onClose }: StatusMessageProps) {
  const Icon = icons[type];

  return (
    <div className={`rounded-lg border p-4 ${styles[type]} animate-fade-in`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconStyles[type]}`} />
        <p className="flex-1 text-sm">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
