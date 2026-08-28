(() => {
  'use strict';

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') root.setAttribute('data-theme', stored);
  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    const isDark = current === 'dark' ||
      (current !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- render ---------- */
  fetch('assets/data.json')
    .then(r => r.json())
    .then(render)
    .catch(() => {
      document.getElementById('app-grid').append(
        el('li', 'work-item', 'データを読み込めませんでした。時間をおいて再度お試しください。')
      );
    });

  function render(data) {
    renderProfile(data.profile);
    renderStats(data.apps);
    renderApps(data.apps);
    renderOthers(data.others);
    renderSkills(data.apps, data.others);
  }

  function renderProfile(p) {
    document.querySelectorAll('[data-profile]').forEach(n => {
      const v = p[n.dataset.profile];
      if (v) n.textContent = v;
    });
    document.querySelectorAll('[data-profile-link]').forEach(n => {
      n.href = p[n.dataset.profileLink];
      n.rel = 'noopener';
      n.target = '_blank';
    });
  }

  function renderStats(apps) {
    const ratings = apps.reduce((s, a) => s + a.ratingCount, 0);
    const weighted = apps.reduce((s, a) => s + a.rating * a.ratingCount, 0);
    const years = new Date().getFullYear() - 2022 + 1;
    const stats = [
      ['App Store 公開アプリ', apps.length, '本'],
      ['累計レビュー数', ratings.toLocaleString('ja-JP'), '件'],
      ['平均評価', ratings ? (weighted / ratings).toFixed(2) : '—', '/ 5'],
      ['アプリ公開歴', years, '年目'],
    ];
    const wrap = document.getElementById('stats');
    stats.forEach(([label, value, unit]) => {
      const box = el('div', 'stat');
      box.append(el('dt', null, label));
      const dd = el('dd', null, String(value));
      dd.append(el('small', null, unit));
      box.append(dd);
      wrap.append(box);
    });
  }

  const SORTS = {
    // 新しいアプリほど trackId が大きいので、同着時のタイブレークに使う
    popular: (a, b) => b.ratingCount - a.ratingCount || b.id - a.id,
    newest: (a, b) => b.released.localeCompare(a.released) || b.id - a.id,
    rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
  };

  function renderApps(apps) {
    const grid = document.getElementById('app-grid');
    const filters = document.getElementById('filters');
    const select = document.getElementById('sort-select');
    const cards = new Map(apps.map(a => [a.id, appCard(a)]));
    let category = 'all';
    let sort = select.value in SORTS ? select.value : 'popular';
    select.value = sort;

    // 並び順は既存ノードを append し直して入れ替える（再生成しない）
    const apply = () => {
      [...apps].sort(SORTS[sort]).forEach(a => {
        const card = cards.get(a.id);
        card.hidden = category !== 'all' && a.category !== category;
        grid.append(card);
      });
    };

    const makeFilter = (label, cat, count) => {
      const b = el('button', 'filter');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(cat === 'all'));
      b.append(document.createTextNode(label), el('span', 'count', String(count)));
      b.addEventListener('click', () => {
        filters.querySelectorAll('.filter').forEach(f => f.setAttribute('aria-pressed', String(f === b)));
        category = cat;
        apply();
      });
      return b;
    };
    filters.append(makeFilter('すべて', 'all', apps.length));
    [...new Set(apps.map(a => a.category))].forEach(c =>
      filters.append(makeFilter(c, c, apps.filter(a => a.category === c).length)));

    select.addEventListener('change', () => {
      if (select.value in SORTS) { sort = select.value; apply(); }
    });

    apply();
  }

  function appCard(a) {
    const li = el('li', 'app-card');
    li.dataset.category = a.category;

    const top = el('div', 'app-top');
    const icon = el('img', 'app-icon');
    icon.src = a.icon;
    icon.alt = '';
    icon.loading = 'lazy';
    icon.width = 60;
    icon.height = 60;

    const head = el('div', 'app-head');
    head.append(el('h3', 'app-name', a.name));
    const meta = el('div', 'app-meta');
    a.platforms.forEach(p => meta.append(el('span', 'badge', p)));
    meta.append(el('span', null, a.released.replace('-', '/') + ' 公開'));
    if (a.ratingCount > 0) {
      const r = el('span', 'rating');
      r.append(el('span', 'star', '★'), document.createTextNode(` ${a.rating.toFixed(1)} (${a.ratingCount})`));
      meta.append(r);
    }
    head.append(meta);
    top.append(icon, head);

    const tags = el('div', 'tags');
    a.tags.forEach(t => tags.append(el('span', 'tag', t)));

    const links = el('div', 'app-links');
    links.append(link('App Store で見る', a.url));
    if (a.repo && a.repoPublic) links.append(link('GitHub', a.repo));

    li.append(top, el('p', 'app-desc', a.desc), tags, links);
    return li;
  }

  function link(text, href) {
    const a = el('a', null, text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function renderOthers(others) {
    const list = document.getElementById('work-list');
    others.forEach(w => {
      const li = el('li', 'work-item');
      const head = el('div', 'work-head');
      head.append(el('h3', 'work-name', w.name));
      li.append(head, el('p', null, w.desc));
      const tags = el('div', 'tags');
      w.tags.forEach(t => tags.append(el('span', 'tag', t)));
      li.append(tags);
      if (w.repo && w.public) {
        const l = link('GitHub で見る →', w.repo);
        l.className = 'work-repo';
        li.append(l);
      } else {
        li.append(el('p', 'work-private', 'リポジトリは非公開'));
      }
      list.append(li);
    });
  }

  function renderSkills(apps, others) {
    const seen = new Map();
    [...apps, ...others].forEach(w => w.tags.forEach(t => seen.set(t, (seen.get(t) || 0) + 1)));
    const chips = document.getElementById('skill-chips');
    [...seen.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
      .slice(0, 18)
      .forEach(([t]) => chips.append(el('li', null, t)));
  }
})();
