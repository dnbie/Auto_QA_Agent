import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toastState } = useApp();
  const { visible, msg, type } = toastState;
  const ico = type === 'success' ? '✓' : type === 'info' ? '✦' : '✗';
  return (
    <div id="toast" className={visible ? `show ${type}` : ''}>
      <span>{ico}</span>
      <span>{msg}</span>
    </div>
  );
}
