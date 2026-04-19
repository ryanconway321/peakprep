import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function useNotifications(getToken) {
  const [supported, setSupported]   = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window);
    setPermission(Notification.permission);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
        setSubscribed(!!sub);
        setSubscription(sub);
      });
    }
  }, []);

  async function subscribe(reminderHour) {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const permResult = await Notification.requestPermission();
      setPermission(permResult);
      if (permResult !== 'granted') { setLoading(false); return false; }

      const keyRes = await fetch(`${API}/api/push/vapid-public-key`);
      const { key } = await keyRes.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      const token = await getToken();
      await fetch(`${API}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription: sub.toJSON(), reminderHour }),
      });

      setSubscribed(true);
      setSubscription(sub);
      setLoading(false);
      return true;
    } catch (e) {
      console.error('Push subscribe error:', e);
      setLoading(false);
      return false;
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const token = await getToken();
        await fetch(`${API}/api/push/unsubscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setSubscription(null);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function updateReminderHour(reminderHour) {
    if (!subscription) return;
    const token = await getToken();
    await fetch(`${API}/api/push/reminder-hour`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reminderHour, endpoint: subscription.endpoint }),
    });
  }

  return { supported, permission, subscribed, loading, subscribe, unsubscribe, updateReminderHour };
}
