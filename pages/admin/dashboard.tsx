import { useEffect, useMemo, useState } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { firebaseApp } from '@/utils/firebase';
import {
  assignTicketToWorker,
  cancelTicket,
  completeTicket
} from '@/utils/ticketActions';
import RequestTable from '@/components/RequestTable';
import SettingsPanel from '@/components/SettingsPanel';
import TicketStats from '@/components/TicketStats';
import Layout from '@/components/Layout';
import Loader from '@/components/Loader';
import styles from '@/styles/dashboard.module.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Ticket {
  id: string;
  ticket_number: number;
  plate_number: string;
  car_model: string;
  status: string;
  assignedWorker?: string | null;
  created_at?: {
    toDate: () => Date;
  };
  requestedAt?: {
    toDate: () => Date;
  };
  etaMinutes?: number;
}

interface Worker {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const db = getFirestore(firebaseApp);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('all');

  useEffect(() => {
    const q = query(
      collection(db, 'tickets'),
      where('status', 'in', ['new', 'requested', 'assigned', 'completed']),
      orderBy('requestedAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data: Ticket[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            ticket_number: d.ticket_number ?? 0,
            plate_number: d.plate_number ?? '',
            car_model: d.car_model ?? '',
            status: d.status ?? '',
            assignedWorker: d.assignedWorker ?? null,
            created_at: d.created_at,
            requestedAt: d.requestedAt,
            etaMinutes: d.etaMinutes,
          };
        });
        setTickets(data);
        setLoading(false);
      },
      (error) => {
        console.error('Snapshot error:', error);
        toast.error('Failed to load tickets.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

useEffect(() => {
  const checkForNewVoice = () => {
    const sync = localStorage.getItem("adminTicketSync");
    if (!sync) return;

    try {
      const { ticketId, timestamp } = JSON.parse(sync);
      if (!ticketId) return;

      // Navigate the admin to the ticket view
      window.location.href = `/admin/tickets/${ticketId}`;
    } catch (err) {
      console.error("Invalid sync data:", err);
    }
  };

  const interval = setInterval(checkForNewVoice, 2000);
  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    const fetchWorkers = async () => {
      const snapshot = await getDocs(collection(db, 'workers'));
      const list: Worker[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || `Worker ${doc.id}`
      }));
      setWorkers(list);
    };
    fetchWorkers();
  }, []);

  const handleAssign = async (ticketId: string, workerId: string) => {
    try {
      await assignTicketToWorker(ticketId, workerId);
      toast.success(`Ticket #${ticketId} assigned.`);
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast.error('Failed to assign ticket.');
    }
  };

  const handleComplete = async (ticketId: string) => {
    await completeTicket(ticketId);
    toast.success(`Ticket #${ticketId} completed.`);
  };

  const handleCancel = async (ticketId: string) => {
    await cancelTicket(ticketId);
    toast.info(`Ticket #${ticketId} cancelled.`);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchStatus = filter === 'all' || ticket.status === filter;
    const matchSearch = [ticket.plate_number, ticket.car_model]
      .some((field) => field.toLowerCase().includes(search.toLowerCase()));
    const matchWorker =
      selectedWorker === 'all' ||
      `${ticket.assignedWorker ?? ''}` === selectedWorker;

    const matchDate = (() => {
      if (!fromDate && !toDate) return true;
      const ticketTime = ticket.created_at?.toDate?.() || new Date();
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      if (from && ticketTime < from) return false;
      if (to && ticketTime > to) return false;
      return true;
    })();

    return matchStatus && (!search || matchSearch) && matchWorker && matchDate;
  });

  const stats = {
    requested: tickets.filter((t) => t.status === 'requested').length,
    assigned: tickets.filter((t) => t.status === 'assigned').length,
    completed: tickets.filter((t) => t.status === 'completed').length,
  };

  return (
    <Layout>
      <div className={styles.dashboardWrapper}>
        <header className={styles.header}>
          <h1>Admin Dashboard</h1>
          <div className={styles.headerActions}>
            <button
              className={styles.settingsToggle}
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙️ Settings
            </button>
          </div>
        </header>

        {showSettings && <SettingsPanel />}
        <TicketStats stats={stats} />

        <div className={styles.filterBar}>
          <label>Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="requested">Requested</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
          </select>

          <label>Worker:</label>
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
          >
            <option value="all">All Workers</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>

          <label>Search:</label>
          <input
            type="text"
            placeholder="Search plate/model"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <label>From:</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <label>To:</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {loading ? (
          <Loader />
        ) : (
          <RequestTable
            tickets={filteredTickets}
            workers={workers}
            onAssign={handleAssign}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        )}
      </div>
    </Layout>
  );
}
