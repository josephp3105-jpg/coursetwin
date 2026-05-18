// pages/index.js
import { useState, useCallback, useRef } from 'react';
import Head from 'next/head';

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const raw = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const headers = raw.map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (vals.length < 3) continue;
    const row = {};
    headers.forEach((h, j) => (row[h] = vals[j] || ''));
    rows.push(row);
  }
  return rows;
}

function summarizeData(rows) {
  const concepts = {};
  const students = {};

  rows.forEach(r => {
    const concept =
      r.concept || r.concept_name || r.topic || r.skill || r.standard || 'Unknown';
    const unit = r.unit || r.unit_name || r.chapter || r.module || 'Unknown';
    const sid = r.student_id || r.id || r.student || `S${Object.keys(students).length + 1}`;
    const sname = r.student_name || r.name || r.student || sid;
    const score = parseFloat(r.score || r.grade || r.points || 0);
    const max = parseFloat(r.max_score || r.total || r.max_points || r.out_of || 100);
    const pct = max > 0 ? Math.round((score / max) * 100) : Math.min(100, score);

    if (!concepts[concept]) concepts[concept] = { name: concept, unit, scores: [] };
    concepts[concept].scores.push(pct);

    if (!students[sid]) students[sid] = { id: sid, name: sname, scores: [], concepts: [] };
    students[sid].scores.push(pct);
    students[sid].concepts.push({ concept, pct });
  });

  const conceptList = Object.values(concepts)
    .map(c => ({
      name: c.name,
      unit: c.unit,
      mastery: Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length),
      below70: c.scores.filter(s => s < 70).length,
      total: c.scores.length,
    }))
    .sort((a, b) => a.mastery - b.mastery);

  const studentList = Object.values(students)
    .map(s => {
      const avg = Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length);
      const weakest = [...s.concepts].sort((a, b) => a.pct - b.pct)[0];
      return { id: s.id, name: s.name, avg, weakestConcept: weakest?.concept, weakestScore: weakest?.pct };
    })
    .sort((a, b) => a.avg - b.avg);

  return { conceptList, studentList, totalStudents: studentList.length, totalConcepts: conceptList.length };
}

// ─── Sample CSV for demo ──────────────────────────────────────────────────────
const SAMPLE_CSV = `student_id,student_name,concept,unit,score,max_score
S001,Alex R.,Variables & Expressions,Unit 1,82,100
S001,Alex R.,Solving One-Step Equations,Unit 1,78,100
S001,Alex R.,Distributive Property,Unit 2,54,100
S001,Alex R.,Slope-Intercept Form,Unit 4,61,100
S001,Alex R.,Systems of Equations,Unit 6,58,100
S002,Jordan M.,Variables & Expressions,Unit 1,91,100
S002,Jordan M.,Solving One-Step Equations,Unit 1,88,100
S002,Jordan M.,Distributive Property,Unit 2,62,100
S002,Jordan M.,Slope-Intercept Form,Unit 4,55,100
S002,Jordan M.,Systems of Equations,Unit 6,49,100
S003,Casey T.,Variables & Expressions,Unit 1,75,100
S003,Casey T.,Solving One-Step Equations,Unit 1,70,100
S003,Casey T.,Distributive Property,Unit 2,45,100
S003,Casey T.,Slope-Intercept Form,Unit 4,50,100
S003,Casey T.,Systems of Equations,Unit 6,44,100
S004,Morgan K.,Variables & Expressions,Unit 1,95,100
S004,Morgan K.,Solving One-Step Equations,Unit 1,93,100
S004,Morgan K.,Distributive Property,Unit 2,88,100
S004,Morgan K.,Slope-Intercept Form,Unit 4,91,100
S004,Morgan K.,Systems of Equations,Unit 6,87,100
S005,Riley P.,Variables & Expressions,Unit 1,68,100
S005,Riley P.,Solving One-Step Equations,Unit 1,65,100
S005,Riley P.,Distributive Property,Unit 2,42,100
S005,Riley P.,Slope-Intercept Form,Unit 4,48,100
S005,Riley P.,Systems of Equations,Unit 6,39,100
S006,Sam D.,Variables & Expressions,Unit 1,88,100
S006,Sam D.,Solving One-Step Equations,Unit 1,84,100
S006,Sam D.,Distributive Property,Unit 2,71,100
S006,Sam D.,Slope-Intercept Form,Unit 4,68,100
S006,Sam D.,Systems of Equations,Unit 6,63,100`;

// ─── Shared UI components ─────────────────────────────────────────────────────
function Badge({ label, type }) {
  const map = {
    high: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    moderate: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    ontrack: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    blue: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    teal: { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
    gray: { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  };
  const c = map[type] || map.blue;
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: c.bg, color: c.color, border: `1px solid ${c.border}`, letterSpacing: '0.01em' }}>
      {label}
    </span>
  );
}

function MasteryBar({ value }) {
  const color = value >= 80 ? '#16a34a' : value >= 70 ? '#d97706' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 34, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

function StatCard({ label, value, color, small }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: small ? 15 : 26, fontWeight: 700, color: color || '#111827', lineHeight: 1.15 }}>{value}</div>
    </div>
  );
}

// ─── Upload Screen ─────────────────────────────────────────────────────────────
function UploadScreen({ onAnalyze }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = f => {
    if (!f) return;
    if (!f.name.endsWith('.csv') && !f.type.includes('csv')) {
      setError('Please upload a .csv file.');
      return;
    }
    setFile(f);
    setError('');
  };

  const runAnalysis = async (csvText, name) => {
    setLoading(true);
    setError('');
    try {
      setProgress('Parsing grade data…');
      const rows = parseCSV(csvText);
      if (rows.length < 2) throw new Error('CSV appears empty or malformed. Check the format.');

      const summary = summarizeData(rows);

      const conceptSummary = summary.conceptList
        .map(c => `${c.name} (${c.unit}): ${c.mastery}% mastery, ${c.below70}/${c.total} students below 70%`)
        .join('\n');

      const studentSummary = summary.studentList
        .map(s => `${s.id}: avg ${s.avg}%, weakest = ${s.weakestConcept}`)
        .join('\n');

      setProgress('Running AI analysis…');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptSummary, studentSummary, totalStudents: summary.totalStudents }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const analysis = await res.json();
      setProgress('Building your dashboard…');
      await new Promise(r => setTimeout(r, 300));
      onAnalyze({ summary, analysis }, name);
    } catch (e) {
      setError(e.message);
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 38, color: '#111827', lineHeight: 1, marginBottom: 6 }}>
            CourseTwin <em style={{ color: '#2563eb', fontStyle: 'italic' }}>AI</em>
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', fontFamily: '"DM Mono", monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Performance Twin for Schools
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => !file && fileRef.current.click()}
          style={{
            border: `2px dashed ${dragging ? '#2563eb' : file ? '#16a34a' : '#d1d5db'}`,
            borderRadius: 16,
            padding: '2.5rem 2rem',
            textAlign: 'center',
            background: file ? '#f0fdf4' : dragging ? '#eff6ff' : '#fff',
            cursor: file ? 'default' : 'pointer',
            transition: 'all 0.2s',
            marginBottom: 12,
          }}
        >
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          {file ? (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>{file.name}</div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>{(file.size / 1024).toFixed(1)} KB · ready to analyze</div>
              <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ marginTop: 10, fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>remove</button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 36, marginBottom: 10, color: '#d1d5db' }}>↑</div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: '#374151' }}>Drop your gradebook CSV here</div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>or click to browse</div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 13, color: '#2563eb', marginBottom: 10 }}>{progress}</div>
            <div style={{ height: 3, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#2563eb', width: '60%', borderRadius: 2, animation: 'slide 1.2s ease-in-out infinite' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => file && file.text().then(t => runAnalysis(t, file.name))}
              disabled={!file}
              style={{ flex: 1, padding: '13px', background: file ? '#111827' : '#e5e7eb', color: file ? '#fff' : '#9ca3af', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: file ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background 0.15s' }}
            >
              Analyze Course
            </button>
            <button
              onClick={() => runAnalysis(SAMPLE_CSV, 'demo-algebra-i.csv')}
              style={{ padding: '13px 18px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Try Demo
            </button>
          </div>
        )}

        {/* Format hint */}
        <div style={{ marginTop: 20, padding: '16px 18px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Expected CSV columns</div>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#6b7280', lineHeight: 1.8, background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
            student_id, student_name, concept,<br />
            unit, score, max_score
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            Works with exports from Google Classroom, PowerSchool, Canvas, and Excel.
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes slide { 0% { transform: translateX(-100%) } 100% { transform: translateX(200%) } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ data, fileName, onReset }) {
  const [view, setView] = useState('overview');
  const { summary, analysis } = data;

  const riskType = s => s === 'High Risk' ? 'high' : s === 'Moderate Risk' ? 'moderate' : 'ontrack';
  const riskLabel = avg => avg < 55 ? 'High Risk' : avg < 70 ? 'Moderate Risk' : 'On Track';

  const courseName = fileName
    .replace(/\.csv$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  const navItems = ['overview', 'bottlenecks', 'students', 'recommendations', 'report'];

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: '"DM Sans", sans-serif' }}>

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 20, color: '#111827', paddingRight: 20, borderRight: '1px solid #e5e7eb', marginRight: 4, whiteSpace: 'nowrap' }}>
            CourseTwin <em style={{ color: '#2563eb' }}>AI</em>
          </div>
          <nav style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
            {navItems.map(n => (
              <button key={n} onClick={() => setView(n)} style={{ padding: '14px 14px', border: 'none', background: 'none', fontSize: 13, fontWeight: view === n ? 600 : 400, color: view === n ? '#111827' : '#9ca3af', borderBottom: view === n ? '2px solid #2563eb' : '2px solid transparent', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s, border-color 0.15s', textTransform: 'capitalize' }}>
                {n}
              </button>
            ))}
          </nav>
          <button onClick={onReset} style={{ marginLeft: 16, padding: '6px 12px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, color: '#9ca3af', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            ← New course
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Overview ── */}
        {view === 'overview' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 30, color: '#111827', marginBottom: 4 }}>{courseName}</h2>
              <p style={{ fontSize: 13, color: '#9ca3af', fontFamily: '"DM Mono", monospace' }}>
                {summary.totalStudents} students · {summary.totalConcepts} concepts tracked
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
              <StatCard label="Overall mastery" value={`${analysis.overallMastery}%`} color={analysis.overallMastery >= 80 ? '#16a34a' : analysis.overallMastery >= 70 ? '#d97706' : '#dc2626'} />
              <StatCard label="At-risk students" value={summary.studentList.filter(s => s.avg < 70).length} color="#dc2626" />
              <StatCard label="Weakest concept" value={summary.conceptList[0]?.name || '—'} small />
              <StatCard label="High risk students" value={summary.studentList.filter(s => s.avg < 55).length} color="#b91c1c" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 22px', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Priority action this week</div>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.65 }}>{analysis.urgentAction}</div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 22px' }}>
              <div style={{ fontWeight: 600, marginBottom: 18, fontSize: 14 }}>Mastery by concept</div>
              {summary.conceptList.map((c, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{c.unit} · {c.below70}/{c.total} below 70%</span>
                  </div>
                  <MasteryBar value={c.mastery} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottlenecks ── */}
        {view === 'bottlenecks' && (
          <div>
            <h2 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 30, marginBottom: 24 }}>Bottlenecks</h2>
            {summary.conceptList.map((c, i) => {
              const ai = (analysis.conceptAnalysis || []).find(a => a.name === c.name) || {};
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 22px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: '#9ca3af' }}>#{i + 1}</span>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</span>
                        <Badge label={c.unit} type="blue" />
                      </div>
                      {ai.insight && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, lineHeight: 1.6 }}>{ai.insight}</p>}
                      {ai.recommendation && (
                        <div style={{ fontSize: 13, color: '#111827', background: '#f9fafb', borderRadius: 8, padding: '10px 14px', lineHeight: 1.6, border: '1px solid #f0ede6' }}>
                          {ai.recommendation}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: c.mastery < 70 ? '#dc2626' : '#d97706' }}>{c.mastery}%</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>mastery</div>
                      </div>
                      {ai.downstreamImpact != null && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>{ai.downstreamImpact}%</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>downstream</div>
                        </div>
                      )}
                      {ai.bottleneckScore != null && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{ai.bottleneckScore}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>risk score</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Students ── */}
        {view === 'students' && (
          <div>
            <h2 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 30, marginBottom: 24 }}>Student Risk</h2>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 130px 1fr', padding: '10px 20px', borderBottom: '1px solid #e5e7eb', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', gap: 12 }}>
                <span>Student</span><span style={{ textAlign: 'center' }}>Avg</span><span style={{ textAlign: 'center' }}>Status</span><span>Recommendation</span>
              </div>
              {summary.studentList.map((s, i) => {
                const status = riskLabel(s.avg);
                const ai = (analysis.studentRisk || []).find(a => a.id === s.id);
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 130px 1fr', padding: '13px 20px', borderBottom: i < summary.studentList.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: '"DM Mono", monospace' }}>{s.id}</div>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, color: s.avg < 55 ? '#dc2626' : s.avg < 70 ? '#d97706' : '#16a34a' }}>{s.avg}%</div>
                    <div style={{ textAlign: 'center' }}><Badge label={status} type={riskType(status)} /></div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{ai?.support || `Focus on ${s.weakestConcept}`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recommendations ── */}
        {view === 'recommendations' && (
          <div>
            <h2 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 30, marginBottom: 24 }}>Recommendations</h2>
            {(analysis.recommendations || []).length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>No recommendations available.</p>
            )}
            {(analysis.recommendations || []).map((r, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 22px', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                  <Badge label={r.priority} type={r.priority === 'High' ? 'high' : r.priority === 'Medium' ? 'moderate' : 'ontrack'} />
                  <Badge label={r.type} type="blue" />
                  <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: '"DM Mono", monospace' }}>{r.audience} · {r.timing}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{r.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{r.detail}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Report ── */}
        {view === 'report' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 30 }}>Course Report</h2>
              <button
                onClick={() => {
                  const el = document.getElementById('report-text');
                  if (el) navigator.clipboard.writeText(el.innerText).catch(() => {});
                }}
                style={{ padding: '9px 18px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Copy Report
              </button>
            </div>
            <div id="report-text" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '28px 32px', fontFamily: '"DM Mono", monospace', fontSize: 13, lineHeight: 2, color: '#111827' }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Course Intelligence Report: {courseName}</div>
              <div style={{ color: '#6b7280', marginBottom: 16 }}>Overall mastery: {analysis.overallMastery}% · {summary.totalStudents} students · {summary.totalConcepts} concepts</div>

              <div style={{ fontWeight: 600, marginTop: 20, marginBottom: 6 }}>Top bottlenecks</div>
              {summary.conceptList.slice(0, 5).map((c, i) => (
                <div key={i} style={{ color: '#6b7280' }}>· {c.name}: {c.mastery}% mastery, {c.below70} of {c.total} students below 70%</div>
              ))}

              <div style={{ fontWeight: 600, marginTop: 20, marginBottom: 6 }}>Student risk summary</div>
              <div style={{ color: '#6b7280' }}>· High risk (&lt;55%): {summary.studentList.filter(s => s.avg < 55).length} students</div>
              <div style={{ color: '#6b7280' }}>· Moderate risk (55–69%): {summary.studentList.filter(s => s.avg >= 55 && s.avg < 70).length} students</div>
              <div style={{ color: '#6b7280' }}>· On track (70%+): {summary.studentList.filter(s => s.avg >= 70).length} students</div>

              <div style={{ fontWeight: 600, marginTop: 20, marginBottom: 6 }}>Priority actions</div>
              {(analysis.recommendations || []).map((r, i) => (
                <div key={i} style={{ color: '#6b7280' }}>· [{r.priority}] {r.title}</div>
              ))}

              {(analysis.nextSteps || []).length > 0 && (
                <>
                  <div style={{ fontWeight: 600, marginTop: 20, marginBottom: 6 }}>Next semester plan</div>
                  {analysis.nextSteps.map((s, i) => <div key={i} style={{ color: '#6b7280' }}>· {s}</div>)}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}

// ─── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');

  if (result) return <Dashboard data={result} fileName={fileName} onReset={() => { setResult(null); setFileName(''); }} />;
  return <UploadScreen onAnalyze={(data, name) => { setResult(data); setFileName(name); }} />;
}
