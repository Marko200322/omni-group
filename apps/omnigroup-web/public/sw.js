self.addEventListener('push', (event) => {
  let data = { title: 'Omni Group Admin', body: 'Nova notifikacija', url: '/admin/mobile' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'og-admin',
      data: { url: data.url || '/admin/mobile' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin/mobile';
  event.waitUntil(clients.openWindow(url));
});
