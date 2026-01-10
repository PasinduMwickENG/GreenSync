import { useCallback, useRef, useEffect } from 'react';

/**
 * Debounce hook - delays execution of a function
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const useDebounce = (callback, delay = 500) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

/**
 * Throttle hook - limits execution frequency
 * @param {Function} callback - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const useThrottle = (callback, limit = 500) => {
  const inThrottle = useRef(false);

  return useCallback((...args) => {
    if (!inThrottle.current) {
      callback(...args);
      inThrottle.current = true;

      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [callback, limit]);
};

/**
 * Previous value hook - returns previous value of a state
 * @param {any} value - Current value
 * @returns {any} Previous value
 */
export const usePrevious = (value) => {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

/**
 * Mount state hook - tracks if component is mounted
 * @returns {Object} { isMounted, setMounted }
 */
export const useIsMounted = () => {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
};
