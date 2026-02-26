'use client';

import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

type StatusType = 'success' | 'error' | 'info';

interface StatusMessageProps {
  type: StatusType;
  message: string;
  onClose?: () => void;
}

const config = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    text: 'text-green-400',
    iconColor: 'text-green-500',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    iconColor: 'text-red-500',
  },
  info: {
    icon: Info,
    bg: 'bg-ptw-500/10',
    border: 'border-ptw-500/20',
    text: 'text-ptw-400',
    iconColor: 'text-ptw-500',
  },
};

export function StatusMessage({ type, message, onClose }: StatusMessageProps) {
  const { icon: Icon, bg, border, text, iconColor } = config[type];

  return (
    <div className={`rounded-xl border ${bg} ${border} p-4 animate-fade-in`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        <p className={`flex-1 text-sm ${text}`}>{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className={`flex-shrink-0 ${text} hover:opacity-70 transition-opacity`}
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
