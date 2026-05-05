import { useApp } from './context/AppContext';
import Header from './components/Header';
import PipelineNav from './components/PipelineNav';
import Toast from './components/Toast';
import Section1 from './sections/Section1';
import Section2 from './sections/Section2';
import Section3 from './sections/Section3';
import Section4 from './sections/Section4';
import Section5 from './sections/Section5';
import Section6 from './sections/Section6';

// Helper: add/remove "show" class on section root element
function SectionWrapper({ active, children }) {
  return <div className={active ? 'section show' : 'section'}>{children}</div>;
}

export default function App() {
  const { currentSection } = useApp();

  return (
    <>
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="app">
        <Header />
        <PipelineNav />
        <SectionWrapper active={currentSection === 1}><Section1 /></SectionWrapper>
        <SectionWrapper active={currentSection === 2}><Section2 /></SectionWrapper>
        <SectionWrapper active={currentSection === 3}><Section3 /></SectionWrapper>
        <SectionWrapper active={currentSection === 4}><Section4 /></SectionWrapper>
        <SectionWrapper active={currentSection === 5}><Section5 /></SectionWrapper>
        <SectionWrapper active={currentSection === 6}><Section6 /></SectionWrapper>
      </div>
      <Toast />
    </>
  );
}
