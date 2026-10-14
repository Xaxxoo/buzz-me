import type { AuthClient } from './auth';
import { API_BASE } from './config';

/** Register service worker and subscribe to push notifications. */
export async function registerPush(auth: AuthClient): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');

    // Get VAPID key from server
    const { key } = await auth.api.get<{ key: string | null }>('/notifications/push/vapid-key');
    if (!key) return false;

    // Check if already subscribed
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key).buffer as ArrayBuffer,
      });
    }

    // Send subscription to server
    const subJson = sub.toJSON();
    await auth.api.post('/notifications/push/subscribe', {
      endpoint: sub.endpoint,
      keys: subJson.keys,
    });

    return true;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
