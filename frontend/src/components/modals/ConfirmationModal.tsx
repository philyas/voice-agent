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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-white via-dark-50 to-dark-100 border border-dark-300 rounded-2xl p-6 shadow-xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-dark-100 border border-dark-300 text-dark-600 flex items-center justify-center hover:text-ptw-600 hover:border-ptw-400/60 hover:bg-dark-50 transition-all duration-200"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            variant === 'warning' 
              ? 'bg-ptw-500/10 border border-ptw-500/30' 
              : variant === 'danger' 
              ? 'bg-red-500/10 border border-red-500/30' 
              : 'bg-blue-500/10 border border-blue-500/30'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
          </div>
          
          <h3 className="text-xl font-semibold text-dark-900 mb-2">{title}</h3>
          <p className="text-dark-600 mb-6">{message}</p>

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white border border-dark-300 text-dark-700 rounded-xl font-medium hover:border-ptw-400/60 hover:bg-dark-50 transition-all duration-200 shadow-sm"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-3 px-4 ${styles.button} text-white rounded-xl font-medium transition-all duration-200 shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
