'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  variant = 'warning',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const variantStyles = {
    danger: {
      icon: 'text-red-500',
      button: 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    },
    warning: {
      icon: 'text-ptw-500',
      button: 'bg-gradient-to-br from-ptw-400 to-ptw-600 hover:from-ptw-500 hover:to-ptw-700',
    },
    info: {
      icon: 'text-blue-500',
      button: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-dark-850 via-dark-850 to-dark-900 border border-dark-700/50 rounded-2xl p-6 shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(212,168,83,0.15)] animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-dark-800 border border-dark-700 text-dark-400 flex items-center justify-center hover:text-white hover:border-dark-600 transition-all duration-200"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            variant === 'warning' 
              ? 'bg-ptw-500/10 border border-ptw-500/20' 
              : variant === 'danger' 
              ? 'bg-red-500/10 border border-red-500/20' 
              : 'bg-blue-500/10 border border-blue-500/20'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-dark-300 mb-6">{message}</p>

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-dark-300 rounded-xl font-medium hover:text-white hover:border-dark-600 transition-all duration-200"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-3 px-4 ${styles.button} text-dark-950 rounded-xl font-medium transition-all duration-200 shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
