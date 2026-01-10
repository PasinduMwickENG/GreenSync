import React from 'react';
import { AlertTriangle, XCircle, Info, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ErrorState = ({ 
  title = "Something went wrong", 
  message, 
  onRetry,
  variant = 'error',
  className 
}) => {
  const variants = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: XCircle,
      iconColor: 'text-red-500',
      titleColor: 'text-red-900',
      messageColor: 'text-red-700'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      titleColor: 'text-yellow-900',
      messageColor: 'text-yellow-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: Info,
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-900',
      messageColor: 'text-blue-700'
    }
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-2xl border-2 p-8 text-center",
      config.bg,
      config.border,
      className
    )}>
      <Icon className={cn("w-12 h-12 mx-auto mb-4", config.iconColor)} />
      <h3 className={cn("text-lg font-bold mb-2", config.titleColor)}>{title}</h3>
      {message && (
        <p className={cn("text-sm mb-4", config.messageColor)}>{message}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
};

export const EmptyState = ({ 
  icon: Icon = Info,
  title = "No data available",
  message,
  action,
  actionLabel,
  className
}) => {
  return (
    <div className={cn("text-center py-12 px-6", className)}>
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      {message && (
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{message}</p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
