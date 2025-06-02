import { useEffect } from 'react';

export default function GlassTicket({ ticketId, role }: { ticketId: string, role: string }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/js/sql-voice-handler.js';
    script.defer = true;
    script.onload = () => {
      localStorage.setItem('currentTicketId', ticketId);
      if (role === 'client') localStorage.setItem('clientRequest', 'true');
      if (role === 'admin') localStorage.setItem('dashboardReply', 'true');
    };
    document.body.appendChild(script);
  }, [ticketId, role]);

  return (
    <div>
      <h2>🎙️ Voice Recorder for Ticket #{ticketId}</h2>
      {role === 'client' && (
        <>
          <button id="record">Start Recording</button>
          <button id="stop" disabled>Stop</button>
          <ul id="recordingsList"></ul>
        </>
      )}
      {role === 'admin' && (
        <div>
          <h4>👂 Reviewing local stored voice logs...</h4>
          <ul id="recordingsList"></ul>
        </div>
      )}
    </div>
  );
}
