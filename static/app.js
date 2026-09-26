const I18N = {
  zh: {
    appName: "游戏照应台",
    appTag: "编辑双轴照应图并导出查阅页",
    themeGold: "黑金",
    themeLight: "浅色",
    remember: "记住本次选择",
    axisSystem: "系统视图",
    axisDiscipline: "工种视图",
    addAxis: "加视图轴",
    addCat: "加分类",
    addNode: "加节点",
    delete: "删除",
    hintLink: "从方块圆点拖到另一方块即可拉对照应线",
    save: "保存项目",
    preview: "预览查阅页",
    export: "导出 HTML",
    importJson: "导入 JSON",
    newProject: "新建",
    outline: "大纲",
    inspector: "侧栏说明",
    pickHint: "点选方块或连线后在此编辑。",
    cancel: "取消",
    ok: "确定",
    saved: "项目已保存",
    exported: "已导出查阅页",
    previewOk: "已写入预览并打开",
    imported: "已导入项目 JSON",
    merged: "已合并到当前项目",
    needName: "请输入名称",
    catTitle: "新分类名称",
    nodeTitle: "新节点名称",
    axisTitle: "新视图轴名称（将出现在左侧切换栏）",
    fieldTitle: "名称",
    fieldTitleEn: "英文名称",
    fieldSummary: "简短说明",
    fieldSummaryEn: "英文说明",
    fieldHome: "归属",
    fieldColor: "颜色",
    fieldDocs: "文档链接（每行 标签|网址）",
    fieldLabel: "连线标签",
    fieldLabelEn: "连线英文标签",
    confirmDel: "删除当前选中项？输入名称确认，或直接确定。",
    statusReady: "就绪",
    treeEmpty: "还没有分类。点「加分类」或导入 JSON。",
    importMode: "导入方式：输入 replace 覆盖，或 merge 合并",
    invalidJson: "无法解析该 JSON",
    newDone: "已新建空白项目",
    untitled: "未命名项目",
    exportTitle: "导出查阅包",
    exAutoLang: "按浏览器语言自动中英切换（默认开）",
    exPreferEn: "无浏览器匹配时优先显示英文（默认开）",
    exDefaultAxis: "默认显示的模式",
    exDest: "导出位置",
    exPick: "选择位置",
    exGo: "开始导出",
    packTitle: "正在导出",
    exportDone: "导出完成",
    exportWhere: "查阅包已写到：",
    openFolder: "打开文件夹",
    packHtml: "写入双语查阅页",
    packZip: "打包 HTML zip",
  },
  en: {
    appName: "Game Correspond Desk",
    appTag: "Edit the correspondence map and export the audit page",
    themeGold: "Gold",
    themeLight: "Light",
    remember: "Remember choices",
    axisSystem: "Systems",
    axisDiscipline: "Disciplines",
    addAxis: "Add axis",
    addCat: "Add category",
    addNode: "Add node",
    delete: "Delete",
    hintLink: "Drag a port onto another block to add a correspondence line",
    save: "Save project",
    preview: "Preview page",
    export: "Export HTML",
    importJson: "Import JSON",
    newProject: "New",
    outline: "Outline",
    inspector: "Sidebar",
    pickHint: "Select a block or line to edit it here.",
    cancel: "Cancel",
    ok: "OK",
    saved: "Project saved",
    exported: "Audit page exported",
    previewOk: "Preview written and opened",
    imported: "Project JSON imported",
    merged: "Merged into the current project",
    needName: "Enter a name",
    catTitle: "New category name",
    nodeTitle: "New node name",
    axisTitle: "New axis name (appears in the left switcher)",
    fieldTitle: "Title",
    fieldTitleEn: "English title",
    fieldSummary: "Short note",
    fieldSummaryEn: "English note",
    fieldHome: "Home",
    fieldColor: "Color",
    fieldDocs: "Doc links (one label|url per line)",
    fieldLabel: "Line label",
    fieldLabelEn: "English line label",
    confirmDel: "Delete the current selection? Enter the name to confirm, or press OK.",
    statusReady: "Ready",
    treeEmpty: "No categories yet. Add one or import JSON.",
    importMode: "Import mode: type replace to overwrite, or merge to combine",
    invalidJson: "Could not parse that JSON",
    newDone: "Blank project created",
    untitled: "Untitled project",
    exportTitle: "Export audit pack",
    exAutoLang: "Auto-switch Chinese / English from the browser language (on by default)",
    exPreferEn: "Prefer English when the browser language is not Chinese (on by default)",
    exDefaultAxis: "Default view",
    exDest: "Export location",
    exPick: "Choose folder",
    exGo: "Start export",
    packTitle: "Exporting",
    exportDone: "Export complete",
    exportWhere: "Audit pack written to:",
    openFolder: "Open folder",
    packHtml: "Write bilingual viewer",
    packZip: "Pack HTML zip",
  },
};

const SLUG = "game-correspond-desk";
let lang = "zh";
let graph = null;
let prefs = { theme: "gold", remember: true, lastExportDir: "", lastProjectName: "", axis: "system" };
let selected = { kind: null, id: null };
let engine = null;

function t(key) {
  return (I18N[lang] && I18N[lang][key]) || (I18N.en[key] || I18N.zh[key] || key);
}

function detectUiLang() {
  const saved = localStorage.getItem("aio.uiLang");
  if (saved === "zh" || saved === "en") return saved;
  return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.getElementById("langZh").classList.toggle("on", lang === "zh");
  document.getElementById("langEn").classList.toggle("on", lang === "en");
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = t("appName");
  if (engine) engine.setLang(lang);
  renderAxes();
  renderTree();
  renderInspector();
}

function applyTheme(theme) {
  const next = theme === "light" ? "light" : "gold";
  document.documentElement.setAttribute("data-theme", next);
  document.getElementById("themeSwitch").dataset.on = next;
  prefs.theme = next;
}

function persistPrefs() {
  localStorage.setItem("aio.uiLang", lang);
  if (!document.getElementById("rememberPrefs").checked) return;
  localStorage.setItem(SLUG + ".prefs", JSON.stringify(prefs));
  fetch("/api/prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  }).catch(() => {});
}

function setStatus(text) {
  document.getElementById("statusText").textContent = text;
}

function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 8);
}

function axes() {
  return CorrespondCanvas.axisList(graph);
}

function currentTree() {
  return CorrespondCanvas.treeFor(graph, prefs.axis);
}

function displayName() {
  if (!graph) return "";
  if (lang === "en") return graph.projectNameEn || graph.projectName || "";
  return graph.projectNameZh || graph.projectName || "";
}

function flattenTree(list, out, prefix) {
  (list || []).forEach((n) => {
    const label = CorrespondCanvas.itemTitle(n, lang);
    out.push({ id: n.id, title: (prefix ? prefix + " / " : "") + label });
    if (n.children) flattenTree(n.children, out, (prefix ? prefix + " / " : "") + label);
  });
  return out;
}

function findAndMutate(list, id, fn) {
  for (let i = 0; i < (list || []).length; i += 1) {
    if (list[i].id === id) {
      fn(list, i);
      return true;
    }
    if (list[i].children && findAndMutate(list[i].children, id, fn)) return true;
  }
  return false;
}

function syncLegacyTrees() {
  const list = axes();
  const sys = list.find((a) => a.id === "system");
  const dis = list.find((a) => a.id === "discipline");
  graph.systemTree = sys ? sys.tree : list[0] ? list[0].tree : [];
  graph.disciplineTree = dis ? dis.tree : [];
  graph.axes = list;
}

function promptModal(title, value) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal");
    document.getElementById("modalTitle").textContent = title;
    const input = document.getElementById("modalInput");
    input.value = value || "";
    modal.classList.remove("hide");
    input.focus();
    function close(ok) {
      modal.classList.add("hide");
      document.getElementById("modalOk").onclick = null;
      document.getElementById("modalCancel").onclick = null;
      resolve(ok ? input.value.trim() : null);
    }
    document.getElementById("modalOk").onclick = () => close(true);
    document.getElementById("modalCancel").onclick = () => close(false);
    input.onkeydown = (ev) => {
      if (ev.key === "Enter") close(true);
      if (ev.key === "Escape") close(false);
    };
  });
}

function renderAxes() {
  const host = document.getElementById("axisSwitch");
  if (!host || !graph) return;
  host.innerHTML = "";
  axes().forEach((axis) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.axis = axis.id;
    btn.textContent = CorrespondCanvas.itemTitle(axis, lang);
    if (axis.id === prefs.axis) btn.classList.add("on");
    btn.addEventListener("click", () => setAxis(axis.id));
    host.appendChild(btn);
  });
}

function renderTree() {
  const root = document.getElementById("treeRoot");
  if (!graph) return;
  const tree = currentTree() || [];
  root.innerHTML = "";
  if (!tree.length) {
    root.innerHTML = `<p class="muted">${t("treeEmpty")}</p>`;
    document.getElementById("treeMeta").textContent = String((graph.nodes || []).length);
    return;
  }
  function add(list, parent) {
    list.forEach((item) => {
      const block = document.createElement("div");
      const row = document.createElement("div");
      row.className = "tree-row";
      if (selected.kind === "cat" && selected.id === item.id) row.classList.add("on");
      const under = (graph.nodes || []).filter((n) => {
        const leaf = CorrespondCanvas.homeOf(n, prefs.axis);
        const path = CorrespondCanvas.ancestorPath(currentTree(), leaf).map((x) => x.id);
        return path.includes(item.id);
      });
      row.innerHTML = `<span class="dot" style="background:${item.color || "var(--gold)"}"></span><span>${CorrespondCanvas.itemTitle(item, lang)}</span><small>${under.length}</small>`;
      row.addEventListener("click", () => {
        selected = { kind: "cat", id: item.id };
        if (under.length === 1) engine.focusNode(under[0].id);
        else engine.focusGroup(item.id);
        renderTree();
        renderInspector();
      });
      block.appendChild(row);
      if (item.children && item.children.length) {
        const kids = document.createElement("div");
        kids.className = "tree-branch";
        block.appendChild(kids);
        add(item.children, kids);
      }
      parent.appendChild(block);
    });
  }
  add(tree, root);
  document.getElementById("treeMeta").textContent = String((graph.nodes || []).length);
}

function renderInspector() {
  const box = document.getElementById("inspector");
  if (selected.kind === "node") {
    const node = (graph.nodes || []).find((n) => n.id === selected.id);
    if (!node) {
      box.innerHTML = `<p class="muted">${t("pickHint")}</p>`;
      return;
    }
    const homeFields = axes()
      .map((axis) => {
        const opts = flattenTree(axis.tree || [], [], "")
          .map((o) => {
            const cur = CorrespondCanvas.homeOf(node, axis.id);
            return `<option value="${o.id}" ${cur === o.id ? "selected" : ""}>${escapeHtml(o.title)}</option>`;
          })
          .join("");
        return `<label>${t("fieldHome")} · ${escapeHtml(CorrespondCanvas.itemTitle(axis, lang))}</label>
          <select data-home="${axis.id}">${opts}</select>`;
      })
      .join("");
    const docs = ((node.data.docs || []).map((d) => `${d.label || ""}|${d.url || ""}`).join("\n"));
    box.innerHTML = `
      <label>${t("fieldTitle")}</label>
      <input id="fTitle" value="${escapeAttr(node.data.titleZh || node.data.title || "")}" />
      <label>${t("fieldTitleEn")}</label>
      <input id="fTitleEn" value="${escapeAttr(node.data.titleEn || "")}" />
      <label>${t("fieldSummary")}</label>
      <textarea id="fSummary">${escapeHtml(node.data.summaryZh || node.data.summary || "")}</textarea>
      <label>${t("fieldSummaryEn")}</label>
      <textarea id="fSummaryEn">${escapeHtml(node.data.summaryEn || "")}</textarea>
      ${homeFields}
      <label>${t("fieldColor")}</label>
      <input id="fColor" type="color" value="${node.data.color || "#e7c07a"}" />
      <label>${t("fieldDocs")}</label>
      <textarea id="fDocs">${escapeHtml(docs)}</textarea>
    `;
    const bind = () => {
      node.data.titleZh = document.getElementById("fTitle").value;
      node.data.titleEn = document.getElementById("fTitleEn").value;
      node.data.title = lang === "en" ? node.data.titleEn || node.data.titleZh : node.data.titleZh || node.data.titleEn;
      node.data.summaryZh = document.getElementById("fSummary").value;
      node.data.summaryEn = document.getElementById("fSummaryEn").value;
      node.data.summary = lang === "en" ? node.data.summaryEn || node.data.summaryZh : node.data.summaryZh;
      node.data.homes = node.data.homes || {};
      box.querySelectorAll("select[data-home]").forEach((sel) => {
        node.data.homes[sel.dataset.home] = sel.value;
        if (sel.dataset.home === "system") node.data.systemId = sel.value;
        if (sel.dataset.home === "discipline") node.data.disciplineId = sel.value;
      });
      node.data.color = document.getElementById("fColor").value;
      node.data.docs = document
        .getElementById("fDocs")
        .value.split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split("|");
          return { label: (parts[0] || "").trim(), url: (parts.slice(1).join("|") || "").trim() };
        });
      engine.paint();
      renderTree();
    };
    box.querySelectorAll("input, textarea, select").forEach((el) => el.addEventListener("change", bind));
    box.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", bind));
    return;
  }
  if (selected.kind === "link") {
    const link = (graph.links || []).find((l) => l.id === selected.id);
    if (!link) {
      box.innerHTML = `<p class="muted">${t("pickHint")}</p>`;
      return;
    }
    box.innerHTML = `
      <label>${t("fieldLabel")}</label>
      <input id="fLabel" value="${escapeAttr(link.labelZh || link.label || "")}" />
      <label>${t("fieldLabelEn")}</label>
      <input id="fLabelEn" value="${escapeAttr(link.labelEn || "")}" />
    `;
    const bindLink = () => {
      link.labelZh = document.getElementById("fLabel").value;
      link.labelEn = document.getElementById("fLabelEn").value;
      link.label = lang === "en" ? link.labelEn || link.labelZh : link.labelZh || link.labelEn;
      engine.paint();
    };
    document.getElementById("fLabel").addEventListener("input", bindLink);
    document.getElementById("fLabelEn").addEventListener("input", bindLink);
    return;
  }
  box.innerHTML = `<p class="muted">${t("pickHint")}</p>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

async function addAxis() {
  const name = await promptModal(t("axisTitle"), "");
  if (!name) return;
  const id = uid("axis");
  graph.axes = axes();
  graph.axes.push({ id, title: name, titleZh: name, titleEn: name, tree: [] });
  if (!graph.cameras) graph.cameras = {};
  graph.cameras[id] = { x: 40, y: 24, scale: 1 };
  (graph.nodes || []).forEach((node) => {
    node.data.pos = node.data.pos || {};
    if (!node.data.pos[id]) node.data.pos[id] = { x: node.x || 80, y: node.y || 80 };
    node.data.homes = node.data.homes || {};
  });
  syncLegacyTrees();
  setAxis(id);
}

async function addCategory() {
  const name = await promptModal(t("catTitle"), "");
  if (!name) return;
  const item = { id: uid("cat"), title: name, titleZh: name, titleEn: name, children: [] };
  const tree = currentTree();
  const axis = axes().find((a) => a.id === prefs.axis);
  if (selected.kind === "cat") {
    const ok = findAndMutate(tree, selected.id, (list, i) => {
      list[i].children = list[i].children || [];
      list[i].children.push(item);
    });
    if (!ok) tree.push(item);
  } else {
    tree.push(item);
  }
  if (axis) axis.tree = tree;
  syncLegacyTrees();
  renderTree();
  engine.paint();
}

async function addNode() {
  const name = await promptModal(t("nodeTitle"), "");
  if (!name) return;
  const homes = {};
  axes().forEach((axis) => {
    const leaf = flattenTree(axis.tree || [], [], "").pop();
    if (selected.kind === "cat" && axis.id === prefs.axis) homes[axis.id] = selected.id;
    else if (leaf) homes[axis.id] = leaf.id;
  });
  const cam = (graph.cameras && graph.cameras[prefs.axis]) || { x: 40, y: 24, scale: 1 };
  const x = Math.round((220 - cam.x) / cam.scale / 8) * 8;
  const y = Math.round((160 - cam.y) / cam.scale / 8) * 8;
  const pos = {};
  axes().forEach((axis) => {
    pos[axis.id] = { x, y };
  });
  const node = {
    id: uid("n"),
    type: "correspond.item",
    x,
    y,
    data: {
      title: name,
      titleZh: name,
      titleEn: name,
      summary: "",
      summaryZh: "",
      summaryEn: "",
      docs: [],
      systemId: homes.system || "",
      disciplineId: homes.discipline || "",
      homes,
      color: "#e7c07a",
      pos,
    },
  };
  graph.nodes.push(node);
  selected = { kind: "node", id: node.id };
  engine.setGraph(graph);
  renderTree();
  renderInspector();
}

async function deleteSelected() {
  if (!selected.id) return;
  const ok = await promptModal(t("confirmDel"), selected.id);
  if (ok === null) return;
  if (selected.kind === "node") {
    graph.nodes = graph.nodes.filter((n) => n.id !== selected.id);
    graph.links = graph.links.filter((l) => l.from !== selected.id && l.to !== selected.id);
  } else if (selected.kind === "link") {
    graph.links = graph.links.filter((l) => l.id !== selected.id);
  } else if (selected.kind === "cat") {
    findAndMutate(currentTree(), selected.id, (list, i) => list.splice(i, 1));
    syncLegacyTrees();
  }
  selected = { kind: null, id: null };
  engine.setGraph(graph);
  renderTree();
  renderInspector();
}

function loadGraph(next) {
  graph = next;
  if (!graph.axes || !graph.axes.length) graph.axes = CorrespondCanvas.axisList(graph);
  prefs.axis = graph.axis && axes().some((a) => a.id === graph.axis) ? graph.axis : axes()[0].id;
  document.getElementById("projectName").value = displayName();
  engine.setLang(lang);
  engine.setGraph(graph);
  engine.setAxis(prefs.axis, false);
  renderAxes();
  renderTree();
  renderInspector();
}

async function saveProject() {
  engine.store();
  const typed = document.getElementById("projectName").value.trim();
  if (lang === "en") graph.projectNameEn = typed || graph.projectNameEn;
  else graph.projectNameZh = typed || graph.projectNameZh;
  graph.projectName = graph.projectNameZh || graph.projectNameEn || t("untitled");
  graph.axis = prefs.axis;
  syncLegacyTrees();
  const res = await fetch("/api/graph", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });
  if (!res.ok) throw new Error("save failed");
  graph = await res.json();
  await fetch("/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });
  setStatus(t("saved"));
}

async function previewPage() {
  await saveProject();
  await fetch("/api/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });
  window.open("/viewer", "_blank");
  setStatus(t("previewOk"));
}

function openExportModal() {
  document.getElementById("exAutoLang").checked = prefs.exportAutoLang !== false;
  document.getElementById("exPreferEn").checked = prefs.exportPreferEn !== false;
  document.getElementById("exAxis").value = prefs.exportDefaultAxis || "system";
  document.getElementById("exDest").value = prefs.lastExportDir || "";
  document.getElementById("exportModal").classList.remove("hide");
}

async function pickExportFolder() {
  let folder = "";
  try {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.pick_folder) {
      folder = await window.pywebview.api.pick_folder();
    }
  } catch (err) {
    folder = "";
  }
  if (!folder) {
    try {
      const res = await fetch("/api/pick-folder", { method: "POST" });
      const data = await res.json();
      folder = (data && data.path) || "";
    } catch (err) {
      folder = "";
    }
  }
  if (!folder) {
    const typed = await promptModal(t("exDest"), document.getElementById("exDest").value || prefs.lastExportDir || "");
    if (typed) folder = typed;
  }
  if (folder) {
    document.getElementById("exDest").value = folder;
    prefs.lastExportDir = folder;
    persistPrefs();
    setStatus(folder);
  }
}

function stageTarget(stage) {
  const map = { prepare: 16, html: 38, json: 48, zip: 82, done: 100 };
  return map[stage] || 24;
}

async function runExportJob() {
  await saveProject();
  const dest = document.getElementById("exDest").value.trim();
  const payload = {
    destDir: dest,
    graph,
    autoLang: document.getElementById("exAutoLang").checked,
    preferEn: document.getElementById("exPreferEn").checked,
    defaultAxis: document.getElementById("exAxis").value,
  };
  prefs.lastExportDir = dest;
  prefs.exportAutoLang = payload.autoLang;
  prefs.exportPreferEn = payload.preferEn;
  prefs.exportDefaultAxis = payload.defaultAxis;
  persistPrefs();
  document.getElementById("exportModal").classList.add("hide");
  const overlay = document.getElementById("packOverlay");
  const log = document.getElementById("packLog");
  const bar = document.getElementById("packBar");
  const pct = document.getElementById("packPct");
  const stageEl = document.getElementById("packStage");
  overlay.classList.remove("hide");
  log.textContent = "";
  let packShown = 0;
  let packTarget = 8;
  const tick = setInterval(() => {
    const gap = packTarget - packShown;
    packShown += Math.max(0.15, gap / 18);
    if (packShown > packTarget) packShown = packTarget;
    bar.style.width = packShown + "%";
    pct.textContent = Math.round(packShown) + "%";
  }, 80);
  function addLine(msg) {
    log.textContent += msg + "\n";
    log.scrollTop = log.scrollHeight;
  }
  let finished = null;
  try {
    const res = await fetch("/api/export/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const chunks = buf.split("\n\n");
      buf = chunks.pop() || "";
      chunks.forEach((chunk) => {
        const line = chunk.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("");
        if (!line) return;
        let ev;
        try { ev = JSON.parse(line); } catch (e) { return; }
        if (ev.stage) {
          packTarget = stageTarget(ev.stage);
          stageEl.textContent = ev.message || ev.stage;
        }
        if (ev.message) addLine(ev.message);
        if (ev.event === "done") finished = ev;
        if (ev.event === "error") throw new Error(ev.message || "export failed");
      });
    }
  } catch (err) {
    addLine(String(err));
    packTarget = 100;
    await new Promise((r) => setTimeout(r, 900));
    overlay.classList.add("hide");
    clearInterval(tick);
    setStatus(String(err));
    return;
  }
  packTarget = 100;
  await new Promise((r) => setTimeout(r, 400));
  clearInterval(tick);
  overlay.classList.add("hide");
  const folder = (finished && (finished.folder || finished.parent)) || dest;
  document.getElementById("donePath").value = folder;
  document.getElementById("doneModal").classList.remove("hide");
  setStatus(`${t("exported")} · ${folder}`);
}

async function newProject() {
  const data = await fetch("/api/project/new", { method: "POST" }).then((r) => r.json());
  selected = { kind: null, id: null };
  loadGraph(data);
  setStatus(t("newDone"));
}

async function importChosenFile(file) {
  let raw;
  try {
    raw = JSON.parse(await file.text());
  } catch (err) {
    setStatus(t("invalidJson"));
    return;
  }
  const modeRaw = await promptModal(t("importMode"), "replace");
  if (modeRaw === null) return;
  const mode = String(modeRaw).toLowerCase().includes("merge") ? "merge" : "replace";
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw, mode }),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus(data.detail || t("invalidJson"));
    return;
  }
  selected = { kind: null, id: null };
  loadGraph(data);
  setStatus(mode === "merge" ? t("merged") : t("imported"));
}

function bindChrome() {
  document.getElementById("themeGold").onclick = () => {
    applyTheme("gold");
    persistPrefs();
  };
  document.getElementById("themeLight").onclick = () => {
    applyTheme("light");
    persistPrefs();
  };
  document.getElementById("langZh").onclick = () => {
    lang = "zh";
    localStorage.setItem("aio.uiLang", "zh");
    document.getElementById("projectName").value = displayName();
    applyI18n();
  };
  document.getElementById("langEn").onclick = () => {
    lang = "en";
    localStorage.setItem("aio.uiLang", "en");
    document.getElementById("projectName").value = displayName();
    applyI18n();
  };
  document.getElementById("rememberPrefs").onchange = (ev) => {
    prefs.remember = ev.target.checked;
    persistPrefs();
  };
  document.getElementById("btnAddAxis").onclick = addAxis;
  document.getElementById("btnAddCat").onclick = addCategory;
  document.getElementById("btnAddNode").onclick = addNode;
  document.getElementById("btnDel").onclick = deleteSelected;
  document.getElementById("btnSave").onclick = () => saveProject().catch((err) => setStatus(String(err)));
  document.getElementById("btnPreview").onclick = () => previewPage().catch((err) => setStatus(String(err)));
  document.getElementById("btnExport").onclick = openExportModal;
  document.getElementById("exCancel").onclick = () => document.getElementById("exportModal").classList.add("hide");
  document.getElementById("exPick").onclick = () => pickExportFolder().catch((err) => setStatus(String(err)));
  document.getElementById("exGo").onclick = () => runExportJob().catch((err) => setStatus(String(err)));
  document.getElementById("doneClose").onclick = () => document.getElementById("doneModal").classList.add("hide");
  document.getElementById("doneOpen").onclick = () => {
    const path = document.getElementById("donePath").value;
    fetch("/api/open-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  };
  document.getElementById("btnNew").onclick = () => newProject().catch((err) => setStatus(String(err)));
  document.getElementById("btnImport").onclick = () => document.getElementById("importFile").click();
  document.getElementById("importFile").onchange = (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (file) importChosenFile(file).catch((err) => setStatus(String(err)));
  };
  document.getElementById("projectName").onchange = () => {
    const typed = document.getElementById("projectName").value;
    if (lang === "en") graph.projectNameEn = typed;
    else graph.projectNameZh = typed;
    graph.projectName = graph.projectNameZh || graph.projectNameEn;
    prefs.lastProjectName = graph.projectName;
    persistPrefs();
  };
}

function setAxis(axis) {
  prefs.axis = axis;
  graph.axis = axis;
  engine.setAxis(axis, true);
  renderAxes();
  renderTree();
  persistPrefs();
}

async function boot() {
  lang = detectUiLang();
  const defaults = await fetch("/api/defaults").then((r) => r.json());
  document.getElementById("appVersion").textContent = "v" + (defaults.version || "1.1.0");
  const local = (() => {
    try {
      return JSON.parse(localStorage.getItem(SLUG + ".prefs") || "null");
    } catch (e) {
      return null;
    }
  })();
  prefs = Object.assign({}, prefs, defaults.prefs || {}, local || {});
  document.getElementById("rememberPrefs").checked = prefs.remember !== false;
  applyTheme(prefs.theme || "gold");
  graph = await fetch("/api/graph").then((r) => r.json());
  prefs.axis = graph.axis || prefs.axis || "system";
  engine = CorrespondCanvas.create(document.getElementById("canvasHost"), {
    mode: "edit",
    axis: prefs.axis,
    lang,
    onEvent: function (name, detail) {
      if (name === "select") {
        selected = detail.id ? { kind: "node", id: detail.id } : { kind: null, id: null };
        renderInspector();
        renderTree();
      }
      if (name === "select-link") {
        selected = { kind: "link", id: detail.id };
        renderInspector();
      }
      if (name === "link-end") {
        graph.links.push({
          id: uid("l"),
          from: detail.from,
          fromSock: detail.fromSock || "out",
          to: detail.to,
          toSock: detail.toSock || "in",
          label: "",
          labelZh: "",
          labelEn: "",
        });
        engine.setGraph(graph);
      }
      if (name === "moved") engine.store();
    },
  });
  applyI18n();
  loadGraph(graph);
  bindChrome();
  setStatus(t("statusReady"));
}

boot().catch((err) => {
  setStatus(String(err));
});
