import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import tarihQuestions from './tarih_questions.json';
import dinQuestions from './din_questions.json';
import edebiyatQuestions from './edebiyat_questions.json';
import './style.css';

const DATASETS = {
  tarih: {
    label: 'Tarih',
    icon: '📚',
    questions: tarihQuestions,
  },
  din: {
    label: 'Din Kültürü',
    icon: '☪️',
    questions: dinQuestions,
  },
  edebiyat: {
    label: 'Edebiyat',
    icon: '📖',
    questions: edebiyatQuestions,
  },
};

function statsKey(subject) {
  return `calisma_stats_${subject}_v1`;
}

function loadStats(subject) {
  try {
    return JSON.parse(localStorage.getItem(statsKey(subject)) || '{}');
  } catch {
    return {};
  }
}

function saveStats(subject, stats) {
  localStorage.setItem(statsKey(subject), JSON.stringify(stats));
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fillQuestion(q, revealed) {
  const parts = String(q.question).split(/_{5,}/g);
  if (parts.length === 1) return q.question;

  const out = [];
  for (let i = 0; i < parts.length; i++) {
    out.push(<React.Fragment key={`p${i}`}>{parts[i]}</React.Fragment>);
    if (i < parts.length - 1) {
      out.push(
        <span key={`b${i}`} className={revealed ? 'answer' : 'blank'}>
          {revealed ? (q.answers?.[i] || '???') : '____________'}
        </span>
      );
    }
  }
  return out;
}

function App() {
  const [subject, setSubject] = useState(null);
  const [page, setPage] = useState('subject');
  const [stats, setStats] = useState({});
  const [session, setSession] = useState([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');

  const questions = subject ? DATASETS[subject].questions : [];
  const dataset = subject ? DATASETS[subject] : null;

  const topics = useMemo(() => {
    return [...new Set(questions.map((q) => q.topic))].sort();
  }, [questions]);

  function chooseSubject(nextSubject) {
    setSubject(nextSubject);
    setStats(loadStats(nextSubject));
    setTopic('');
    setSession([]);
    setI(0);
    setRevealed(false);
    setPage('menu');
  }

  function changeSubject() {
    setSubject(null);
    setStats({});
    setTopic('');
    setSession([]);
    setPage('subject');
  }

  function start(mode, selectedTopic) {
    let selected = [];
    let ttl = '';

    if (mode === 'topic') {
      selected = questions.filter((q) => q.topic === selectedTopic);
      ttl = selectedTopic;
    } else if (mode === 'wrong') {
      const ids = new Set(
        Object.entries(stats)
          .filter(([, record]) => record.result === 'wrong')
          .map(([id]) => id)
      );
      selected = questions.filter((q) => ids.has(q.id));
      ttl = 'Yanlış Sorular Tekrarı';
      if (!selected.length) {
        alert('Şu an tekrar edilecek yanlış soru yok.');
        return;
      }
    } else {
      selected = questions;
      ttl = 'Genel Karışık Tekrar';
    }

    setSession(shuffle(selected));
    setI(0);
    setRevealed(false);
    setTitle(ttl);
    setPage('study');
  }

  function record(ok) {
    const q = session[i];
    const nextStats = {
      ...stats,
      [q.id]: {
        subject,
        topic: q.topic,
        subtopic: q.subtopic || '',
        result: ok ? 'correct' : 'wrong',
        time: new Date().toISOString(),
      },
    };

    setStats(nextStats);
    saveStats(subject, nextStats);

    if (i + 1 >= session.length) {
      alert('Oturum bitti. Bu oturumdaki tüm sorular tamamlandı.');
      setPage('menu');
    } else {
      setI(i + 1);
      setRevealed(false);
    }
  }

  function rows() {
    const map = {};
    topics.forEach((t) => {
      map[t] = { topic: t, total: 0, seen: 0, correct: 0, wrong: 0, rate: 0 };
    });

    questions.forEach((q) => map[q.topic].total++);

    Object.values(stats).forEach((record) => {
      if (map[record.topic] && (record.result === 'correct' || record.result === 'wrong')) {
        map[record.topic].seen++;
        if (record.result === 'correct') map[record.topic].correct++;
        else map[record.topic].wrong++;
      }
    });

    Object.values(map).forEach((row) => {
      const done = row.correct + row.wrong;
      row.rate = done ? Math.round((row.correct / done) * 1000) / 10 : 0;
    });

    return Object.values(map).sort(
      (a, b) => (a.wrong === 0) - (b.wrong === 0) || b.wrong - a.wrong || a.rate - b.rate
    );
  }

  function reset() {
    if (confirm(`${dataset.label} istatistikleri silinsin mi?`)) {
      setStats({});
      saveStats(subject, {});
    }
  }

  const q = session[i];

  if (page === 'subject') {
    return (
      <main className="page">
        <section className="card">
          <h1 className="title">Çalışma Uygulaması</h1>
          <p className="subtitle">Önce çalışmak istediğin dersi seç.</p>
          <div className="subject-grid">
            {Object.entries(DATASETS).map(([key, ds]) => (
              <button key={key} className="btn subject-btn" onClick={() => chooseSubject(key)}>
                <span className="subject-icon">{ds.icon}</span>
                <span>{ds.label}</span>
                <small>{ds.questions.length} soru</small>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (page === 'menu') {
    return (
      <main className="page">
        <section className="card">
          <h1 className="title">{dataset.icon} {dataset.label} Çalışma</h1>
          <p className="subtitle">
            {questions.length} soru • {topics.length} konu • karışık tekrar sistemi
          </p>
          <button className="btn" onClick={() => setPage('topic')}>Konu Bazlı Çalış</button>
          <button className="btn" onClick={() => start('all')}>Tüm Konuları Karışık Tekrar Et</button>
          <button className="btn bad" onClick={() => start('wrong')}>Yanlış Yaptığım Soruları Çalış</button>
          <button className="btn ghost" onClick={() => setPage('stats')}>İstatistikler ve Zayıf Konular</button>
          <button className="btn ghost" onClick={changeSubject}>Ders Değiştir</button>
          <p className="note">Kural: Her oturumda sorular rastgele karıştırılır ve aynı soru ikinci kez çıkmaz.</p>
        </section>
      </main>
    );
  }

  if (page === 'topic') {
    return (
      <main className="page">
        <section className="card">
          <h1 className="title">Konu Seç</h1>
          <p className="subtitle">Seçilen konudaki tüm sorular karışık sırayla gelir.</p>
          <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Konu seç</option>
            {topics.map((t) => (
              <option key={t} value={t}>{t} ({questions.filter((q) => q.topic === t).length} soru)</option>
            ))}
          </select>
          <button className="btn" disabled={!topic} onClick={() => start('topic', topic)}>Bu Konuyu Çalış</button>
          <button className="btn ghost" onClick={() => setPage('menu')}>Ana Menü</button>
        </section>
      </main>
    );
  }

  if (page === 'stats') {
    return (
      <main className="page">
        <section className="card">
          <h1 className="title">İstatistikler</h1>
          <p className="subtitle">Tek seferlik tutulur: Her soru için yalnızca son sonuç sayılır. Yanlışlar doğru yapılınca listeden düşer.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Konu</th><th>Soru</th><th>Çalışılan</th><th>Doğru</th><th>Yanlışta Duran</th><th>Başarı %</th></tr>
              </thead>
              <tbody>
                {rows().map((r) => (
                  <tr key={r.topic}><td>{r.topic}</td><td>{r.total}</td><td>{r.seen}</td><td>{r.correct}</td><td>{r.wrong}</td><td>{r.rate}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={() => setPage('menu')}>Ana Menü</button>
            <button className="btn bad" onClick={() => start('wrong')}>Yanlış Soruları Çalış</button>
            <button className="btn ghost" onClick={reset}>İstatistikleri Sıfırla</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card">
        <div className="topbar">
          <h1 className="title">{title}</h1>
          <div className="counter">{i + 1} / {session.length}</div>
        </div>
        <div className="progress"><div style={{ width: `${(i / session.length) * 100}%` }} /></div>
        <section className="card study-card">
          <p className="subtitle">{q?.subtopic || ''}</p>
          <div className="question">{q && fillQuestion(q, revealed)}</div>
        </section>
        <div className="row">
          {!revealed ? (
            <button className="btn" onClick={() => setRevealed(true)}>Cevabı Yerine Koy</button>
          ) : (
            <>
              <button className="btn good" onClick={() => record(true)}>Doğru Yaptım</button>
              <button className="btn bad" onClick={() => record(false)}>Yanlış Yaptım</button>
            </>
          )}
          <button className="btn ghost" onClick={() => setPage('menu')}>Ana Menü</button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
