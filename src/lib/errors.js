/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FirebaseError extends AppError {
  constructor(message, code) {
    super(message, code, 500);
    this.name = 'FirebaseError';
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class PermissionError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', resource = null) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

/**
 * Error handler utility
 */
export const handleError = (error, context = '') => {
  console.error(`[${context}]`, error);

  // Firebase specific errors
  if (error.code) {
    switch (error.code) {
      case 'permission-denied':
      case 'PERMISSION_DENIED':
        return new PermissionError('You do not have permission to access this resource');
      
      case 'not-found':
      case 'NOT_FOUND':
        return new NotFoundError('The requested resource was not found');
      
      case 'unauthenticated':
        return new PermissionError('You must be signed in to perform this action');
      
      case 'invalid-argument':
        return new ValidationError('Invalid data provided');
      
      case 'network-request-failed':
        return new AppError('Network error. Please check your internet connection', 'NETWORK_ERROR');
      
      default:
        return new FirebaseError(error.message || 'An unexpected error occurred', error.code);
    }
  }

  // Return as-is if already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Generic error
  return new AppError(error.message || 'An unexpected error occurred', 'UNKNOWN_ERROR');
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied') {
    return 'You do not have permission to perform this action';
  }

  if (error.code === 'NOT_FOUND' || error.code === 'not-found') {
    return 'The requested resource was not found';
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};
