export default function ConsoleLogs({ logs, onClear }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)' }}>Pipeline log</span>
        <button className="btn-sm" onClick={onClear}>Clear</button>
      </div>
      <div className="console">
        {logs.map((entry, i) => (
          <div className="log" key={i}>
            <span className="lt">{entry.t}</span>
            <span className={`l${entry.lv}`}>[{entry.lv.toUpperCase().padEnd(5)}]</span>
            <span className="lm">{entry.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
