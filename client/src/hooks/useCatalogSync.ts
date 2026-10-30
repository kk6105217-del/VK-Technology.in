import { useEffect } from 'react';
import { realtimeSync, CatalogEvent } from '../services/realtime';

export function useCatalogSync(onUpdate: (event?: CatalogEvent) => void, deps: any[] = []) {
  useEffect(() => {
    // Listen to real-time events from SSE, BroadcastChannel, and sync status checks
    const unsubscribe = realtimeSync.subscribe((event) => {
      if (
        event.type === 'PRODUCT_UPDATED' ||
        event.type === 'PRODUCT_CREATED' ||
        event.type === 'PRODUCT_DELETED' ||
        event.type === 'PRICE_CHANGED' ||
        event.type === 'STOCK_CHANGED' ||
        event.type === 'CATEGORY_UPDATED' ||
        event.type === 'CATALOG_CHANGED' ||
        event.type === 'TAB_FOCUSED' ||
        event.type === 'NETWORK_ONLINE'
      ) {
        onUpdate(event);
      }
    });

    // Also listen to window custom event for broad compatibility
    const handleWindowEvent = (e: any) => {
      onUpdate(e?.detail);
    };
    window.addEventListener('vk_catalog_updated', handleWindowEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('vk_catalog_updated', handleWindowEvent);
    };
  }, deps);
}
