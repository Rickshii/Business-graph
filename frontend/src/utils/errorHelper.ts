import { AxiosError } from 'axios';

export interface FriendlyError {
  message: string;
  type: 'NETWORK' | 'DATABASE' | 'AUTH' | 'UNKNOWN';
}

export function parseAxiosError(error: any): FriendlyError {
  if (error?.response) {
    const status = error.response.status;
    const backendMessage = error.response.data?.error;

    if (status === 401 || status === 403) {
      return {
        message: 'Access denied: You do not have permission to perform this action.',
        type: 'AUTH',
      };
    }
    
    return {
      message: backendMessage || `Database error (${status}): Failed to retrieve registered users.`,
      type: 'DATABASE',
    };
  } else if (error?.request) {
    return {
      message: 'Connection failed: The server is unreachable. Check if the backend is running and CORS is configured.',
      type: 'NETWORK',
    };
  } else {
    return {
      message: error?.message || 'An unexpected client error occurred.',
      type: 'UNKNOWN',
    };
  }
}
