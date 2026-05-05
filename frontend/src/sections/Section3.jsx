export default function Section3() {
  return (
    <>
      <div className="s-hero">
        <div className="hero-tag">✦ Phase 3 · AI Code Fix</div>
        <h2><span className="dim">CLAUDE</span> <span className="acc">FIXES</span> <span className="dim">CODE</span></h2>
        <p>Claude analyses the failure report, edits the source files in VS Code, and re-runs tests. Up to 3 automatic attempts.</p>
      </div>
      <div className="empty">
        <div className="ei">🧠</div>
        <p>This phase runs automatically when you click<br /><strong style={{ color: 'var(--ai)' }}>Run QA · Fix · Re-run</strong> in Phase 2.</p>
      </div>
    </>
  );
}
