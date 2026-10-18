import { useEffect, useState } from 'react';
import { onConnectionChange } from '../socket';

export function useConnectionStatus() {
  const [connected, setConnected] = useState(false);
  useEffect(() => onConnectionChange(setConnected), []);
  return connected;
}
