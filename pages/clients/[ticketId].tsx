import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  updateDoc,
  doc,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { firebaseApp } from '@/utils/firebase';
import styles from '@/styles/ticketid.module.css';
import { scheduleLocalNotification } from '@/utils/exporter';

interface Ticket {
  ticket_number: number;
  plate_number: string;
  car_model: string;
  status: string;
  assignedAt?: { toDate: () => Date };
  created_at?: { toDate: () => Date };
  etaMinutes?: number;
  visitorId?: string;
}

export default function ClientTicketView() {
  const db = getFirestore(firebaseApp);
  const router = useRouter();
  const { ticketId } = router.query;

  function generateVisitorId() {
    return 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  if (typeof window !== 'undefined' && !localStorage.getItem('visitorId')) {
    localStorage.setItem('visitorId', generateVisitorId());
  }

  const translateStatus = (status: string) => {
    switch (status) {
      case 'new':
        return 'مركونة';
      case 'requested':
        return 'تم الطلب';
      case 'assigned':
        return 'تم تعيين سائق';
      case 'completed':
        return 'تم التوصيل';
      case 'cancelled':
        return 'ملغاة';
      default:
        return status;
    }
  };

  const visitorId = typeof window !== 'undefined' ? localStorage.getItem('visitorId') : null;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [docId, setDocId] = useState('');
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://js.pusher.com/beams/2.1.0/push-notifications-cdn.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!ticketId || typeof window === 'undefined') return;

    const interval = setInterval(() => {
      if ((window as any).PusherPushNotifications) {
        clearInterval(interval);
        const beamsClient = new (window as any).PusherPushNotifications.Client({
          instanceId: '3edf71c5-d3e0-471a-aaa5-ebe35be280ba'
        });

        const paddedTicket = (ticketId as string).toString().padStart(4, '0');
        const interestKey = `ticket-${paddedTicket}-client-${visitorId}`;
        beamsClient.start()
          .then(() => beamsClient.addDeviceInterest(interestKey))
          .then(() => console.log(`✅ Beams: Subscribed to ${interestKey}`))
          .catch(console.error);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;

    const q = query(
      collection(db, 'tickets'),
      where('ticket_number', '==', parseInt(ticketId as string))
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data() as Ticket;
        setDocId(d.id);
        setTicket(data);

        // ✅ STOP everything if completed
        if (data.status === 'completed') {
          setCountdown(0);
          setLoading(false);
          return;
        }

        // ⏱ ETA countdown logic
        if (
          data.status === 'assigned' &&
          data.assignedAt &&
          data.etaMinutes &&
          (!data.visitorId || data.visitorId === visitorId)
        ) {
          const etaTime = data.assignedAt.toDate().getTime() + data.etaMinutes * 60000;
          const remaining = Math.max(etaTime - Date.now(), 0);
          setCountdown(remaining);
          scheduleLocalNotification(data);

          const padded = (ticketId as string).toString().padStart(4, '0');
          const interestKey = `ticket-${padded}-client-${visitorId}`;

          fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              interest: interestKey,
              title: 'تم تسليم الطلب للسائق',
              body: `سيارتك في طريقها اليك ! الوقت المتوقع للوصول ${data.etaMinutes} mins.`
            })
          });

          setTimeout(() => {
            fetch('/api/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                interest: interestKey,
                title: '⏱️ يرجى الإستعداد',
                body: 'سيارتك سوف تصل خلال 3 دقائق ...'
              })
            });
          }, (data.etaMinutes * 60000) - 180000);
        } else {
          setCountdown(0);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [ticketId]);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1000, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleRequest = async () => {
    const now = Timestamp.now();
    const q = query(
      collection(db, 'tickets'),
      where('status', '==', 'requested'),
      orderBy('requestedAt', 'asc')
    );
    const snap = await getDocs(q);
    const etaMinutes = snap.docs.length < 5 ? 7 : Math.ceil(snap.docs.length / 5) * 7;

    await updateDoc(doc(db, 'tickets', docId), {
      requestedAt: now,
      etaMinutes,
      status: 'requested',
      visitorId: localStorage.getItem('visitorId')
    });
  };

  const mins = Math.floor(countdown / 60000).toString().padStart(2, '0');
  const secs = Math.floor((countdown % 60000) / 1000).toString().padStart(2, '0');

  useEffect(() => {
    const button = document.querySelector('.rotating-button') as HTMLElement;
    if (!button) return;
    let angle = 0;
    const rotate = () => {
      angle = (angle + 1) % 360;
      button.style.setProperty('--angle', `${angle}deg`);
      requestAnimationFrame(rotate);
    };
    rotate();
  }, []);

  if (loading) return <p className={styles.container}>Loading ticket...</p>;
  if (!ticket) return <p className={styles.container}>Ticket not found</p>;

  return (
    <>
      {/* 🔥 Fullscreen background video */}
     <video autoPlay muted loop playsInline id="background-video" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, objectFit: 'cover' }}>
       <source src="/back.mp4" type="video/mp4" />
     </video>

 <div className={styles.ticketContainer} dir="rtl" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <img src="/logo.png" alt="i-Valet" className={styles.logo} style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, animation: 'logoBounce 2.5s infinite ease-in-out' }} />

        <div className={styles.glassCard}>
          <h2 className={styles.title}>i-Valet Ticket info</h2>
          <p><strong>رقم البطاقة  : </strong> {ticket.ticket_number}</p>
          <p><strong>رقم اللوحة  : </strong> {ticket.plate_number}</p>
          <p><strong>موديل السيارة  : </strong> {ticket.car_model}</p>
          <p><strong>وقت الدخول  : </strong> {ticket.created_at?.toDate().toLocaleString()}</p>
          <p><strong>الحالة  : </strong> {translateStatus(ticket.status)}</p>

          {ticket.status === 'assigned' ? (
            <div className={styles.countdown}>{mins}:{secs}</div>
          ) : ticket.status === 'completed' ? (
            <p style={{ color: 'green', fontWeight: 'bold' }}>✅ تمت عملية التسليم بنجاح</p>
          ) : ticket.status === 'new' ? (
            <button onClick={handleRequest} className="rotating-button">
              إطلب سيارتك
            </button>
          ) : (
            <p>بإنتظار تعيين سائق ...</p>
          )}
        </div>
      </div>
    </>
  );
}
