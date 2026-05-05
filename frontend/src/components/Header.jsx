import { useApp } from '../context/AppContext';

export default function Header() {
  const { agentStatus, currentSection, goToSection } = useApp();
  return (
    <header className="hdr">
      <div className="logo">
        <div className="logo-box">AQ</div>
        <div>
          <div className="logo-name">AUTOQA AGENT</div>
          <div className="logo-sub">vcmanoj.atlassian.net · QA Bot</div>
        </div>
      </div>
      <div className="hdr-right">
        <div className="pill pill-gray">{currentSection === 6 ? 'Dashboard' : `Phase ${currentSection}`}</div>
        <button
          className="btn-sm"
          onClick={() => goToSection(6)}
          style={{ padding: '5px 12px', fontSize: '10px', fontFamily: 'var(--fm)', borderRadius: '20px', background: 'rgba(56,189,248,.08)', border: '1px solid rgba(56,189,248,.2)', color: 'var(--info)' }}
        >
          📊 Dashboard
        </button>
        <div className="pill pill-gray">vcmanoj.atlassian.net</div>
        <div className="pill pill-green">
          <div className="live-dot" />
          <span>{agentStatus}</span>
        </div>
      </div>
    </header>
  );
}
