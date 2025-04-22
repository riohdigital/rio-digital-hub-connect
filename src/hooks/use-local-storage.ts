// src/hooks/use-local-storage.ts
import { useState, useEffect, useCallback } from 'react';

// Helper function to safely get value from localStorage
function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    // Return default value if running on the server (SSR/SSG)
    return defaultValue;
  }
  try {
    const saved = window.localStorage.getItem(key);
    if (saved !== null) {
      return JSON.parse(saved) as T;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
    return defaultValue;
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    return getStorageValue(key, defaultValue);
  });

  // Callback to update value and localStorage
  const setStoredValue = useCallback((newValue: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      // Save state
      setValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, value]); // Depende de key e do valor atual para a função de callback

  // Listen for storage changes from other tabs/windows (optional but good practice)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea === localStorage && event.key === key) {
        try {
           // Se o valor foi removido ou é inválido, volta pro default
          setValue(event.newValue ? JSON.parse(event.newValue) as T : defaultValue);
        } catch (error) {
          console.error(`Error parsing storage change for key “${key}”:`, error);
           setValue(defaultValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Limpa o listener ao desmontar
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, defaultValue]);

  return [value, setStoredValue];
}
