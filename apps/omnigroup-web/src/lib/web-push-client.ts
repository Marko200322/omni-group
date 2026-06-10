function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerAdminServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

export async function subscribeAdminPush(): Promise<boolean> {
  if (!('Notification' in window) || !('PushManager' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  await registerAdminServiceWorker();
  const reg = await navigator.serviceWorker.ready;

  const keyRes = await fetch('/api/atina/admin/push/vapid-public-key');
  const keyJson = (await keyRes.json()) as {
    ok?: boolean;
    data?: { publicKey?: string; configured?: boolean };
  };
  if (!keyJson.ok || !keyJson.data?.configured || !keyJson.data.publicKey) return false;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyJson.data.publicKey) as BufferSource,
  });

  const payload = sub.toJSON();
  const res = await fetch('/api/atina/admin/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: payload.endpoint,
      keys: payload.keys,
    }),
  });

  const json = (await res.json()) as { ok?: boolean };
  return Boolean(json.ok);
}
