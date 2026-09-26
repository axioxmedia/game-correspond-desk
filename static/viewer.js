(function () {
  const graph = window.__GRAPH__ || { nodes: [], links: [], axes: [], systemTree: [], disciplineTree: [] };
  const storageKey = "correspond.done." + (graph.id || "project");
  const themeKey = "correspond.theme." + (graph.id || "project");

  function loadDone() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function saveDone(map) {
    localStorage.setItem(storageKey, JSON.stringify(map || {}));
  }

  const I18N = {
    zh: {
      search: "搜索节点",
      unfinished: "仅未完成",
      outline: "大纲",
      detail: "说明",
      done: "已完成",
      total: "节点",
      empty: "点选一个方块查看说明与照应。",
      related: "运行时照应",
      docs: "文档",
      gold: "黑金",
      light: "浅色",
    },
    en: {
      search: "Search nodes",
      unfinished: "Incomplete only",
      outline: "Outline",
      detail: "Notes",
      done: "Done",
      total: "Nodes",
      empty: "Select a block to read its note and correspondences.",
      related: "Runtime correspondence",
      docs: "Docs",
      gold: "Gold",
      light: "Light",
    },
  };
  const cfg = window.__EXPORT__ || {};
  const langKey = "correspond.lang." + (graph.id || "project");
  function detectLang() {
    const saved = localStorage.getItem(langKey) || localStorage.getItem("aio.uiLang");
    if (saved === "zh" || saved === "en") return saved;
    if (cfg.autoLang !== false) {
      return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
    }
    return cfg.preferEn === false ? "zh" : "en";
  }
  let lang = detectLang();
  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  function projectTitle() {
    if (lang === "en") return graph.projectNameEn || graph.projectName || "Correspond";
    return graph.projectNameZh || graph.projectName || "Correspond";
  }
  function nodeTitle(node) {
    const d = (node && node.data) || {};
    if (lang === "en") return d.titleEn || d.title || d.titleZh || node.id;
    return d.titleZh || d.title || d.titleEn || node.id;
  }
  function nodeSummary(node) {
    const d = (node && node.data) || {};
    if (lang === "en") return d.summaryEn || d.summary || d.summaryZh || "";
    return d.summaryZh || d.summary || d.summaryEn || "";
  }
  function linkLabel(link) {
    if (lang === "en") return link.labelEn || link.label || link.labelZh || "";
    return link.labelZh || link.label || link.labelEn || "";
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const app = document.getElementById("app");
  app.innerHTML = `
    <header class="top">
      <div class="brand"><b>${escapeHtml(projectTitle())}</b></div>
      <div class="stats" id="stats"></div>
      <div class="spacer"></div>
      <input class="search" id="search" placeholder="${t('search')}" />
      <label class="chk"><input type="checkbox" id="onlyOpen" /> ${t('unfinished')}</label>
      <div class="axis-switch" id="axisSwitch"></div>
      <div class="theme-mini" id="langMini">
        <button type="button" id="langZh">中文</button>
        <button type="button" id="langEn">EN</button>
      </div>
      <div class="theme-mini">
        <button type="button" id="thGold">${t('gold')}</button>
        <button type="button" id="thLight">${t('light')}</button>
      </div>
    </header>
    <div class="work">
      <aside class="rail">
        <h4>${t('outline')}</h4>
        <div id="tree"></div>
      </aside>
      <div class="board" id="board"></div>
      <aside class="side">
        <h4>${t('detail')}</h4>
        <div id="detail">${t('empty')}</div>
      </aside>
    </div>
  `;

  const axisIds = CorrespondCanvas.axisList(graph).map((a) => a.id);
  const wanted = cfg.defaultAxis || graph.axis || "system";
  let axis = axisIds.includes(wanted) ? wanted : axisIds[0] || "system";
  let doneMap = loadDone();
  let filter = "";
  let onlyOpen = false;
  let selected = null;

  const engine = CorrespondCanvas.create(document.getElementById("board"), {
    mode: "audit",
    axis,
    lang,
    doneMap,
    onEvent: function (name, detail) {
      if (name === "select") {
        selected = detail.id;
        renderDetail();
        renderTree();
      }
      if (name === "done") {
        doneMap = detail.map;
        saveDone(doneMap);
        renderStats();
        renderTree();
      }
    },
  });
  engine.setMode("audit");
  engine.setGraph(graph);
  engine.setAxis(axis, false);

  function treeOf() {
    return CorrespondCanvas.treeFor(graph, axis);
  }

  function nodesUnder(id) {
    const bag = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      CorrespondCanvas.walkTree(treeOf(), (n, parent) => {
        if (parent && bag.has(parent.id) && !bag.has(n.id)) {
          bag.add(n.id);
          changed = true;
        }
      });
    }
    return (graph.nodes || []).filter((n) => bag.has(CorrespondCanvas.homeOf(n, axis)));
  }

  function countDone(list) {
    const total = list.length;
    const done = list.filter((n) => doneMap[n.id]).length;
    return { done, total };
  }

  function renderStats() {
    const c = countDone(graph.nodes || []);
    document.getElementById("stats").textContent = `${t('done')} ${c.done} / ${c.total} ${t('total')}`;
  }

  function matchFilter(node) {
    if (onlyOpen && doneMap[node.id]) return false;
    if (!filter) return true;
    const blob = (nodeTitle(node) + " " + nodeSummary(node)).toLowerCase();
    return blob.includes(filter);
  }

  function renderAxes() {
    const host = document.getElementById("axisSwitch");
    host.innerHTML = "";
    CorrespondCanvas.axisList(graph).forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = CorrespondCanvas.itemTitle(item, lang);
      if (item.id === axis) btn.classList.add("on");
      btn.addEventListener("click", () => setAxis(item.id));
      host.appendChild(btn);
    });
  }

  function renderTree() {
    const root = document.getElementById("tree");
    root.innerHTML = "";
    function addList(list, parent) {
      list.forEach((item) => {
        const wrap = document.createElement("div");
        const row = document.createElement("div");
        row.className = "tree-item";
        const under = nodesUnder(item.id).filter(matchFilter);
        const c = countDone(under);
        row.innerHTML = `<span class="dot" style="background:${item.color || "var(--gold)"}"></span><span>${escapeHtml(CorrespondCanvas.itemTitle(item, lang))}</span><span class="pct">${c.done}/${c.total}</span>`;
        row.addEventListener("click", () => {
          if (under.length === 1) engine.focusNode(under[0].id);
          else engine.focusGroup(item.id);
        });
        wrap.appendChild(row);
        if (item.children && item.children.length) {
          const kids = document.createElement("div");
          kids.className = "tree-kids";
          wrap.appendChild(kids);
          addList(item.children, kids);
        }
        parent.appendChild(wrap);
      });
    }
    addList(treeOf(), root);
  }

  function renderDetail() {
    const box = document.getElementById("detail");
    const node = (graph.nodes || []).find((n) => n.id === selected);
    if (!node) {
      box.textContent = t('empty');
      return;
    }
    const related = (graph.links || [])
      .filter((l) => l.from === node.id || l.to === node.id)
      .map((l) => {
        const other = l.from === node.id ? l.to : l.from;
        const n2 = (graph.nodes || []).find((x) => x.id === other);
        return { id: other, title: n2 ? nodeTitle(n2) : other, label: linkLabel(l) };
      });
    const docs = (node.data && node.data.docs) || [];
    box.innerHTML = `
      <div class="v"><b>${escapeHtml(nodeTitle(node))}</b></div>
      <div class="k">${t('detail')}</div>
      <div class="v">${escapeHtml(nodeSummary(node))}</div>
      <div class="k">${t('related')}</div>
      <div class="rel">${related
        .map((r) => `<button type="button" data-go="${r.id}">${escapeHtml(r.title)}${r.label ? " · " + escapeHtml(r.label) : ""}</button>`)
        .join("")}</div>
      <div class="k">${t('docs')}</div>
      <div class="v">${docs
        .filter((d) => d.url)
        .map((d) => `<a href="${escapeHtml(d.url)}" target="_blank" rel="noreferrer">${escapeHtml(d.label || d.url)}</a>`)
        .join("<br/>") || "—"}</div>
    `;
    box.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => engine.focusNode(btn.dataset.go));
    });
  }

  function setAxis(next) {
    axis = next;
    graph.axis = next;
    engine.setAxis(axis, true);
    renderAxes();
    renderTree();
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(themeKey, theme);
    document.getElementById("thGold").classList.toggle("on", theme === "gold");
    document.getElementById("thLight").classList.toggle("on", theme === "light");
  }

  function paintLangButtons() {
    const zh = document.getElementById("langZh");
    const en = document.getElementById("langEn");
    if (zh) zh.classList.toggle("on", lang === "zh");
    if (en) en.classList.toggle("on", lang === "en");
    const brand = document.querySelector(".brand b");
    if (brand) brand.textContent = projectTitle();
    const search = document.getElementById("search");
    if (search) search.placeholder = t("search");
    const rail = document.querySelector(".rail h4");
    if (rail) rail.textContent = t("outline");
    const side = document.querySelector(".side h4");
    if (side) side.textContent = t("detail");
    const chk = document.querySelector(".chk");
    if (chk) chk.lastChild.textContent = " " + t("unfinished");
    document.getElementById("thGold").textContent = t("gold");
    document.getElementById("thLight").textContent = t("light");
    document.title = projectTitle();
    if (engine) engine.setLang(lang);
  }
  function setLang(next) {
    lang = next === "zh" ? "zh" : "en";
    localStorage.setItem(langKey, lang);
    paintLangButtons();
    renderAxes();
    renderTree();
    renderDetail();
    renderStats();
  }
  document.getElementById("langZh").addEventListener("click", () => setLang("zh"));
  document.getElementById("langEn").addEventListener("click", () => setLang("en"));
  document.getElementById("thGold").addEventListener("click", () => setTheme("gold"));
  document.getElementById("thLight").addEventListener("click", () => setTheme("light"));
  document.getElementById("search").addEventListener("input", (e) => {
    filter = (e.target.value || "").toLowerCase();
    renderTree();
  });
  document.getElementById("onlyOpen").addEventListener("change", (e) => {
    onlyOpen = e.target.checked;
    renderTree();
  });

  paintLangButtons();
  renderAxes();
  setTheme(localStorage.getItem(themeKey) || "gold");
  renderStats();
  renderTree();
  renderDetail();
})();
