import { useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'info' | 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timerRef = { current: undefined as ReturnType<typeof setTimeout> | undefined };
    const innerRef = { current: undefined as ReturnType<typeof setTimeout> | undefined };
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => {
      setVisible(false);
      innerRef.current = setTimeout(() => onCloseRef.current(), 200);
    }, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (innerRef.current) clearTimeout(innerRef.current);
    };
  }, []);

  return (
    <div className={`toast toast-${type}${visible ? ' toast-visible' : ''}`} role="alert">
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={() => { setVisible(false); setTimeout(onClose, 200); }} aria-label="Close notification">
        ×
      </button>
    </div>
  );
}
