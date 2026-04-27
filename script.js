/* ═══════════════════════════════════════════════
   CARESTROKE – script.js
   ═══════════════════════════════════════════════ */

'use strict';

// ── Storage Helper ──────────────────────────────
const store = (() => {
  const ok = (() => {
    try { localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return true; }
    catch { return false; }
  })();
  return {
    get(k)    { try { return ok ? localStorage.getItem(k) : null; } catch { return null; } },
    set(k, v) { try { if (ok) localStorage.setItem(k, v); } catch {} },
    del(k)    { try { if (ok) localStorage.removeItem(k); } catch {} },
  };
})();

function parse(raw, fb) { try { return raw ? JSON.parse(raw) : fb; } catch { return fb; } }

// ── App State ────────────────────────────────────
const KEY = { users: 'cs_users', user: 'cs_user', records: 'cs_records' };
let users   = parse(store.get(KEY.users),   []);
let session = parse(store.get(KEY.user),    null);
let records = parse(store.get(KEY.records), []);

function saveUsers()   { store.set(KEY.users,   JSON.stringify(users));   }
function saveRecords() { store.set(KEY.records, JSON.stringify(records)); }

// ── DOM Refs ─────────────────────────────────────
const $ = id => document.getElementById(id);
const screens = {
  splash:   $('splashScreen'),
  login:    $('loginScreen'),
  register: $('registerScreen'),
  main:     $('mainScreen'),
};

// ── Screen / View Switching ──────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo(0, 0);
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = $(viewId);
  if (el) el.classList.add('active');

  // sync bottom nav
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewId);
  });

  // render on demand
  if (viewId === 'dashboardView') renderDashboard();
  if (viewId === 'historyView')   renderHistory();
  if (viewId === 'educationView') renderEducation('nutrisi');
  if (viewId === 'monitoringView') resetMonitoringForm();
}

// ── Toast ────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'default') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ── Loading Bar ──────────────────────────────────
function runLoading({ label = 'Memproses…', ms = 900, done }) {
  const overlay = $('loadingOverlay');
  const fill    = $('loadingFill');
  const pct     = $('loadingPct');
  const lbl     = $('loadingLabel');

  lbl.textContent = label;
  overlay.classList.remove('hidden');
  fill.style.width = '0%';

  const start = performance.now();
  const tick = now => {
    const t = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - t, 3);
    const p = Math.round(e * 100);
    fill.style.width = p + '%';
    pct.textContent  = p + '%';
    if (t < 1) requestAnimationFrame(tick);
    else setTimeout(() => {
      overlay.classList.add('hidden');
      fill.style.width = '0%';
      if (done) done();
    }, 100);
  };
  requestAnimationFrame(tick);
}

function showWelcomeOverlay(done) {
  const overlay = $('welcomeOverlay');
  if (!overlay) {
    done && done();
    return;
  }

  overlay.classList.remove('hidden', 'closing');
  setTimeout(() => {
    overlay.classList.add('closing');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('closing');
      done && done();
    }, 350);
  }, 1500);
}

// ── Splash Boot ──────────────────────────────────
(function boot() {
  const fill = $('splashFill');
  const pct  = $('splashPct');
  const ms   = 1800;
  const start = performance.now();

  const tick = now => {
    const t = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - t, 3);
    const p = Math.round(e * 100);
    fill.style.width = p + '%';
    pct.textContent  = 'Memuat… ' + p + '%';
    if (t < 1) requestAnimationFrame(tick);
    else {
      if (session) {
        showScreen('main');
        $('welcomeMsg').textContent = 'Halo, ' + (session.name || session.id) + '!';
        showView('dashboardView');
      } else {
        showWelcomeOverlay(() => showScreen('login'));
      }
    }
  };
  requestAnimationFrame(tick);
})();

// ── Auth: Login ──────────────────────────────────
$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const id   = $('loginId').value.trim();
  const pass = $('loginPass').value.trim();
  let valid  = true;

  $('loginIdErr').textContent   = '';
  $('loginPassErr').textContent = '';

  if (!id)   { $('loginIdErr').textContent   = 'Email/No HP wajib diisi.'; valid = false; }
  if (!pass) { $('loginPassErr').textContent = 'Password wajib diisi.';    valid = false; }
  if (!valid) return;

  runLoading({ label: 'Memeriksa akun…', ms: 800, done: () => {
    const user = users.find(u => u.id.toLowerCase() === id.toLowerCase());
    if (!user) {
      $('loginIdErr').textContent = 'Akun tidak ditemukan. Silakan daftar.';
      return;
    }
    if (user.pass !== pass) {
      $('loginPassErr').textContent = 'Password salah.';
      return;
    }
    session = { id: user.id, name: user.name };
    store.set(KEY.user, JSON.stringify(session));
    $('welcomeMsg').textContent = 'Halo, ' + user.name + '!';
    showScreen('main');
    showView('dashboardView');
    toast('Selamat datang, ' + user.name + '!', 'success');
  }});
});

$('goRegisterBtn').addEventListener('click', () => showScreen('register'));

// ── Auth: Register ───────────────────────────────
$('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('regName').value.trim();
  const id   = $('regId').value.trim();
  const pass = $('regPass').value.trim();
  let valid  = true;

  ['regNameErr','regIdErr','regPassErr'].forEach(x => $(x).textContent = '');

  if (!name)         { $('regNameErr').textContent = 'Nama wajib diisi.';                valid = false; }
  if (!id)           { $('regIdErr').textContent   = 'Email/No HP wajib diisi.';         valid = false; }
  if (pass.length < 6) { $('regPassErr').textContent = 'Password minimal 6 karakter.';  valid = false; }
  if (!valid) return;

  runLoading({ label: 'Membuat akun…', ms: 900, done: () => {
    if (users.find(u => u.id.toLowerCase() === id.toLowerCase())) {
      $('regIdErr').textContent = 'Akun sudah terdaftar. Silakan login.';
      return;
    }
    users.push({ id, name, pass });
    saveUsers();
    showScreen('login');
    $('loginForm').reset();
    $('loginId').value = id;
    $('loginPass').focus();
    toast('Akun berhasil dibuat. Silakan login untuk masuk.', 'success');
    $('registerForm').reset();
  }});
});

$('goLoginBtn').addEventListener('click', () => showScreen('login'));

document.getElementById('forgotHint') && document.getElementById('forgotHint').addEventListener('click', () => {
  toast('Silakan hubungi admin atau caregiver untuk reset password.', 'default');
});

// ── Logout ───────────────────────────────────────
$('logoutBtn').addEventListener('click', () => {
  store.del(KEY.user);
  session = null;
  showScreen('login');
  $('loginForm').reset();
  toast('Anda telah keluar.', 'default');
});

// ── Toggle Password Visibility ───────────────────
document.querySelectorAll('.toggle-pass').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = $(btn.dataset.target);
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
  });
});

// ── Navigation ───────────────────────────────────
document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

// ── Dashboard Render ─────────────────────────────
function renderDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  $('todayDate').textContent = formatDate(today);

  const todayRec = records.filter(r => r.date === today);
  $('statToday').textContent = todayRec.length || '–';
  $('statTotal').textContent = records.length;

  const latest = records[records.length - 1];
  if (latest) {
    const risk = analyzeRisk(latest);
    $('statRisk').textContent = risk.level === 'low' ? 'Rendah' : risk.level === 'medium' ? 'Sedang' : 'Tinggi';
    const box = $('riskAlert');
    box.className = 'risk-box ' + risk.level;
    box.textContent = risk.msg;
    box.classList.remove('hidden');
  } else {
    $('statRisk').textContent = '–';
    $('riskAlert').classList.add('hidden');
  }

  renderReminders();
}

function renderReminders() {
  const list = $('reminderList');
  const items = [
    'Obat pagi dan malam tepat waktu',
    'Latihan ROM minimal 1 sesi hari ini',
    'Reposisi tiap 2 jam untuk cegah luka tekan',
    'Pantau teknik makan aman untuk cegah tersedak',
  ];
  list.innerHTML = items.map(t => `<div class="reminder-item">${t}</div>`).join('');
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

// ── Risk Analysis ────────────────────────────────
function analyzeRisk(rec) {
  const alerts = [];
  let level = 'low';

  if (rec.awareness === 'Menurun') {
    alerts.push('Penurunan kesadaran terdeteksi.');
    level = 'high';
  }
  if (rec.painScale >= 8) {
    alerts.push('Nyeri berat, evaluasi medis dianjurkan.');
    level = 'high';
  }
  if (rec.bodyCondition === 'Nyeri Berat') {
    alerts.push('Kondisi tubuh nyeri berat.');
    if (level !== 'high') level = 'medium';
  }
  if (rec.nutrition === 'Kurang') {
    alerts.push('Nutrisi kurang, tingkatkan asupan bergizi.');
    if (level === 'low') level = 'medium';
  }
  if (!rec.chkMeal || !rec.chkMed) {
    alerts.push('Kepatuhan makan/obat belum optimal.');
    if (level === 'low') level = 'medium';
  }

  const msg = alerts.length
    ? '⚠️ ' + alerts.join(' ')
    : '✅ Kondisi stabil. Lanjutkan perawatan rutin.';

  return { level, msg, alerts };
}

// ── Monitoring – Multi-step Form ─────────────────
let currentStep = 1;
const TOTAL_STEPS = 4;

function resetMonitoringForm() {
  $('monitoringForm').reset();
  $('painValue').textContent = '0';
  $('painEmoji').textContent = '😊';
  $('analysisPreview').classList.add('hidden');
  $('analysisPreview').className = 'analysis-box hidden';
  goToStep(1);
}

function goToStep(n) {
  currentStep = n;
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const stepEl = $('step' + i);
    const indEl  = document.querySelector('.step[data-step="' + i + '"]');
    if (stepEl) stepEl.classList.toggle('active', i === n);
    if (indEl) {
      indEl.classList.remove('active', 'done');
      if (i < n)  indEl.classList.add('done');
      if (i === n) indEl.classList.add('active');
    }
  }
  // step lines
  document.querySelectorAll('.step-line').forEach((line, idx) => {
    line.classList.toggle('done', idx < n - 1);
  });
}

// Pain slider
$('painScale').addEventListener('input', function() {
  const v = parseInt(this.value);
  $('painValue').textContent = v;
  const emojis = ['😊','😊','🙂','😐','😕','😟','😣','😖','😫','😩','😭'];
  $('painEmoji').textContent = emojis[v] || '😭';
});

// Step 1 → 2
$('nextStep1').addEventListener('click', () => {
  const cond = $('bodyCondition').value;
  const aware = $('awareness').value;
  let ok = true;
  $('bodyConditionErr').textContent = '';
  $('awarenessErr').textContent = '';
  if (!cond)  { $('bodyConditionErr').textContent = 'Pilih kondisi tubuh.'; ok = false; }
  if (!aware) { $('awarenessErr').textContent = 'Pilih tingkat kesadaran.'; ok = false; }
  if (ok) goToStep(2);
});

// Step 2 → 1
$('prevStep2').addEventListener('click', () => goToStep(1));
// Step 2 → 3
$('nextStep2').addEventListener('click', () => {
  const act = $('activity').value.trim();
  const med = $('medication').value.trim();
  let ok = true;
  $('activityErr').textContent  = '';
  $('medicationErr').textContent = '';
  if (!act) { $('activityErr').textContent  = 'Aktivitas wajib diisi.'; ok = false; }
  if (!med) { $('medicationErr').textContent = 'Konsumsi obat wajib diisi.'; ok = false; }
  if (ok) goToStep(3);
});

// Step 3 → 2
$('prevStep3').addEventListener('click', () => goToStep(2));
// Step 3 → 4
$('nextStep3').addEventListener('click', () => {
  const food = $('foodIntake').value.trim();
  const nutr = $('nutrition').value;
  let ok = true;
  $('foodIntakeErr').textContent = '';
  $('nutritionErr').textContent  = '';
  if (!food) { $('foodIntakeErr').textContent = 'Asupan makanan wajib diisi.'; ok = false; }
  if (!nutr) { $('nutritionErr').textContent  = 'Pilih status nutrisi.'; ok = false; }
  if (ok) {
    goToStep(4);
    showAnalysisPreview();
  }
});

// Step 4 → 3
$('prevStep4').addEventListener('click', () => goToStep(3));

function showAnalysisPreview() {
  const draft = collectFormData();
  const risk  = analyzeRisk(draft);
  const box   = $('analysisPreview');
  box.className = 'analysis-box ' + (risk.level === 'low' ? 'safe' : risk.level === 'medium' ? 'warn' : 'danger');
  box.innerHTML = '<strong>Pratinjau Analisis Sistem:</strong><br>' + risk.msg;
  box.classList.remove('hidden');
}

function collectFormData() {
  return {
    date:          new Date().toISOString().slice(0, 10),
    bodyCondition: $('bodyCondition').value,
    awareness:     $('awareness').value,
    painScale:     parseInt($('painScale').value) || 0,
    bloodPressure: $('bloodPressure').value.trim() || '–',
    activity:      $('activity').value.trim(),
    medication:    $('medication').value.trim(),
    foodIntake:    $('foodIntake').value.trim(),
    nutrition:     $('nutrition').value,
    chkRom:        $('chkRom').checked,
    chkReposition: $('chkReposition').checked,
    chkMeal:       $('chkMeal').checked,
    chkMed:        $('chkMed').checked,
  };
}

// Submit
$('monitoringForm').addEventListener('submit', e => {
  e.preventDefault();
  const data = collectFormData();
  const risk = analyzeRisk(data);

  runLoading({ label: 'Menyimpan data…', ms: 800, done: () => {
    records.push(data);
    saveRecords();

    if (risk.level === 'high') {
      toast('⚠️ Tanda bahaya terdeteksi! Pertimbangkan konsultasi medis segera.', 'danger');
    } else if (risk.level === 'medium') {
      toast('⚠️ Ada beberapa hal yang perlu diperhatikan. Cek edukasi.', 'warning');
    } else {
      toast('✅ Data berhasil disimpan. Kondisi stabil!', 'success');
    }

    // redirect: jika nutrisi kurang atau ROM belum → edukasi, else → riwayat
    if (data.nutrition === 'Kurang' || !data.chkRom) {
      showView('educationView');
    } else {
      showView('historyView');
    }
  }});
});

// ── History Render ───────────────────────────────
function renderHistory() {
  const list = $('historyList');
  if (!records.length) {
    list.innerHTML = `
      <div class="history-empty">
        <span class="empty-icon">🗂️</span>
        Belum ada catatan harian.<br>Mulai dari menu Monitoring.
      </div>`;
    return;
  }

  list.innerHTML = records.slice().reverse().map(r => {
    const risk = analyzeRisk(r);
    const badgeClass = risk.level === 'low' ? 'risk-low-badge' : risk.level === 'medium' ? 'risk-medium-badge' : 'risk-high-badge';
    const cardClass  = 'history-card risk-' + risk.level;
    const checks = [
      r.chkRom        ? '✅ ROM'       : '❌ ROM',
      r.chkReposition ? '✅ Reposisi'  : '❌ Reposisi',
      r.chkMeal       ? '✅ Makan'     : '❌ Makan',
      r.chkMed        ? '✅ Obat'      : '❌ Obat',
    ].join(' · ');

    return `
      <div class="${cardClass}">
        <div class="history-date">${formatDate(r.date)}</div>
        <div class="history-row"><span>Kondisi</span><span>${r.bodyCondition}</span></div>
        <div class="history-row"><span>Kesadaran</span><span>${r.awareness}</span></div>
        <div class="history-row"><span>Skala Nyeri</span><span>${r.painScale}/10</span></div>
        <div class="history-row"><span>Tekanan Darah</span><span>${r.bloodPressure}</span></div>
        <div class="history-row"><span>Aktivitas</span><span>${r.activity}</span></div>
        <div class="history-row"><span>Obat</span><span>${r.medication}</span></div>
        <div class="history-row"><span>Makanan</span><span>${r.foodIntake}</span></div>
        <div class="history-row"><span>Nutrisi</span><span>${r.nutrition}</span></div>
        <div class="history-row"><span>Checklist</span><span style="font-size:12px">${checks}</span></div>
        <span class="history-risk ${badgeClass}">
          Risiko: ${risk.level === 'low' ? 'Rendah' : risk.level === 'medium' ? 'Sedang' : 'Tinggi'}
        </span>
      </div>`;
  }).join('');
}

// ── Education Content ────────────────────────────
const EDU_DATA = {
  nutrisi: [
    {
      badge: 'Panduan Nutrisi',
      title: '🥗 Nutrisi untuk Pasien Stroke',
      body: 'Pilih makanan lunak, tinggi protein, dan cukup cairan sesuai rekomendasi dokter.',
      list: [
        'Makanan lunak: bubur, sup, pure sayuran',
        'Tinggi protein: telur, ikan, tahu, tempe',
        'Hindari makanan asin dan berlemak tinggi',
        'Minum air putih minimal 6–8 gelas/hari',
        'Porsi kecil tapi sering (5–6x sehari)',
      ],
    },
    {
      badge: 'Perhatian',
      title: '⚠️ Tanda Disfagia (Kesulitan Menelan)',
      body: 'Waspadai tanda-tanda berikut saat pasien makan:',
      list: [
        'Batuk atau tersedak saat makan/minum',
        'Suara serak setelah makan',
        'Makanan keluar dari mulut',
        'Segera konsultasikan ke dokter jika terjadi',
      ],
    },
  ],
  latihan: [
    {
      badge: 'Latihan ROM',
      title: '🏃 Latihan Range of Motion (ROM)',
      body: 'Latihan rentang gerak untuk mencegah kekakuan sendi dan meningkatkan sirkulasi.',
      list: [
        'Lakukan 2x sehari, pagi dan sore',
        'Setiap gerakan diulang 10–15 kali',
        'Mulai dari sendi bahu, siku, pergelangan tangan',
        'Lanjut ke pinggul, lutut, dan pergelangan kaki',
        'Lakukan perlahan, jangan paksa jika ada nyeri',
      ],
      link: { href: 'https://youtu.be/7d4tu1SrM90', label: '▶ Tonton Video Panduan ROM' },
    },
    {
      badge: 'Latihan Duduk',
      title: '🪑 Latihan Duduk & Keseimbangan',
      body: 'Latihan duduk membantu meningkatkan keseimbangan dan kekuatan otot inti.',
      list: [
        'Duduk di tepi tempat tidur dengan bantuan',
        'Pertahankan posisi 5–10 menit',
        'Tingkatkan durasi secara bertahap',
        'Selalu ada pendamping saat latihan',
      ],
    },
  ],
  kulit: [
    {
      badge: 'Pencegahan Dekubitus',
      title: '🛡️ Pencegahan Luka Tekan (Dekubitus)',
      body: 'Luka tekan terjadi akibat tekanan berkepanjangan pada kulit. Pencegahan sangat penting.',
      list: [
        'Ubah posisi pasien setiap 2 jam',
        'Periksa area tulang menonjol: tumit, sakrum, siku, bahu',
        'Gunakan bantal atau matras anti-dekubitus',
        'Jaga kulit tetap bersih dan kering',
        'Oleskan losion/pelembab pada kulit kering',
      ],
    },
    {
      badge: 'Perawatan Kulit',
      title: '🧴 Perawatan Kulit Harian',
      body: 'Kulit yang sehat mencegah infeksi dan komplikasi.',
      list: [
        'Lap badan dengan air hangat setiap hari',
        'Keringkan lipatan kulit dengan lembut',
        'Ganti pakaian dan linen secara rutin',
        'Segera lapor jika ada kemerahan atau luka',
      ],
    },
  ],
  makan: [
    {
      badge: 'Teknik Makan Aman',
      title: '🍽️ Teknik Makan Aman untuk Pasien Stroke',
      body: 'Teknik makan yang benar mencegah tersedak dan aspirasi.',
      list: [
        'Posisikan pasien duduk tegak 90 derajat',
        'Kepala sedikit menunduk saat menelan',
        'Berikan porsi kecil, satu sendok per suap',
        'Tunggu pasien selesai menelan sebelum suap berikutnya',
        'Jangan berbicara saat makan',
        'Tetap duduk 30 menit setelah makan',
      ],
    },
    {
      badge: 'Tekstur Makanan',
      title: '🥣 Panduan Tekstur Makanan',
      body: 'Sesuaikan tekstur makanan dengan kemampuan menelan pasien.',
      list: [
        'Level 1: Cair (jus, susu, air)',
        'Level 2: Kental (yogurt, puding)',
        'Level 3: Lunak (bubur, pure)',
        'Level 4: Cincang halus',
        'Konsultasikan dengan ahli gizi/dokter',
      ],
    },
  ],
  darurat: [
    {
      badge: 'danger',
      title: '🚨 Tanda Bahaya – Segera Hubungi Dokter',
      body: 'Bawa pasien ke IGD atau hubungi 119 jika terjadi:',
      list: [
        'Penurunan kesadaran mendadak',
        'Kelemahan atau kelumpuhan tiba-tiba',
        'Bicara pelo atau tidak bisa bicara',
        'Sakit kepala hebat mendadak',
        'Gangguan penglihatan mendadak',
        'Kejang',
      ],
    },
    {
      badge: 'Kontak Darurat',
      title: '📞 Nomor Darurat',
      body: '',
      list: [
        'Ambulans / IGD: 119',
        'Hotline Kemenkes: 1500-567',
        'Catat nomor dokter keluarga di tempat mudah terlihat',
      ],
    },
  ],
};

function renderEducation(tab) {
  // sync tabs
  document.querySelectorAll('.edu-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  const cards = EDU_DATA[tab] || [];
  $('eduContent').innerHTML = cards.map(c => {
    const badgeClass = c.badge === 'danger' ? 'edu-badge danger' : 'edu-badge';
    const listHtml = c.list.length
      ? '<ul>' + c.list.map(i => `<li>${i}</li>`).join('') + '</ul>'
      : '';
    const linkHtml = c.link
      ? `<a href="${c.link.href}" target="_blank" rel="noopener noreferrer">${c.link.label}</a>`
      : '';
    return `
      <div class="edu-card">
        <span class="${badgeClass}">${c.badge}</span>
        <h4>${c.title}</h4>
        ${c.body ? `<p>${c.body}</p>` : ''}
        ${listHtml}
        ${linkHtml}
      </div>`;
  }).join('');
}

document.querySelectorAll('.edu-tab').forEach(tab => {
  tab.addEventListener('click', () => renderEducation(tab.dataset.tab));
});

// ── Auto Reminders ───────────────────────────────
setInterval(() => {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  if (m !== 0 || !session) return;
  if ([7,12,19].includes(h))  toast('🍽️ Waktunya makan pasien!', 'default');
  if ([8,18].includes(h))     toast('💊 Waktunya minum obat!', 'warning');
  if ([10,14].includes(h))    toast('🏃 Waktunya latihan ROM & reposisi!', 'default');
}, 60000);

// ── Service Worker Registration ──────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[CareStroke] SW registered:', reg.scope))
      .catch(err => console.error('[CareStroke] SW failed:', err));
  });
}

// ── Init ─────────────────────────────────────────
if (!store.get(KEY.users)) {
  // no-op, fresh start
}
