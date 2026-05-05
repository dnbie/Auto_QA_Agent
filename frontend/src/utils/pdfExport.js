import { jsPDF } from 'jspdf';

function parseReportSections(text) {
  const colorMap = {
    'EXECUTIVE SUMMARY': 'var(--g)',
    'TEST COVERAGE': 'var(--info)',
    'FAILURE ANALYSIS': 'var(--fail)',
    'FIX ACTIONS': 'var(--ai)',
    'REMAINING ISSUES': 'var(--warn)',
    RECOMMENDATION: 'var(--g)',
  };
  const sectionPattern =
    /(?:^|\n)((?:EXECUTIVE SUMMARY|TEST COVERAGE[^\n]*|FAILURE ANALYSIS|FIX ACTIONS[^\n]*|REMAINING ISSUES|RECOMMENDATION)[^\n]*)\n([\s\S]*?)(?=\n(?:EXECUTIVE SUMMARY|TEST COVERAGE|FAILURE ANALYSIS|FIX ACTIONS|REMAINING ISSUES|RECOMMENDATION)|$)/gi;
  const sections = [];
  let match;
  while ((match = sectionPattern.exec(text)) !== null) {
    const title = match[1].replace(/^#+\s*/, '').trim();
    const content = match[2].trim();
    const colorKey = Object.keys(colorMap).find((k) => title.toUpperCase().includes(k));
    sections.push({ title, content, color: colorMap[colorKey] || 'var(--g)' });
  }
  if (sections.length === 0 && text.length > 10) {
    sections.push({ title: 'CLAUDE AI ANALYSIS', content: text, color: 'var(--ai)' });
  }
  return sections;
}

export { parseReportSections };

export async function downloadPDF({ ticket, results, tests, aiReportText, depth }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const t = ticket;
  const r = results;
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const W = 210, M = 18, CW = W - M * 2;

  // PAGE 1: COVER
  doc.setFillColor(8, 8, 8); doc.rect(0, 0, W, 297, 'F');
  doc.setFillColor(134, 188, 37); doc.rect(0, 0, W, 18, 'F');
  doc.setTextColor(8, 8, 8); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('AUTOQA AGENT', M, 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('AI-Powered QA Report', M + 60, 11);
  doc.setTextColor(8, 8, 8); doc.text(now, W - M, 11, { align: 'right' });

  doc.setTextColor(134, 188, 37); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(`${t.id} · QA Bot · vcmanoj.atlassian.net`, M, 32);

  doc.setTextColor(240, 240, 240); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(t.title, CW);
  doc.text(titleLines, M, 42);
  let y = 42 + titleLines.length * 8 + 4;

  doc.setTextColor(120, 120, 120); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`Type: ${t.type}   Priority: ${t.priority || '—'}   Assignee: ${t.assignee}   Depth: ${depth}`, M, y); y += 10;

  const statusCol = r.fail > 0 ? [226, 75, 74] : [134, 188, 37];
  doc.setFillColor(...statusCol); doc.roundedRect(M, y, 40, 9, 2, 2, 'F');
  doc.setTextColor(r.fail > 0 ? 240 : 8, r.fail > 0 ? 240 : 8, r.fail > 0 ? 240 : 8);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text(r.fail > 0 ? 'FAILED' : 'PASSED', M + 20, y + 5.5, { align: 'center' }); y += 16;

  const mets = [['TOTAL', r.total, [200, 200, 200]], ['PASSED', r.pass, [134, 188, 37]], ['FAILED', r.fail, r.fail > 0 ? [226, 75, 74] : [100, 100, 100]], ['PASS RATE', r.passRate + '%', [56, 189, 248]], ['DURATION', r.duration + 's', [56, 189, 248]]];
  let mx = M;
  mets.forEach(([lbl, val, col]) => {
    doc.setFillColor(25, 25, 25); doc.roundedRect(mx, y, 34, 16, 2, 2, 'F');
    doc.setTextColor(...col); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(String(val), mx + 17, y + 8, { align: 'center' });
    doc.setTextColor(80, 80, 80); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    doc.text(lbl, mx + 17, y + 13, { align: 'center' }); mx += 36;
  }); y += 22;

  doc.setFillColor(35, 35, 35); doc.rect(M, y, CW, 5, 'F');
  const bw = Math.round((r.passRate / 100) * CW);
  const bc = r.passRate >= 80 ? [134, 188, 37] : r.passRate >= 60 ? [240, 165, 0] : [226, 75, 74];
  doc.setFillColor(...bc); doc.rect(M, y, bw, 5, 'F');
  doc.setTextColor(100, 100, 100); doc.setFontSize(7);
  doc.text(`${r.passRate}% pass rate`, M + bw + 2, y + 3.5); y += 12;

  if (t.ac && t.ac.length) {
    doc.setTextColor(134, 188, 37); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('ACCEPTANCE CRITERIA', M, y); y += 5;
    t.ac.forEach((a, i) => {
      if (y > 265) { doc.addPage(); doc.setFillColor(8, 8, 8); doc.rect(0, 0, W, 297, 'F'); y = 20; }
      const lines = doc.splitTextToSize(`${i + 1}. ${a}`, CW - 8);
      doc.setTextColor(160, 160, 160); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(lines, M + 4, y); y += lines.length * 4.5;
    });
  }

  // PAGE 2: AI NARRATIVE
  doc.addPage(); doc.setFillColor(8, 8, 8); doc.rect(0, 0, W, 297, 'F');
  doc.setFillColor(134, 188, 37); doc.rect(0, 0, W, 10, 'F');
  doc.setTextColor(8, 8, 8); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('AUTOQA AGENT — AI ANALYSIS', M, 6.5);
  doc.text(t.id, W - M, 6.5, { align: 'right' }); y = 20;

  const sectionColors = { 'EXECUTIVE SUMMARY': [134, 188, 37], 'TEST COVERAGE': [56, 189, 248], 'FAILURE ANALYSIS': [226, 75, 74], 'FIX ACTIONS': [167, 139, 250], 'REMAINING ISSUES': [240, 165, 0], RECOMMENDATION: [134, 188, 37] };
  const reportSections = parseReportSections(aiReportText || '');

  reportSections.forEach((sec) => {
    if (y > 260) {
      doc.addPage(); doc.setFillColor(8, 8, 8); doc.rect(0, 0, W, 297, 'F');
      doc.setFillColor(134, 188, 37); doc.rect(0, 0, W, 10, 'F');
      doc.setTextColor(8, 8, 8); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('AUTOQA AGENT — AI ANALYSIS', M, 6.5); doc.text(t.id, W - M, 6.5, { align: 'right' }); y = 20;
    }
    const ck = Object.keys(sectionColors).find((k) => sec.title.toUpperCase().includes(k));
    const sc = sectionColors[ck] || [134, 188, 37];
    doc.setFillColor(...sc.map((v) => Math.round(v * 0.15))); doc.rect(M, y, CW, 8, 'F');
    doc.setFillColor(...sc); doc.rect(M, y, 3, 8, 'F');
    doc.setTextColor(...sc); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(sec.title.toUpperCase(), M + 6, y + 5); y += 10;

    const contentLines = doc.splitTextToSize(sec.content || '', CW - 4);
    contentLines.forEach((line) => {
      if (y > 272) {
        doc.addPage(); doc.setFillColor(8, 8, 8); doc.rect(0, 0, W, 297, 'F');
        doc.setFillColor(134, 188, 37); doc.rect(0, 0, W, 10, 'F');
        doc.setTextColor(8, 8, 8); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text('AUTOQA AGENT — AI ANALYSIS', M, 6.5); doc.text(t.id, W - M, 6.5, { align: 'right' }); y = 20;
      }
      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim());
      doc.setTextColor(isBullet ? 200 : 160, 160, 160);
      doc.setFontSize(7.5); doc.setFont('helvetica', isBullet ? 'bold' : 'normal');
      doc.text(line || ' ', M + 4, y); y += 4.8;
    }); y += 4;
  });

  // PAGE 3: TEST RESULTS TABLE
  doc.addPage(); doc.setFillColor(8, 8, 8); doc.rect(0, 0, W, 297, 'F');
  doc.setFillColor(134, 188, 37); doc.rect(0, 0, W, 10, 'F');
  doc.setTextColor(8, 8, 8); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('AUTOQA AGENT — TEST RESULTS', M, 6.5);
  doc.text(t.id, W - M, 6.5, { align: 'right' }); y = 20;

  const failedTests = tests.filter((x) => x.status === 'fail');
  if (failedTests.length) {
    doc.setTextColor(226, 75, 74); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(`FAILED TESTS (${failedTests.length})`, M, y); y += 6;
    failedTests.forEach((x) => {
      if (y > 260) { doc.addPage(); doc.setFillColor(8, 8, 8); doc.rect(0, 0, W, 297, 'F'); y = 20; }
      doc.setFillColor(30, 15, 15); doc.rect(M, y, CW, 18, 'F');
      doc.setFillColor(226, 75, 74); doc.rect(M, y, 2, 18, 'F');
      doc.setTextColor(240, 240, 240); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(`${x.id}: ${x.name.substring(0, 60)}`, M + 5, y + 5);
      doc.setTextColor(226, 75, 74); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
      const errLines = doc.splitTextToSize((x.error || 'failed').replace(/\n/g, ' '), CW - 10);
      doc.text(errLines[0] || '', M + 5, y + 10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Type: ${x.type} | Duration: ${x.duration}s | Priority: ${x.priority || 'High'}`, M + 5, y + 15);
      y += 21;
    }); y += 4;
  }

  doc.setTextColor(134, 188, 37); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('ALL TEST RESULTS', M, y); y += 5;
  doc.setFillColor(25, 25, 25); doc.rect(M, y, CW, 7, 'F');
  doc.setTextColor(134, 188, 37); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
  doc.text('ID', M + 2, y + 4.5); doc.text('TEST NAME', M + 22, y + 4.5);
  doc.text('TYPE', M + 120, y + 4.5); doc.text('STATUS', M + 145, y + 4.5); doc.text('TIME', M + 165, y + 4.5); y += 7;

  tests.forEach((x, i) => {
    if (y > 275) { doc.addPage(); doc.setFillColor(8, 8, 8); doc.rect(0, 0, W, 297, 'F'); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(18, 18, 18); doc.rect(M, y, CW, 5.5, 'F'); }
    const sc = x.status === 'pass' ? [134, 188, 37] : x.status === 'fail' ? [226, 75, 74] : [100, 100, 100];
    doc.setTextColor(90, 90, 90); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    doc.text(x.id, M + 2, y + 3.8);
    doc.setTextColor(200, 200, 200); doc.text(x.name.substring(0, 52), M + 22, y + 3.8);
    doc.setTextColor(167, 139, 250); doc.text(x.type, M + 120, y + 3.8);
    doc.setTextColor(...sc); doc.setFont('helvetica', 'bold'); doc.text(x.status.toUpperCase(), M + 145, y + 3.8);
    doc.setTextColor(90, 90, 90); doc.setFont('helvetica', 'normal'); doc.text((x.duration || '—') + 's', M + 165, y + 3.8); y += 5.5;
  });

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(20, 20, 20); doc.rect(0, 285, W, 12, 'F');
    doc.setFillColor(134, 188, 37); doc.rect(0, 285, W, 1, 'F');
    doc.setTextColor(80, 80, 80); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('AutoQA Agent · vcmanoj@deloitte.com · HC Forward · Bengaluru', M, 292);
    doc.text(`Page ${p} of ${totalPages}`, W - M, 292, { align: 'right' });
  }

  doc.save(`autoqa-report-${t.id}-${Date.now()}.pdf`);
}
