import { useApp } from '../context/AppContext';

const STEPS = [
  { n: 1, label: 'Create Ticket' },
  { n: 2, label: 'AutoQA Tests' },
  { n: 3, label: 'Claude Fixes Code' },
  { n: 4, label: 'Re-run Tests' },
  { n: 5, label: 'Report' },
  { n: 6, label: 'Dashboard', icon: '📊' },
];

export default function PipelineNav() {
  const { currentSection, goToSection } = useApp();
  return (
    <div className="pipe">
      {STEPS.map((step, idx) => {
        let cls = 'ps';
        if (step.n < currentSection) cls += ' done';
        else if (step.n === currentSection) cls += ' current-step';
        return (
          <span key={step.n} style={{ display: 'contents' }}>
            <div className={cls} onClick={() => goToSection(step.n)}>
              <div className="pn">{step.icon || step.n}</div>
              {step.label}
            </div>
            {idx < STEPS.length - 1 && <div className="pa">›</div>}
          </span>
        );
      })}
    </div>
  );
}
