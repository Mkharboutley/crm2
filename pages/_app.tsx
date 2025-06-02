import Script from 'next/script';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { NextUIProvider } from '@nextui-org/react';
import Head from 'next/head';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  // Register Service Worker
  useEffect(() => {
    // Skip Service Worker registration in StackBlitz, similar environments, or iframes
    const isStackBlitz = typeof window !== 'undefined' && (
      window.location.hostname.includes('stackblitz') || 
      window.location.hostname.includes('webcontainer.io') ||
      window.self !== window.top // Check if running in an iframe
    );

    if ('serviceWorker' in navigator && !isStackBlitz) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(reg => console.log('✅ Service Worker registered:', reg))
        .catch(err => console.error('❌ Service Worker registration failed:', err));
    }
  }, []);

  // Animate Rotating Buttons
  useEffect(() => {
    const buttons = document.querySelectorAll('.rotating-button');
    let angle = 0;

    const rotate = () => {
      angle = (angle + 1) % 360;
      buttons.forEach((btn) => {
        (btn as HTMLElement).style.setProperty('--angle', `${angle}deg`);
      });
      requestAnimationFrame(rotate);
    };

    rotate();
  }, []);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#132030" />
        <meta name="apple-mobile-web-app-status-bar-style" content="#132030" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="color-scheme" content="dark light" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://js.pusher.com/beams/2.1.0/push-notifications-cdn.js"></script>
      </Head>

      {/* 🎯 No video — CSS gradient handles background */}
      <NextUIProvider>
        <div className="glass-root" style={{ position: 'relative', zIndex: 1 }}>
          <Component {...pageProps} />
        </div>
      </NextUIProvider>
    </>
  );
}