export default function Section4() {
  return (
    <>
      <div className="s-hero">
        <div className="hero-tag">✦ Phase 4 · Re-run Tests</div>
        <h2><span className="dim">RE-RUN</span> <span className="acc">TESTS</span></h2>
        <p>Automated re-execution after each fix attempt. Results update live.</p>
      </div>
      <div className="empty">
        <div className="ei">🔁</div>
        <p>Re-run happens automatically as part of the<br /><strong style={{ color: 'var(--g)' }}>Run QA · Fix · Re-run</strong> loop in Phase 2.</p>
      </div>
    </>
  );
}
