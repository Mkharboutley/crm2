import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '@/utils/firebase';
import styles from '@/styles/login.module.css';

export default function Login() {
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', userCred.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        throw new Error('لم يتم العثور على بيانات المستخدم.');
      }

      const role = snap.data()?.role;

      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'user') {
        router.push('/entry');
      } else {
        throw new Error('ليس لديك صلاحية الدخول.');
      }
    } catch (err: unknown) {
      let msg = 'فشل في تسجيل الدخول.';
      if (err instanceof Error) {
        msg = err.message.includes('auth') ? 'بيانات الدخول غير صحيحة.' : err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const buttons = document.querySelectorAll('.rotating-button') as NodeListOf<HTMLElement>;
    let angle = 0;
    let frameId: number;

    const rotate = () => {
      angle = (angle + 1) % 360;
      buttons.forEach(btn => btn.style.setProperty('--angle', `${angle}deg`));
      frameId = requestAnimationFrame(rotate);
    };

    rotate();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className={styles.container}>
      <form className={styles.wrapper} onSubmit={handleLogin}>
        <img src="/logo.gif" alt="i-Valet Logo" className={styles.logo} />

        <input
          type="email"
          className="glass-input"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          className="glass-input"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <style jsx>{`
          .glass-input {
            width: 100%;
            padding: 16px 20px;
            font-size: 16px;
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(4px);
            color: white;
            margin-bottom: 20px;
            box-shadow: inset 5px 5px 15px rgba(255, 255, 255, 0.05),
                        inset -1px -1px 4px rgba(0, 0, 0, 0.4);
            transition: all 0.3s ease;
          }

          .glass-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
          }

          .glass-input:focus {
            outline: none;
            border-color: white;
            box-shadow: 0 0 6px rgba(255, 255, 255, 0.2);
          }
        `}</style>

        <button
          className={`${styles.button} rotating-button`}
          type="submit"
          disabled={loading}
        >
          {loading ? 'يتم التسجيل...' : 'تسجيل الدخول'}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </form>
    </div>
  );
}
