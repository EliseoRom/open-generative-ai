'use client';

import { useEffect, useRef } from 'react';
import axios from 'axios';
import { getApiKey } from '@/src/lib/apiKeyStore';

export function useMuapiAxios() {
  const interceptorRef = useRef(null);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    interceptorRef.current = axios.interceptors.request.use((config) => {
      const url = config.url || '';
      const isRelative = url.startsWith('/') || !url.startsWith('http');
      const isInternalProxy =
        url.includes('/api/app') ||
        url.includes('/api/workflow') ||
        url.includes('/api/agents') ||
        url.includes('/api/api') ||
        url.includes('/api/v1');

      if (isRelative || isInternalProxy) {
        config.headers['x-api-key'] = apiKey;
      }
      return config;
    });

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.request.eject(interceptorRef.current);
      }
    };
  }, []);

  return getApiKey();
}
