import { toast as sonnerToast } from 'sonner';

/**
 * Enhanced toast notifications with consistent styling
 */
export const toast = {
  success: (message, options = {}) => {
    sonnerToast.success(message, {
      duration: 3000,
      style: {
        background: '#10b981',
        color: 'white',
        border: 'none',
      },
      ...options,
    });
  },

  error: (message, options = {}) => {
    sonnerToast.error(message, {
      duration: 4000,
      style: {
        background: '#ef4444',
        color: 'white',
        border: 'none',
      },
      ...options,
    });
  },

  warning: (message, options = {}) => {
    sonnerToast.warning(message, {
      duration: 3500,
      style: {
        background: '#f59e0b',
        color: 'white',
        border: 'none',
      },
      ...options,
    });
  },

  info: (message, options = {}) => {
    sonnerToast.info(message, {
      duration: 3000,
      style: {
        background: '#3b82f6',
        color: 'white',
        border: 'none',
      },
      ...options,
    });
  },

  loading: (message, options = {}) => {
    return sonnerToast.loading(message, {
      style: {
        background: '#6b7280',
        color: 'white',
        border: 'none',
      },
      ...options,
    });
  },

  promise: (promise, messages, options = {}) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong',
      ...options,
    });
  },

  dismiss: (toastId) => {
    sonnerToast.dismiss(toastId);
  },
};

export default toast;
