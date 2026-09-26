// (ล็อกอิน / Navbar / อัปโหลด / ค้นหา / ออกจากระบบ)

(function () {
  'use strict';

  /* ================= 1. ค่าคงที่ ================= */
  const USER_KEY = 'snapfind_user';
  const DATA_KEY = 'snapfind_records';

  const SUBJECTS = [
    'คณิตศาสตร์พื้นฐาน', 'คณิตศาสตร์เพิ่มเติม', 'วิทยาศาสตร์', 'ชีววิทยา',
    'ฟิสิกส์', 'เคมี', 'ประวัติศาสตร์', 'สังคมศึกษา', 'สุขศึกษา',
    'ภาษาไทย', 'ภาษาอังกฤษ'
  ];

  const PAGES = ['login', 'home', 'upload', 'search', 'logout'];

  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ================= 2. เก็บข้อมูล ================= */
  const Store = {
    setUser(email) {
      localStorage.setItem(USER_KEY, JSON.stringify({ email, at: Date.now() }));
    },
    getUser() {
      try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) { return null; }
    },
    clearUser() { localStorage.removeItem(USER_KEY); },

    getRecords() {
      try { return JSON.parse(localStorage.getItem(DATA_KEY)) || []; } catch (e) { return []; }
    },
    saveRecord(rec) {
      const list = this.getRecords();
      rec.id = 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      rec.createdAt = new Date().toISOString();
      list.push(rec);
      localStorage.setItem(DATA_KEY, JSON.stringify(list));
      return rec.id;
    },
    deleteRecord(id) {
      const list = this.getRecords().filter(r => r.id !== id);
      localStorage.setItem(DATA_KEY, JSON.stringify(list));
    },
    findBySubject(keyword) {
      const key = String(keyword || '').trim().toLowerCase();
      if (!key) return [];
      return this.getRecords()
        .filter(r => (r.subject || '').toLowerCase().includes(key))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  /* ================= 3. ตัวช่วย ================= */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function icon(id, cls) {
    return '<svg class="ic ' + (cls || '') + '"><use href="#' + id + '"></use></svg>';
  }
  function readFiles(fileList) {
    const files = Array.from(fileList || []);
    return Promise.all(files.map(f => new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload  = () => resolve({ name: f.name, type: f.type, size: f.size, data: fr.result });
      fr.onerror = () => reject(new Error('อ่านไฟล์ ' + f.name + ' ไม่สำเร็จ'));
      fr.readAsDataURL(f);
    })));
  }
  function thaiDate(iso) {
    return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  }

  /* ================= 4. เราเตอร์ ================= */
  function currentRoute() {
    const hash = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return PAGES.includes(hash) ? hash : '';
  }

  function render() {
    const logged = !!Store.getUser();
    let route = currentRoute();

    if (!logged) route = 'login';
    else if (!route || route === 'login') route = 'home';

    // แสดงเฉพาะหน้าที่ต้องการ
    PAGES.forEach(p => {
      const el = document.getElementById('page-' + p);
      if (el) el.hidden = (p !== route);
    });

    // navbar
    const nav = $('#navbar');
    nav.hidden = !logged;
    $$('.nav-link').forEach(a => {
      const on = a.dataset.nav === route;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    // แก้ hash ให้ตรงกับหน้าที่แสดงจริง
    const want = '#/' + route;
    if (logged && location.hash !== want) history.replaceState(null, '', want);
    if (!logged && location.hash) history.replaceState(null, '', location.pathname);

    document.title = 'SnapFind | ' + ({
      login: 'เข้าสู่ระบบ', home: 'หน้าหลัก', upload: 'อัปโหลด',
      search: 'ค้นหา', logout: 'ออกจากระบบ'
    })[route];

    if (route === 'home')   onEnterHome();
    if (route === 'logout') resetLogout();
    window.scrollTo({ top: 0 });
  }

  function go(route) {
    if (location.hash === '#/' + route) render();
    else location.hash = '#/' + route;
  }

  /* ================= 5. หน้าล็อกอิน ================= */
  function initLogin() {
    $('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const msg   = $('#loginMsg');
      const email = $('#email').value.trim();
      const pass  = $('#password').value;

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        msg.textContent = 'รูปแบบอีเมลไม่ถูกต้อง'; return;
      }
      if (pass.length < 6) {
        msg.textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'; return;
      }

      msg.textContent = '';
      Store.setUser(email);
      this.reset();
      go('home');
    });
  }

  /* ================= 6. หน้าหลัก ================= */
  function initHome() {
  const logo = $('#mainLogo');
  const fail = () => { logo.hidden = true; $('#logoHint').hidden = false; };
  logo.addEventListener('error', fail);
  if (logo.complete && logo.naturalWidth === 0) fail();   // เช็กย้อนหลัง
}
  function onEnterHome() {
  const user = Store.getUser();
  const n = Store.getRecords().length;
  $('#homeStat').textContent =
   (user ? 'เข้าสู่ระบบในชื่อ ' + user.email + ' • ' : '') + 'มีข้อมูลที่บันทึกไว้ ' + n + ' รายการ';
}

  /* ================= 7. หน้าอัปโหลด ================= */
  function initUpload() {
    const sel = $('#subjectInput');
    SUBJECTS.forEach(s => sel.add(new Option(s, s)));

    const imageInput  = $('#imageInput');
    const fileInput   = $('#fileInput');
    const imgPreview  = $('#imagePreview');
    const filePreview = $('#filePreview');
    const msg         = $('#uploadMsg');
    const successBox  = $('#successBox');
    const form        = $('#uploadForm');

    imageInput.addEventListener('change', function () {
      imgPreview.innerHTML = '';
      Array.from(imageInput.files).forEach(f => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.alt = f.name;
        img.onload = () => URL.revokeObjectURL(img.src);
        imgPreview.appendChild(img);
      });
    });

    fileInput.addEventListener('change', function () {
      filePreview.innerHTML = '';
      Array.from(fileInput.files).forEach(f => {
        const li = document.createElement('li');
        li.textContent = f.name + '  (' + (f.size / 1024).toFixed(1) + ' KB)';
        filePreview.appendChild(li);
      });
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      msg.textContent = '';
      successBox.hidden = true;

      const name    = $('#nameInput').value.trim();
      const subject = sel.value;

      if (!name)    { msg.textContent = 'กรุณากรอกชื่อ'; return; }
      if (!subject) { msg.textContent = 'กรุณาเลือกวิชา'; return; }
      if (!imageInput.files.length && !fileInput.files.length) {
        msg.textContent = 'กรุณาเพิ่มรูปภาพหรือไฟล์อย่างน้อย 1 รายการ'; return;
      }

      const btn = form.querySelector('button[type=submit]');
      const old = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'กำลังบันทึก...';

      try {
        const images = await readFiles(imageInput.files);
        const files  = await readFiles(fileInput.files);
        Store.saveRecord({ name, subject, images, files });

        successBox.hidden = false;
        successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

        form.reset();
        imgPreview.innerHTML = '';
        filePreview.innerHTML = '';
      } catch (err) {
        msg.textContent = 'บันทึกไม่สำเร็จ: ไฟล์อาจมีขนาดใหญ่เกินพื้นที่จัดเก็บของเบราว์เซอร์';
      } finally {
        btn.disabled = false;
        btn.innerHTML = old;
      }
    });
  }

  /* ================= 8. หน้าค้นหา ================= */
  function initSearch() {
    const dl     = $('#subjectList');
    SUBJECTS.forEach(s => dl.appendChild(new Option(s, s)));

    const chipRow = $('#chipRow');
    SUBJECTS.forEach(s => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = s;
      b.addEventListener('click', () => { $('#searchInput').value = s; doSearch(); });
      chipRow.appendChild(b);
    });

    $('#searchForm').addEventListener('submit', e => { e.preventDefault(); doSearch(); });

    $('#closeModal').addEventListener('click', closeDetail);
    $('#detailModal').addEventListener('click', e => { if (e.target.id === 'detailModal') closeDetail(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });
  }

  function doSearch() {
    const status  = $('#searchStatus');
    const list    = $('#resultList');
    const keyword = $('#searchInput').value.trim();

    list.innerHTML = '';
    status.hidden = false;

    if (!keyword) {
      status.className = 'status-box status-fail';
      status.textContent = '❌ กรุณาพิมพ์ชื่อวิชาที่ต้องการค้นหา';
      return;
    }

    const found = Store.findBySubject(keyword);

    if (!found.length) {
      status.className = 'status-box status-fail';
      status.textContent = '❌ ไม่พบข้อมูล';
      return;
    }

    status.className = 'status-box status-ok';
    status.textContent = '✅ พบข้อมูล ' + found.length + ' รายการ (คลิกการ์ดเพื่อดูรูปภาพและไฟล์)';

    found.forEach(rec => {
      const imgs = rec.images || [], files = rec.files || [];
      const thumb = imgs[0]
        ? '<img class="result-thumb" src="' + imgs[0].data + '" alt="">'
        : '<div class="thumb-empty">' + icon('ic-file') + '</div>';

      const card = document.createElement('article');
      card.className = 'result-card';
      card.tabIndex = 0;
      card.innerHTML =
        thumb +
        '<span class="tag">' + esc(rec.subject) + '</span>' +
        '<h4>' + esc(rec.name) + '</h4>' +
        '<p class="meta">' + icon('ic-image') + imgs.length + ' รูป &nbsp;' +
        icon('ic-file') + files.length + ' ไฟล์</p>' +
        '<p class="meta">' + thaiDate(rec.createdAt) + '</p>';
      card.addEventListener('click', () => openDetail(rec));
      card.addEventListener('keydown', ev => { if (ev.key === 'Enter') openDetail(rec); });
      list.appendChild(card);
    });
  }

  function openDetail(rec) {
    const imgs = rec.images || [], files = rec.files || [];
    $('#detailTitle').textContent = rec.name + ' — ' + rec.subject;

    let html = '<h4>' + icon('ic-image') + 'รูปภาพ</h4>';
    html += imgs.length
      ? imgs.map(i => '<img src="' + i.data + '" alt="' + esc(i.name) + '">').join('')
      : '<p class="empty-note">ไม่มีรูปภาพ</p>';

    html += '<h4>' + icon('ic-file') + 'ไฟล์แนบ</h4>';
    html += files.length
      ? files.map(f => '<a class="dl-link" href="' + f.data + '" download="' + esc(f.name) + '">' +
          icon('ic-download') + esc(f.name) + '</a>').join('')
      : '<p class="empty-note">ไม่มีไฟล์แนบ</p>';

    html += '<div class="modal-foot"><button type="button" class="btn btn-danger" id="delRec">' +
            icon('ic-trash') + 'ลบรายการนี้</button></div>';

    $('#detailBody').innerHTML = html;
    $('#detailModal').hidden = false;

    $('#delRec').addEventListener('click', function () {
      if (!confirm('ยืนยันลบ "' + rec.name + '" ?')) return;
      Store.deleteRecord(rec.id);
      closeDetail();
      doSearch();
    });
  }

  function closeDetail() {
    $('#detailModal').hidden = true;
    $('#detailBody').innerHTML = '';
  }

  /* ================= 9. หน้าออกจากระบบ ================= */
  function initLogout() {
    $('#logoutBtn').addEventListener('click', function () {
      Store.clearUser();
      this.disabled = true;
      $('#logoutDone').hidden = false;
      setTimeout(() => { render(); }, 1200);
    });
  }
  function resetLogout() {
    $('#logoutBtn').disabled = false;
    $('#logoutDone').hidden = true;
  }

  /* ================= 10. เริ่มระบบ ================= */
  document.addEventListener('DOMContentLoaded', function () {
    initLogin();
    initHome();
    initUpload();
    initSearch();
    initLogout();

    window.addEventListener('hashchange', render);
    render();
  });
})();
