// ibid's own pages in the window: the reader (the button at the bottom right), Highlights (the highlighter in
// the row) and a page opened from it, with the app's own steps between them. It builds on the page's main
// script: `pages[n]` is whichever of a tab's two views is showing, the website or its reader, and a highlight
// made in one is carried to the other by its words.
(() => {
  const lift = document.querySelector(".lift"), KEYS = SETS[0].tabs;
  const norm = s => s.replace(/\s+/g, " ").trim();
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const LINKS = { noema: "https://www.noemamag.com/the-mythology-of-conscious-ai/" };
  const began = Date.now();
  // Highlights is not a tab: the highlighter switches it on over the page and off again, back to the tab you
  // were on. `hkey` is the page open from the list; `came` is the Highlights page a website was opened from,
  // which the button at the bottom right goes back to while you stay on that tab.
  let inH = false, hkey = null, came = null, query = "", floating = null;
  // Highlights has no turned corner, whatever the tab behind it has.
  const turn0 = turn;
  turn = (on, atOnce) => turn0(on && !inH, atOnce);

  // ---------- The pages ----------
  const readerHTML = k => `<div class="col"><main><header><p class="r-site">${READERS[k].site}</p><h1 class="r-title">${READERS[k].title}</h1><p class="r-meta">${READERS[k].meta}</p></header><article>${READERS[k].html}</article></main></div>`;
  const page = (cls, key, host) => { const p = el("article", "page app " + cls); p.dataset.key = key; p.dataset.host = host; sheet.append(p); all.push(p); return p; };
  const web = {}, readers = {}, reading = {};
  for (const k of KEYS) {
    web[k] = all.find(p => p.dataset.key == k);
    readers[k] = page("reader", k + "~reader", web[k].dataset.host);
    readers[k].innerHTML = readerHTML(k);
  }
  const hlist = page("hlist", "~list", ""), hpage = page("hpage", "~page", "");
  // A note's link is remembered, so it can be drawn again in the other view.
  const card0 = card;
  card = (a, k) => { a.link = k; card0(a, k); };
  for (const a of made.values()) if (a.note?.querySelector(".card")) a.link = "noema";

  // ---------- Carrying highlights between a website and its reader ----------
  const orphans = new Map();   // what couldn't be placed in a view, kept for the way back
  function collect(p) {
    const ids = [...new Set([...p.querySelectorAll(".hl")].map(s => +s.dataset.id))];
    return ids.map(id => {
      const a = made.get(id);
      if (!a || bare(a)) return null;
      return { words: norm([...p.querySelectorAll(`.hl[data-id="${id}"]`)].map(s => s.textContent).join("")), ink: a.ink, line: a.line,
        note: a.note ? a.note.querySelector(".nw").textContent : null, link: a.note?.querySelector(".card") ? a.link || "noema" : null };
    }).filter(a => a && a.words).concat(orphans.get(p) || []);
  }
  // Finds words in a column whatever its line breaks: spaces of any kind and length count as one.
  function locate(col, words) {
    const walk = document.createTreeWalker(col, NodeFilter.SHOW_TEXT), map = [];
    let hay = "", space = true;
    for (let n; n = walk.nextNode();) {
      if (n.parentNode.closest(".note")) continue;
      for (let i = 0; i < n.data.length; i++) {
        const c = n.data[i];
        if (/\s/.test(c)) { if (space) continue; space = true; hay += " "; } else { space = false; hay += c; }
        map.push([n, i]);
      }
    }
    const at = hay.indexOf(words);
    if (at < 0) return null;
    const r = document.createRange();
    r.setStart(...map[at]);
    const [en, eo] = map[at + words.length - 1];
    r.setEnd(en, eo + 1);
    return r;
  }
  function restore(p, list) {
    for (const s of p.querySelectorAll(".hl")) made.delete(+s.dataset.id);
    const k = p.dataset.key.replace("~reader", "");
    p.innerHTML = p.classList.contains("reader") ? readerHTML(k) : plain.get(k);
    const lost = [];
    for (const it of list) {
      const r = locate(p.querySelector(".col"), it.words), id = r && wrap(r, p);
      if (!id) { lost.push(it); continue; }
      const a = made.get(id);
      a.ink = it.ink; a.line = it.line;
      if (it.note != null) write(id).textContent = it.note;
      if (it.link) card(a, it.link);
      paint(id);
    }
    orphans.set(p, lost);
  }

  // ---------- One page stepping back as another settles over it ----------
  // The app's own step (`Animation.pane`, `SheetView.blend`): opening, what leaves shrinks to 97% and fades as
  // what arrives settles from 103%; closing, what leaves goes out to 103% and what arrives comes up from 97%.
  // 0.24 s on a curve that sets off at once and eases in. `cross` fades one over the other in place.
  let turning = null;
  function blend(how, swap) {
    turning?.();
    if (calm) return swap();
    const ghost = sheet.cloneNode(true), y = sheet.scrollTop;
    ghost.removeAttribute("id");
    ghost.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
    ghost.classList.add("ghost");
    lift.insertBefore(ghost, how == "cross" || how == "out" ? sheet.nextSibling : sheet);
    ghost.scrollTop = y;
    swap();
    // "in" and "out" fade one over the other on the app's spring for small things (`Animation.note`). Nothing
    // uses them now: the owner asked for Highlights to come and go by the same step as everything else.
    const fade = how == "in" || how == "out", time = (fade ? 480 : 240) * SLOW;
    const [g, s] = how == "open" ? [.97, 1.03] : how == "close" ? [1.03, .97] : [1, 1];
    const o = { duration: time, easing: fade ? getComputedStyle(win).getPropertyValue("--spring").trim() || "ease-out" : "cubic-bezier(.32,.72,0,1)", fill: "both" };
    const a = ghost.animate([{ transform: "scale(1)", opacity: 1 }, { transform: `scale(${g})`, opacity: how == "in" ? 1 : 0 }], o);
    const b = sheet.animate([{ transform: `scale(${s})`, opacity: how == "out" ? 1 : 0 }, { transform: "scale(1)", opacity: 1 }], o);
    turning = () => { a.cancel(); b.cancel(); ghost.remove(); turning = null; };
    const mine = turning;
    a.finished.then(() => turning == mine && mine(), () => {});
    setTimeout(() => turning == mine && mine(), time + 80);
  }

  // ---------- The buttons over the page ----------
  const LINES = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 4.6h14M3 8.2h14M3 11.8h14M3 15.4h8.6"/></svg>';
  const GLOBE = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25"><circle cx="10" cy="10" r="7.6"/><ellipse cx="10" cy="10" rx="3.4" ry="7.6"/><path d="M2.4 10h15.200M3.500 6.200h13M3.500 13.800h13M10 2.400v15.200"/></svg>';
  const BACK = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12.200 4.200L6.400 10l5.800 5.800"/></svg>';
  const UPDOWN = '<svg viewBox="0 0 10 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.200 4.300L5 1.600l2.800 2.700M2.200 7.700L5 10.400l2.800-2.700"/></svg>';
  const br = el("button", "bub br"), bl = el("button", "bub bl", "<span>Aa</span>"), tl = el("button", "bub tl", BACK), lvl = el("button", "lvl");
  bl.setAttribute("aria-label", "Text Size and Style"); tl.setAttribute("aria-label", "Back to Highlights");
  desk.append(br, bl, tl, lvl);
  const glyphs = [...document.querySelectorAll(".glyphs svg")].map((svg, n) => {
    const b = el("button", "gb");
    b.setAttribute("aria-label", ["Bookmarks", "Highlights", "Settings"][n]);
    svg.replaceWith(b); b.append(svg);
    return b;
  });
  document.querySelector(".glyphs").removeAttribute("aria-hidden");

  const LEVELS = ["Your highlights", "With surroundings", "Whole essay"];
  const level = {}, places = {};
  function chrome() {
    const k = KEYS[current], onPage = inH && !!hkey, read = !inH && reading[k];
    br.classList.toggle("off", inH && !hkey);
    br.innerHTML = onPage || read ? GLOBE : LINES;
    br.setAttribute("aria-label", onPage ? "Open Website" : read ? "Show Website" : "Reader View");
    br.classList.toggle("web", !inH && !read);
    bl.classList.toggle("off", !(onPage || read));
    tl.classList.toggle("off", !onPage); lvl.classList.toggle("off", !onPage);
    for (const b of [br, bl, tl]) b.classList.toggle("hp", onPage);
    if (onPage) lvl.innerHTML = `<span>${LEVELS[level[hkey] || 0]}</span>${UPDOWN}`;
    glyphs[1].classList.toggle("on", inH);
    win.classList.toggle("hl", inH);
    if (inH) tabs.forEach(t => t.setAttribute("aria-selected", false));
    shut();
  }
  // Puts one of the window's pages in the sheet, at a place down it.
  function put(p, y) {
    all.forEach(q => q.classList.toggle("on", q == p));
    const paper = getComputedStyle(p).getPropertyValue("--paper");
    desk.style.setProperty("--paper", paper); win.style.setProperty("--paper", paper);
    calmUntil = performance.now() + 400;
    sheet.scrollTop = lastY = y || 0;
  }

  // ---------- The reader ----------
  // The same words stay where they were on changing between a website and its reader.
  const blocks = p => [...p.querySelectorAll(p.classList.contains("reader") ? ".col article > *" : ".col p")];
  function where(p) {
    if (sheet.scrollTop < 8) return null;
    const top = sheet.getBoundingClientRect().top + (p.classList.contains("reader") ? 0 : p.querySelector(".stick")?.offsetHeight || 0);
    const b = blocks(p).find(b => b.getBoundingClientRect().bottom > top + 4 && norm(b.textContent).length > 40);
    return b && { words: norm(b.textContent).slice(0, 48), dy: b.getBoundingClientRect().top - sheet.getBoundingClientRect().top };
  }
  function seek(p, at) {
    if (!at) return 0;
    const b = blocks(p).find(b => norm(b.textContent).startsWith(at.words));
    return b ? Math.max(0, b.getBoundingClientRect().top - sheet.getBoundingClientRect().top + sheet.scrollTop - at.dy) : 0;
  }
  function toggleReader() {
    const k = KEYS[current], from = pages[current], opening = !reading[k], to = opening ? readers[k] : web[k];
    done();
    const at = where(from), list = collect(from);
    tuck(false);
    blend(opening ? "open" : "close", () => {
      restore(to, list);
      reading[k] = opening; pages[current] = to;
      put(to, 0);
      sheet.scrollTop = lastY = seek(to, at);
      fit(to); place(); chrome();
    });
  }

  // ---------- Highlights ----------
  const byline = k => { const parts = READERS[k].meta.split(" · "); return parts.length > 2 ? parts[0] : ""; };
  const minutes = k => READERS[k].meta.split(" · ").pop();
  const marks = k => collect(pages[KEYS.indexOf(k)]);
  const mark = (words, a) => `<span class="hl${a.ink ? " " + a.ink : ""}${a.line ? " line" : ""}">${esc(words)}</span>`;
  hlist.innerHTML = `<div class="h-search"><svg class="glass" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.500" cy="8.500" r="6"/><path d="M13 13l5 5"/></svg>`
    + `<input type="search" placeholder="Search your highlights" spellcheck="false" autocomplete="off" aria-label="Search your highlights">`
    + `<button class="h-clear" aria-label="Clear Search" hidden><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M7 7l6 6M13 7l-6 6"/></svg></button></div><main></main>`;
  const input = hlist.querySelector("input"), clear = hlist.querySelector(".h-clear");
  function list() {
    const q = query.trim().toLowerCase(), rows = [];
    for (const k of KEYS) {
      const all = marks(k);
      if (!all.length) continue;
      const hit = all.find(a => (a.words + " " + (a.note || "")).toLowerCase().includes(q));
      if (q && !hit && !(READERS[k].title + " " + byline(k) + " " + web[k].dataset.host).toLowerCase().includes(q)) continue;
      const first = (q && hit) || all[0];
      const details = [byline(k), `${all.length} highlight${all.length == 1 ? "" : "s"}`, web[k].dataset.host].filter(Boolean).join(" · ");
      rows.push(`<div class="h-row" role="button" tabindex="0" data-key="${k}"><h3 class="h-name">${READERS[k].title}</h3><p class="r-meta">${esc(details)}</p><p class="h-quote" data-full="${esc(first.words)}" data-ink="${first.ink}" data-line="${first.line ? 1 : ""}"></p></div>`);
    }
    hlist.querySelector("main").innerHTML = rows.length ? `<section><h2 class="h-period">Today</h2><div class="h-pages">${rows.join("")}</div></section>`
      : `<p class="h-empty">${q ? "Nothing here has those words." : "Highlight any words on any page. Your highlights will be waiting whenever you come back, and they’ll all gather here."}</p>`;
    trim();
  }
  // A quote in the list is cut to three lines, as the app cuts it.
  function trim() {
    for (const p of hlist.querySelectorAll(".h-quote")) {
      const full = p.dataset.full, a = { ink: p.dataset.ink, line: !!p.dataset.line }, set = t => p.innerHTML = mark(t, a);
      set(full);
      const most = parseFloat(getComputedStyle(p).lineHeight) * 3 + 2;
      if (!p.offsetHeight || p.getBoundingClientRect().height <= most) continue;
      let low = 0, high = full.length;
      while (low < high) {
        const mid = (low + high + 1) >> 1;
        set(full.slice(0, mid).trimEnd() + "…");
        if (p.getBoundingClientRect().height <= most) low = mid; else high = mid - 1;
      }
      set(full.slice(0, low).replace(/\s+\S*$/, "").trimEnd() + "…");
    }
  }
  input.addEventListener("input", () => { query = input.value; clear.hidden = !query; list(); });
  input.addEventListener("keydown", e => { e.stopPropagation(); if (e.key == "Escape") { input.value = query = ""; clear.hidden = true; list(); input.blur(); } });
  clear.addEventListener("click", () => { input.value = query = ""; clear.hidden = true; list(); input.focus(); });
  hlist.addEventListener("click", e => { const row = e.target.closest(".h-row"); if (row) openPage(row.dataset.key); });
  hlist.addEventListener("keydown", e => { const row = e.target.closest?.(".h-row"); if (row && (e.key == "Enter" || e.key == " ")) { e.preventDefault(); openPage(row.dataset.key); } });

  // A page opened from the list: your highlights alone, each in its paragraph, or the whole essay.
  const parsed = {};
  function parts(k) {
    if (parsed[k]) return parsed[k];
    const box = el("div", "", READERS[k].html), out = [];
    for (const e of box.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li")) {
      const t = norm(e.textContent);
      if (!t || e.closest("figure") || (e.tagName != "LI" && e.querySelector("p, li"))) continue;
      out.push({ k: /^H/.test(e.tagName) ? "h" : e.tagName == "LI" ? "l" : e.closest("blockquote") ? "q" : "p", t });
    }
    return parsed[k] = out;
  }
  function when() {
    const m = Math.floor((Date.now() - began) / 60000);
    return m < 1 ? "now" : m == 1 ? "1 minute ago" : `${m} minutes ago`;
  }
  function render(k) {
    const all = marks(k), lv = level[k] || 0;
    const inside = t => all.filter(a => t.includes(a.words));
    const draw = (t, ms) => {
      const cuts = ms.map(a => [t.indexOf(a.words), a]).filter(c => c[0] >= 0).sort((x, y) => x[0] - y[0]);
      let out = "", at = 0;
      for (const [i, a] of cuts) { if (i < at) continue; out += esc(t.slice(at, i)) + mark(a.words, a); at = i + a.words.length; }
      const notes = ms.filter(a => a.note != null && (a.note || a.link));
      return out + esc(t.slice(at)) + (notes.length ? `<span class="h-notes">${notes.map(a => `<span class="h-card" data-note="${esc([a.note, LINKS[a.link]].filter(Boolean).join(" "))}" style="--ink:${a.ink ? INKS[a.ink] : "#E5342B"}"></span>`).join("")}</span>` : "");
    };
    let shown;
    if (lv == 0) shown = all.map(a => ({ k: "p", t: a.words, ms: [a] }));
    else {
      shown = parts(k).map(b => ({ ...b, ms: inside(b.t) }));
      if (lv == 1) {
        shown = shown.filter(b => b.ms.length);
        const placed = new Set(shown.flatMap(b => b.ms));
        shown.push(...all.filter(a => !placed.has(a)).map(a => ({ k: "p", t: a.words, ms: [a] })));
      }
    }
    let html = "", listing = false;
    shown.forEach((b, n) => {
      if (b.k == "l" && !listing) { html += "<ul>"; listing = true; }
      if (b.k != "l" && listing) { html += "</ul>"; listing = false; }
      const words = draw(b.t, b.ms), part = ` data-part="${n}"`;
      html += b.k == "h" ? `<h2${part}>${words}</h2>` : b.k == "q" ? `<blockquote><p${part}>${words}</p></blockquote>` : b.k == "l" ? `<li${part}>${words}</li>` : `<p${part}>${words}</p>`;
    });
    if (listing) html += "</ul>";
    const noted = all.some(a => a.note != null && (a.note || a.link));
    hpage.innerHTML = `<main${noted ? ' class="noted"' : ""}><header><p class="r-site">${web[k].dataset.host}</p><h1 class="r-title">${READERS[k].title}</h1><p class="r-meta">${esc([byline(k), minutes(k), when()].filter(Boolean).join(" · "))}</p></header><article>${html}</article></main>`;
  }
  // Notes beside short passages would lie over each other: each starts below the one before.
  function stack() {
    let floor = -1e9;
    for (const n of hpage.querySelectorAll(".h-notes")) {
      n.style.top = "0";
      const top = n.getBoundingClientRect().top, gap = 8 * win.offsetWidth / 1240;
      if (top < floor) n.style.top = floor - top + "px";
      floor = n.getBoundingClientRect().bottom + gap;
    }
  }
  function showHighlights() {
    done();
    tops.set(pages[current], sheet.scrollTop);
    tuck(false);
    blend("open", () => {
      inH = true; came = null;
      turn(false, true);
      if (hkey && marks(hkey).length) { render(hkey); put(hpage, places[hkey]); stack(); }
      else { hkey = null; put(hlist, places[""]); list(); }
      chrome();
    });
  }
  // Leaves Highlights for a tab, the one you were on unless another is named.
  function leave(i = current) {
    places[hkey || ""] = sheet.scrollTop;
    inH = false;
    put(pages[current], tops.get(pages[current]));
    open0(i);
    chrome();
  }
  function openPage(k) {
    places[""] = sheet.scrollTop;
    tuck(false);
    blend("open", () => { hkey = k; render(k); put(hpage, places[k]); stack(); chrome(); });
  }
  function backToList() {
    places[hkey] = sheet.scrollTop;
    tuck(false);
    blend("close", () => { hkey = null; put(hlist, places[""]); list(); chrome(); });
  }
  // The globe on a Highlights page: Highlights steps back as its website comes forward. The button in the
  // website's corner then goes back to that page, the website stepping back in turn.
  function toWebsite() {
    const k = hkey, i = KEYS.indexOf(k);
    places[k] = sheet.scrollTop;
    tuck(false);
    blend("open", () => {
      if (reading[k]) { restore(web[k], collect(readers[k])); reading[k] = false; pages[i] = web[k]; }
      leave(i);
      came = { i, k };
      chrome();
    });
  }
  function backToPage() {
    const k = came.k;
    done();
    tops.set(pages[current], sheet.scrollTop);
    tuck(false);
    blend("close", () => { inH = true; turn(false, true); hkey = k; came = null; render(k); put(hpage, places[k]); stack(); chrome(); });
  }

  // ---------- The view's menu and the reader's type ----------
  function shut() { floating?.remove(); floating = null; }
  addEventListener("pointerdown", e => { if (floating && !floating.contains(e.target) && !e.target.closest(".lvl, .bub.bl")) shut(); }, true);
  addEventListener("keydown", e => { if (e.key == "Escape") shut(); });
  function markdown(k) {
    const all = marks(k);
    return `# ${READERS[k].title}\n\n${web[k].dataset.host}\n\n` + all.map(a => `> ${a.words}` + (a.note || a.link ? `\n\n${[a.note, LINKS[a.link]].filter(Boolean).join(" ")}` : "")).join("\n\n") + "\n";
  }
  lvl.addEventListener("click", () => {
    if (floating) return shut();
    const k = hkey, m = floating = el("div", "menu", LEVELS.map((name, n) => `<button data-level="${n}"${n == (level[k] || 0) ? ' class="on"' : ""}>${name}</button>`).join("") + `<hr><button data-do="copy">Copy as Markdown</button>`);
    m.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.do == "copy") navigator.clipboard?.writeText(markdown(k)).catch(() => {});
      else if (+b.dataset.level != (level[k] || 0)) { tuck(false); blend("cross", () => { level[k] = +b.dataset.level; render(k); put(hpage, 0); stack(); chrome(); }); }
      shut();
    });
    desk.append(m);
  });
  const FACES = [["New York", 'ui-serif, "New York", Georgia, serif'], ["Charter", "Charter, ui-serif, Georgia, serif"], ["Georgia", "Georgia, ui-serif, serif"], ["Iowan", '"Iowan Old Style", ui-serif, Georgia, serif'], ["Palatino", 'Palatino, "Palatino Linotype", ui-serif, serif']];
  const WIDTHS = [["Narrow", 540], ["Medium", 640], ["Wide", 780]];
  const look = { size: 20, width: 640, face: 0 };
  function setLook() {
    win.style.setProperty("--size", `calc(${look.size} * var(--u))`);
    win.style.setProperty("--width", `calc(${look.width} * var(--u))`);
    if (look.face) win.style.setProperty("--face", FACES[look.face][1]); else win.style.removeProperty("--face");
    place(); trim(); if (inH && hkey) stack();
  }
  bl.addEventListener("click", () => {
    if (floating) return shut();
    const p = floating = el("div", "look");
    const paint = () => {
      p.innerHTML = `<div class="sz"><span>A</span><input type="range" min="15" max="30" step="1" value="${look.size}" aria-label="Text Size"><span>A</span></div>`
        + `<div class="seg">${WIDTHS.map(([name, w]) => `<button data-width="${w}"${w == look.width ? ' class="on"' : ""}>${name}</button>`).join("")}</div>`
        + `<div class="faces">${FACES.map(([name, css], n) => `<button data-face="${n}" style='font-family:${n ? css : "var(--serif)"}'${n == look.face ? ' class="on"' : ""}>${name}</button>`).join("")}</div>`;
      p.querySelector("input").addEventListener("input", e => { look.size = +e.target.value; setLook(); });
    };
    paint();
    p.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.width) look.width = +b.dataset.width; else look.face = +b.dataset.face;
      setLook(); paint();
    });
    desk.append(p);
  });

  // ---------- The bookmarks list and settings ----------
  // A popover under its button in the row (`BookmarksButton`): the pages whose bookmark is pressed, then some
  // already kept.
  // Bookmarks already kept, as someone who reads a lot might have (the owner asked for "a bunch of bookmarks to
  // good sites", 2026-11-19). The app lists twelve at most; pressing one of these only closes the list, since
  // the window can't go to a website it has no page of.
  const SAVED = [["The New York Times", "nytimes.com", "#111"], ["Longreads", "longreads.com", "#D7141A"], ["The New Yorker", "newyorker.com", "#222"], ["The Atlantic", "theatlantic.com", "#E2231A"],
    ["London Review of Books", "lrb.co.uk", "#1F3A5F"], ["The Paris Review", "theparisreview.org", "#444"], ["Works in Progress", "worksinprogress.co", "#2E5E4E"], ["The Marginalian", "themarginalian.org", "#B8900A"],
    ["Paul Graham", "paulgraham.com", "#777"], ["Financial Times", "ft.com", "#C58B66"], ["Arts & Letters Daily", "aldaily.com", "#7A1F1F"]];
  let pop = null, popFor = null;
  function closePop() { pop?.remove(); pop = null; popFor?.classList.remove("on"); popFor = null; }
  function drop(button, cls, html) {
    const was = popFor;
    closePop();
    if (was == button) return null;
    pop = el("div", "pop " + cls, `<div class="inner">${html}</div>`); popFor = button;
    win.append(pop);
    const u = win.offsetWidth / 1240, w = win.getBoundingClientRect(), b = button.getBoundingClientRect(), mid = b.left + b.width / 2 - w.left;
    const left = Math.min(Math.max(8 * u, mid - pop.offsetWidth / 2), win.offsetWidth - pop.offsetWidth - 8 * u), top = b.bottom - w.top + 6 * u;
    pop.style.left = left + "px"; pop.style.top = top + "px";
    pop.style.setProperty("--ax", mid - left + "px");
    // The window runs off the foot of the screen, so the popover stops short of what can be seen.
    pop.style.maxHeight = Math.min(innerHeight, w.bottom) - w.top - top - 12 * u + "px";
    return pop;
  }
  addEventListener("pointerdown", e => { if (pop && !pop.contains(e.target) && !e.target.closest(".gb")) closePop(); }, true);
  addEventListener("keydown", e => { if (e.key == "Escape") closePop(); });
  glyphs[0].addEventListener("click", () => {
    const rows = (KEYS.map((k, i) => kept[i] ? `<button data-i="${i}"><i class="fav" style="background:${SITES[k].colour}">${SITES[k].fav}</i><span class="nm">${READERS[k].title}</span><span class="st">${web[k].dataset.host}</span></button>` : "").join("")
      + SAVED.map(([name, host, colour]) => `<button><i class="fav" style="background:${colour}">${name.replace(/^The /, "")[0]}</i><span class="nm">${name}</span><span class="st">${host}</span></button>`).join(""));
    const p = drop(glyphs[0], "marks", rows ? rows + `<hr><button data-all><span class="nm">Show All Bookmarks</span></button>` : `<p class="none">Press the bookmark by the address on any page to keep it here.</p>`);
    p?.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; closePop(); if (b.dataset.i) open(+b.dataset.i); });
  });
  // The "…" is drawn and does nothing: the owner had settings taken off the website (2026-11-19; the form is in
  // commit cd08e1b).
  glyphs[2].disabled = true;

  // ---------- Wiring ----------
  // A button pressed with the pointer doesn't keep the keyboard's ring round it afterwards.
  win.addEventListener("click", e => { if (e.detail) e.target.closest?.(".gb, .bub, .lvl")?.blur(); });
  br.addEventListener("click", () => inH ? toWebsite() : came && came.i == current ? backToPage() : toggleReader());
  tl.addEventListener("click", backToList);
  glyphs[1].addEventListener("click", () => { closePop(); inH ? blend("close", () => leave()) : showHighlights(); });
  // Choosing a tab closes Highlights; going to another tab forgets the page a website was opened from.
  const open0 = open;
  open = i => {
    turning?.(); closePop();
    if (inH) { places[hkey || ""] = sheet.scrollTop; inH = false; put(pages[current], tops.get(pages[current])); }
    if (came && came.i != i) came = null;
    open0(i);
    chrome();
  };
  addEventListener("resize", () => { if (inH && !hkey) trim(); });
  chrome();
  // For pictures: ?do=reader, ?do=highlights, ?do=page-brain-1 (a page from Highlights at a view), ?do=aa, ?do=menu.
  const ask = new URLSearchParams(location.search).get("do") || "";
  if (ask == "reader" || ask == "aa") toggleReader();
  if (ask == "aa") bl.click();
  if (/^(highlights|page|menu)/.test(ask)) showHighlights();
  if (/^(page|menu)/.test(ask)) { const [, k, lv] = ask.split("-"); level[k || "brain"] = +lv || 0; openPage(k || "brain"); }
  if (ask == "menu") lvl.click();
  if (ask == "bookmarks") glyphs[0].click();
  // ?do=test goes through every way between the views and says what it found, in the page's title.
  if (ask == "test") (async () => {
    const wait = () => new Promise(r => setTimeout(r, 300)), seen = [];
    const note = what => seen.push(`${what}: ${[...document.querySelectorAll(".page.on")].map(p => p.dataset.key).join("+")} hl=${document.querySelectorAll(".page.on .hl").length} notes=${document.querySelectorAll(".page.on .note, .page.on .h-card").length} y=${Math.round(sheet.scrollTop)}`);
    try {
      note("start");
      sheet.scrollTop = 900; await wait(); br.click(); await wait(); note("reader");
      br.click(); await wait(); note("website again");
      open(1); await wait(); br.click(); await wait(); note("noema reader");
      glyphs[1].click(); await wait(); note("highlights");
      hlist.querySelector('[data-key="asterisk"]').click(); await wait(); note("asterisk page");
      lvl.click(); document.querySelector('.menu [data-level="2"]').click(); await wait(); note("whole essay");
      tl.click(); await wait(); note("list again");
      hlist.querySelector('[data-key="noema"]').click(); await wait(); br.click(); await wait(); note("noema website from page");
      br.click(); await wait(); note("back to page");
      glyphs[1].click(); await wait(); note("highlights off");
      tabs[0].click(); await wait(); note("tab 1");
      document.title = "PASS " + seen.join(" | ");
    } catch (e) { document.title = "FAIL " + e.message + " after " + seen.join(" | "); }
  })();
})();
