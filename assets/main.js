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
  fetch('assets/data.json?v=7')
    .then(r => r.json())
    .then(render)
    .catch(() => {
      document.getElementById('app-grid').append(
        el('li', 'app-card', 'データを読み込めませんでした。時間をおいて再度お試しください。')
      );
    });

  function render(data) {
    renderProfile(data.profile);
    renderStats(data.apps, data.retired || []);
    renderApps(data.apps);
    renderWeb(data.web || []);
    renderRetired(data.retired || []);
    renderOthers(data.others);
    renderSkills(data.apps, [...data.others, ...(data.web || [])], data.retired || []);
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

  function renderStats(apps, retired) {
    const ratings = apps.reduce((s, a) => s + a.ratingCount, 0);
    const weighted = apps.reduce((s, a) => s + a.rating * a.ratingCount, 0);
    const stats = [
      ['App Store 公開アプリ', apps.length, '本'],
      ['累計レビュー数', ratings.toLocaleString('ja-JP'), '件'],
      ['平均評価', ratings ? (weighted / ratings).toFixed(2) : '—', '/ 5'],
      ['通算リリース', apps.length + retired.length, '本'],
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

  // カード全体が1つのリンク（紹介ページがあればそちら、なければ App Store）。
  // 名前のリンクを ::after でカード全体に広げている（.app-name a）。App Store・GitHub の小さいリンクはその上に重ねる
  function appCard(a) {
    const li = el('li', 'app-card');
    li.dataset.category = a.category;
    const primary = a.lp || a.url;

    const top = el('div', 'app-top');
    const icon = el('img', 'app-icon');
    icon.src = a.icon;
    icon.alt = '';
    icon.loading = 'lazy';
    icon.width = 56;
    icon.height = 56;

    const head = el('div', 'app-head');
    const name = el('h3', 'app-name');
    const nameLink = el('a', null, a.name);
    nameLink.href = primary;
    if (!a.lp) { nameLink.target = '_blank'; nameLink.rel = 'noopener'; }
    name.append(nameLink);

    const meta = el('div', 'app-meta');
    meta.append(el('span', null, a.platforms.join(' / ') + ' · ' + a.released.replace('-', '/') + ' 公開'));
    if (a.ratingCount > 0) {
      const r = el('span', 'rating');
      r.append(el('span', 'star', '★'), document.createTextNode(` ${a.rating.toFixed(1)} (${a.ratingCount})`));
      meta.append(r);
    }
    head.append(name, meta);
    top.append(icon, head);

    const desc = el('p', 'app-desc', a.desc);
    desc.title = a.desc;
    const tags = el('p', 'app-tags', a.tags.join(' · '));

    const foot = el('div', 'app-foot');
    foot.append(el('span', 'app-go', a.lp ? '詳しく見る →' : 'App Store ↗'));
    if (a.lp) foot.append(link('App Store ↗', a.url));
    if (a.repo && a.repoPublic) foot.append(link('GitHub ↗', a.repo));

    li.append(top, desc, tags, foot);
    return li;
  }

  function link(text, href) {
    const a = el('a', null, text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function renderRetired(items) {
    renderCompact(document.getElementById('retired-list'), items, 5, w => w.period);
  }

  // 過去のアプリ・その他の制作物は「名前＋一行」の短い一覧にする。
  // 最初の limit 件だけ見せて、残りは「もっと見る」で開く（タグは小さく1行で残す。About の技術チップにも使う）
  function renderCompact(list, items, limit, meta) {
    items.forEach((w, i) => {
      const li = el('li', 'compact-item');
      if (i >= limit) li.hidden = true;
      const head = el('div', 'compact-head');
      head.append(el('h3', 'compact-name', w.name));
      const m = meta(w);
      if (m) head.append(el('span', 'compact-meta', m));
      const desc = el('p', 'compact-desc', w.desc);
      if (w.tags && w.tags.length) desc.append(el('span', 'compact-tags', w.tags.join(' · ')));
      li.append(head, desc);
      if (w.repo && w.public) {
        const l = link('GitHub →', w.repo);
        l.className = 'compact-link';
        li.append(l);
      }
      list.append(li);
    });
    if (items.length > limit) {
      const btn = el('button', 'compact-more', 'もっと見る（残り' + (items.length - limit) + '件）');
      btn.type = 'button';
      btn.addEventListener('click', () => {
        list.querySelectorAll('li[hidden]').forEach(li => { li.hidden = false; });
        btn.remove();
      });
      list.after(btn);
    }
  }

  function renderWeb(games) {
    const list = document.getElementById('play-list');
    if (!list) return;
    if (!games.length) { document.getElementById('play').hidden = true; return; }
    games.forEach(g => {
      const li = el('li', 'play-item');
      const a = el('a', 'play-thumb');
      a.href = g.url;
      const img = el('img');
      img.src = g.thumb; img.alt = g.name + ' のタイトル画面'; img.width = 600; img.height = 315; img.loading = 'lazy';
      a.append(img);
      const body = el('div', 'play-body');
      const head = el('div', 'work-head');
      head.append(el('h3', 'work-name', g.name));
      if (g.status) head.append(el('span', 'play-status', g.status));
      body.append(head, el('p', null, g.desc));
      const tags = el('div', 'tags');
      g.tags.forEach(t => tags.append(el('span', 'tag', t)));
      const btn = el('a', 'btn btn-primary play-btn', g.button || '遊ぶ ▶');
      btn.href = g.url;
      body.append(tags, btn);
      li.append(a, body);
      list.append(li);
    });
  }

  function renderOthers(others) {
    renderCompact(document.getElementById('work-list'), others, 5, w => w.status);
  }

  function renderSkills(apps, others, retired) {
    const seen = new Map();
    [...apps, ...others, ...retired].forEach(w => w.tags.forEach(t => seen.set(t, (seen.get(t) || 0) + 1)));
    const chips = document.getElementById('skill-chips');
    [...seen.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
      .slice(0, 18)
      .forEach(([t]) => chips.append(el('li', null, t)));
  }
})();
