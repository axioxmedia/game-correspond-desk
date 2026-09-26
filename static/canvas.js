/* Dual-axis correspondence canvas. Shared by editor and exported viewer. */
(function (global) {
  const NODE_W = 196;
  const NODE_H = 86;
  const GROUP_PAD = 28;

  function walkTree(nodes, fn, parent, depth) {
    (nodes || []).forEach((n) => {
      fn(n, parent || null, depth || 0);
      if (n.children && n.children.length) walkTree(n.children, fn, n, (depth || 0) + 1);
    });
  }

  function findTree(nodes, id) {
    let hit = null;
    walkTree(nodes, (n) => {
      if (n.id === id) hit = n;
    });
    return hit;
  }

  function ancestorPath(nodes, id) {
    const trail = [];
    function dive(list, stack) {
      for (const n of list || []) {
        const next = stack.concat(n);
        if (n.id === id) {
          trail.push(...next);
          return true;
        }
        if (n.children && dive(n.children, next)) return true;
      }
      return false;
    }
    dive(nodes, []);
    return trail;
  }

  function axisList(graph) {
    if (graph && Array.isArray(graph.axes) && graph.axes.length) return graph.axes;
    return [
      { id: "system", titleZh: "系统视图", titleEn: "Systems", tree: (graph && graph.systemTree) || [] },
      { id: "discipline", titleZh: "工种视图", titleEn: "Disciplines", tree: (graph && graph.disciplineTree) || [] },
    ];
  }

  function treeFor(graph, axisId) {
    const axis = axisList(graph).find((a) => a.id === axisId);
    if (axis) return axis.tree || [];
    if (axisId === "discipline") return (graph && graph.disciplineTree) || [];
    return (graph && graph.systemTree) || [];
  }

  function homeOf(node, axisId) {
    const data = (node && node.data) || {};
    if (data.homes && data.homes[axisId]) return data.homes[axisId];
    if (axisId === "discipline") return data.disciplineId || "";
    if (axisId === "system") return data.systemId || "";
    return "";
  }

  function itemTitle(item, lang) {
    if (!item) return "";
    if (lang === "en") return item.titleEn || item.title || item.titleZh || item.id || "";
    return item.titleZh || item.title || item.titleEn || item.id || "";
  }

  function topColor(tree, id, fallback) {
    const path = ancestorPath(tree, id);
    for (const n of path) {
      if (n.color) return n.color;
    }
    return fallback || "#e7c07a";
  }

  function applyAxisPositions(graph, axis) {
    (graph.nodes || []).forEach((node) => {
      const pos = (node.data && node.data.pos && node.data.pos[axis]) || { x: node.x || 0, y: node.y || 0 };
      node.x = pos.x;
      node.y = pos.y;
    });
  }

  function storeAxisPositions(graph, axis) {
    (graph.nodes || []).forEach((node) => {
      if (!node.data) node.data = {};
      if (!node.data.pos) node.data.pos = { system: { x: 0, y: 0 }, discipline: { x: 0, y: 0 } };
      if (!node.data.pos[axis]) node.data.pos[axis] = { x: 0, y: 0 };
      node.data.pos[axis].x = node.x;
      node.data.pos[axis].y = node.y;
    });
  }

  function groupsForAxis(graph, axis, lang) {
    const tree = treeFor(graph, axis);
    const buckets = new Map();
    (graph.nodes || []).forEach((node) => {
      const leaf = homeOf(node, axis);
      const path = ancestorPath(tree, leaf);
      const root = path[0];
      if (!root) return;
      if (!buckets.has(root.id)) {
        buckets.set(root.id, { id: root.id, title: itemTitle(root, lang), color: root.color || "#e7c07a", nodes: [] });
      }
      buckets.get(root.id).nodes.push(node);
    });
    const groups = [];
    buckets.forEach((g) => {
      if (!g.nodes.length) return;
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      g.nodes.forEach((n) => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + NODE_W);
        maxY = Math.max(maxY, n.y + NODE_H);
      });
      g.x = minX - GROUP_PAD;
      g.y = minY - GROUP_PAD - 18;
      g.w = maxX - minX + GROUP_PAD * 2;
      g.h = maxY - minY + GROUP_PAD * 2 + 18;
      groups.push(g);
    });
    return groups;
  }

  function createCanvas(host, options) {
    const opts = Object.assign(
      { mode: "edit", axis: "system", lang: "zh", doneMap: {}, onEvent: function () {} },
      options || {}
    );
    host.innerHTML = "";
    host.classList.add("cf-host");
    const stage = document.createElement("div");
    stage.className = "cf-stage";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("cf-wires");
    const world = document.createElement("div");
    world.className = "cf-world";
    stage.appendChild(svg);
    stage.appendChild(world);
    host.appendChild(stage);

    const state = {
      graph: { nodes: [], links: [], systemTree: [], disciplineTree: [], cameras: {}, axis: "system" },
      axis: opts.axis,
      lang: opts.lang || "zh",
      mode: opts.mode,
      camera: { x: 40, y: 24, scale: 1 },
      selected: null,
      hoverLinkFrom: null,
      panning: false,
      dragging: null,
      linking: null,
      doneMap: opts.doneMap || {},
      anim: null,
    };

    function emit(name, detail) {
      opts.onEvent(name, detail);
    }

    function cam() {
      const axis = state.axis;
      if (!state.graph.cameras) state.graph.cameras = {};
      if (!state.graph.cameras[axis]) state.graph.cameras[axis] = { x: 40, y: 24, scale: 1 };
      return state.graph.cameras[axis];
    }

    function applyCam() {
      const c = cam();
      world.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.scale})`;
      svg.style.transform = world.style.transform;
      const size = 22 * c.scale;
      const ox = ((c.x % size) + size) % size;
      const oy = ((c.y % size) + size) % size;
      stage.style.backgroundPosition = `${ox}px ${oy}px`;
      stage.style.backgroundSize = `${size}px ${size}px`;
    }

    function nodeEl(id) {
      return world.querySelector(`[data-node="${id}"]`);
    }

    function paint() {
      applyAxisPositions(state.graph, state.axis);
      const groups = groupsForAxis(state.graph, state.axis, state.lang);
      world.innerHTML = "";
      groups.forEach((g) => {
        const box = document.createElement("div");
        box.className = "cf-group";
        box.dataset.group = g.id;
        box.style.left = g.x + "px";
        box.style.top = g.y + "px";
        box.style.width = g.w + "px";
        box.style.height = g.h + "px";
        box.style.setProperty("--g", g.color);
        box.innerHTML = `<header>${escapeHtml(g.title)}</header>`;
        box.addEventListener("mousedown", (ev) => {
          if (ev.target === box || ev.target.tagName === "HEADER") {
            emit("focus-group", { id: g.id });
          }
        });
        world.appendChild(box);
      });
      (state.graph.nodes || []).forEach((node) => {
        const el = document.createElement("article");
        el.className = "cf-node";
        el.dataset.node = node.id;
        if (state.selected === node.id) el.classList.add("is-selected");
        if (state.doneMap[node.id]) el.classList.add("is-done");
        const color = (node.data && node.data.color) || "#e7c07a";
        el.style.left = node.x + "px";
        el.style.top = node.y + "px";
        el.style.setProperty("--n", color);
        const tree = treeFor(state.graph, state.axis);
        const leafId = homeOf(node, state.axis);
        const leaf = findTree(tree, leafId);
        const sub = leaf ? itemTitle(leaf, state.lang) : "";
        const checked = state.doneMap[node.id] ? "checked" : "";
        el.innerHTML = `
          <label class="cf-check" title="done"><input type="checkbox" ${checked} /><i></i></label>
          <h3>${escapeHtml(itemTitle({ title: node.data && node.data.title, titleZh: node.data && node.data.titleZh, titleEn: node.data && node.data.titleEn, id: node.id }, state.lang))}</h3>
          <p>${escapeHtml(sub)}</p>
          <span class="cf-port cf-port-out" data-port="out"></span>
          <span class="cf-port cf-port-in" data-port="in"></span>
        `;
        bindNode(el, node);
        world.appendChild(el);
      });
      paintWires();
      applyCam();
    }

    function bindNode(el, node) {
      el.addEventListener("mousedown", (ev) => {
        if (ev.target.closest(".cf-check")) return;
        if (ev.target.closest(".cf-port")) return;
        ev.stopPropagation();
        state.selected = node.id;
        emit("select", { id: node.id });
        paintSelection();
        if (state.mode !== "edit") return;
        state.dragging = {
          id: node.id,
          dx: ev.clientX,
          dy: ev.clientY,
          x0: node.x,
          y0: node.y,
        };
      });
      const box = el.querySelector("input[type=checkbox]");
      box.addEventListener("click", (ev) => ev.stopPropagation());
      box.addEventListener("change", (ev) => {
        ev.stopPropagation();
        state.doneMap[node.id] = !!box.checked;
        el.classList.toggle("is-done", !!box.checked);
        emit("done", { id: node.id, done: !!box.checked, map: Object.assign({}, state.doneMap) });
      });
      el.querySelectorAll(".cf-port").forEach((port) => {
        port.addEventListener("mousedown", (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          if (state.mode !== "edit") return;
          state.linking = { from: node.id, fromSock: port.dataset.port, x: ev.clientX, y: ev.clientY };
          emit("link-start", { from: node.id });
        });
      });
    }

    function paintSelection() {
      world.querySelectorAll(".cf-node").forEach((el) => {
        el.classList.toggle("is-selected", el.dataset.node === state.selected);
      });
      const neighbors = new Set();
      if (state.selected) {
        (state.graph.links || []).forEach((l) => {
          if (l.from === state.selected) neighbors.add(l.to);
          if (l.to === state.selected) neighbors.add(l.from);
        });
      }
      world.querySelectorAll(".cf-node").forEach((el) => {
        el.classList.toggle("is-neighbor", neighbors.has(el.dataset.node));
      });
      paintWires();
    }

    function centerOf(node, sock) {
      const x = node.x + (sock === "in" ? 0 : sock === "out" ? NODE_W : NODE_W / 2);
      const y = node.y + NODE_H / 2;
      return { x, y };
    }

    function paintWires() {
      const links = state.graph.links || [];
      const nodes = new Map((state.graph.nodes || []).map((n) => [n.id, n]));
      let maxX = 1600,
        maxY = 900;
      (state.graph.nodes || []).forEach((n) => {
        maxX = Math.max(maxX, n.x + 400);
        maxY = Math.max(maxY, n.y + 300);
      });
      svg.setAttribute("width", String(maxX));
      svg.setAttribute("height", String(maxY));
      svg.innerHTML = "";
      links.forEach((link) => {
        const a = nodes.get(link.from);
        const b = nodes.get(link.to);
        if (!a || !b) return;
        const p1 = centerOf(a, link.fromSock || "out");
        const p2 = centerOf(b, link.toSock || "in");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const mid = (p1.x + p2.x) / 2;
        path.setAttribute("d", `M ${p1.x} ${p1.y} C ${mid} ${p1.y}, ${mid} ${p2.y}, ${p2.x} ${p2.y}`);
        path.setAttribute("class", "cf-wire");
        if (state.selected && (link.from === state.selected || link.to === state.selected)) {
          path.classList.add("is-hot");
        }
        path.dataset.link = link.id;
        path.addEventListener("mousedown", (ev) => {
          ev.stopPropagation();
          emit("select-link", { id: link.id });
        });
        svg.appendChild(path);
        if (link.label) {
          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.setAttribute("x", String(mid));
          label.setAttribute("y", String((p1.y + p2.y) / 2 - 6));
          label.setAttribute("class", "cf-wire-label");
          label.textContent = link.label;
          svg.appendChild(label);
        }
      });
    }

    stage.addEventListener("mousedown", (ev) => {
      if (ev.target === stage || ev.target === svg) {
        state.selected = null;
        paintSelection();
        emit("select", { id: null });
        state.panning = { x: ev.clientX, y: ev.clientY, cx: cam().x, cy: cam().y };
      }
    });

    window.addEventListener("mousemove", (ev) => {
      if (state.panning) {
        cam().x = state.panning.cx + (ev.clientX - state.panning.x);
        cam().y = state.panning.cy + (ev.clientY - state.panning.y);
        applyCam();
      }
      if (state.dragging) {
        const c = cam();
        const nx = state.dragging.x0 + (ev.clientX - state.dragging.dx) / c.scale;
        const ny = state.dragging.y0 + (ev.clientY - state.dragging.dy) / c.scale;
        const node = (state.graph.nodes || []).find((n) => n.id === state.dragging.id);
        if (node) {
          node.x = Math.round(nx / 8) * 8;
          node.y = Math.round(ny / 8) * 8;
          storeAxisPositions(state.graph, state.axis);
          const el = nodeEl(node.id);
          if (el) {
            el.style.left = node.x + "px";
            el.style.top = node.y + "px";
          }
          const groups = groupsForAxis(state.graph, state.axis, state.lang);
          world.querySelectorAll(".cf-group").forEach((box) => {
            const g = groups.find((x) => x.id === box.dataset.group);
            if (!g) return;
            box.style.left = g.x + "px";
            box.style.top = g.y + "px";
            box.style.width = g.w + "px";
            box.style.height = g.h + "px";
          });
          paintWires();
        }
      }
    });

    window.addEventListener("mouseup", (ev) => {
      if (state.panning) {
        state.panning = false;
        emit("camera", { camera: Object.assign({}, cam()) });
      }
      if (state.dragging) {
        emit("moved", { id: state.dragging.id });
        state.dragging = null;
        paint();
      }
      if (state.linking) {
        const target = ev.target && ev.target.closest && ev.target.closest(".cf-node");
        const toId = target && target.dataset.node;
        if (toId && toId !== state.linking.from) {
          emit("link-end", { from: state.linking.from, fromSock: state.linking.fromSock, to: toId, toSock: "in" });
        }
        state.linking = null;
      }
    });

    stage.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        const c = cam();
        const next = ev.deltaY > 0 ? c.scale * 0.92 : c.scale * 1.08;
        c.scale = Math.min(1.8, Math.max(0.4, next));
        applyCam();
        emit("camera", { camera: Object.assign({}, c) });
      },
      { passive: false }
    );

    function setGraph(graph) {
      state.graph = graph;
      if (!state.graph.cameras) state.graph.cameras = {};
      applyAxisPositions(state.graph, state.axis);
      paint();
    }

    function setAxis(axis, animate) {
      storeAxisPositions(state.graph, state.axis);
      const from = {};
      (state.graph.nodes || []).forEach((n) => {
        from[n.id] = { x: n.x, y: n.y };
      });
      state.axis = axis;
      state.graph.axis = axis;
      applyAxisPositions(state.graph, axis);
      if (!animate) {
        paint();
        return;
      }
      const to = {};
      (state.graph.nodes || []).forEach((n) => {
        to[n.id] = { x: n.x, y: n.y };
        const src = from[n.id] || to[n.id];
        n.x = src.x;
        n.y = src.y;
      });
      paint();
      const t0 = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - t0) / 280);
        const e = 1 - Math.pow(1 - p, 3);
        (state.graph.nodes || []).forEach((n) => {
          const a = from[n.id];
          const b = to[n.id];
          if (!a || !b) return;
          n.x = a.x + (b.x - a.x) * e;
          n.y = a.y + (b.y - a.y) * e;
          const el = nodeEl(n.id);
          if (el) {
            el.style.left = n.x + "px";
            el.style.top = n.y + "px";
          }
        });
        const groups = groupsForAxis(state.graph, state.axis, state.lang);
        world.querySelectorAll(".cf-group").forEach((box) => {
          const g = groups.find((x) => x.id === box.dataset.group);
          if (!g) return;
          box.style.left = g.x + "px";
          box.style.top = g.y + "px";
          box.style.width = g.w + "px";
          box.style.height = g.h + "px";
        });
        paintWires();
        if (p < 1) requestAnimationFrame(tick);
        else {
          applyAxisPositions(state.graph, state.axis);
          paint();
        }
      }
      requestAnimationFrame(tick);
    }

    function focusNode(id) {
      const node = (state.graph.nodes || []).find((n) => n.id === id);
      if (!node) return;
      state.selected = id;
      const rect = host.getBoundingClientRect();
      const c = cam();
      c.x = rect.width / 2 - (node.x + NODE_W / 2) * c.scale;
      c.y = rect.height / 2 - (node.y + NODE_H / 2) * c.scale;
      paint();
      emit("select", { id });
    }

    function focusGroup(id) {
      const groups = groupsForAxis(state.graph, state.axis, state.lang);
      const g = groups.find((x) => x.id === id);
      if (!g) return;
      const rect = host.getBoundingClientRect();
      const c = cam();
      c.x = rect.width / 2 - (g.x + g.w / 2) * c.scale;
      c.y = rect.height / 2 - (g.y + g.h / 2) * c.scale;
      applyCam();
    }

    return {
      setGraph,
      setAxis,
      setLang: function (next) {
        state.lang = next || "zh";
        paint();
      },
      setMode: function (mode) {
        state.mode = mode;
        host.dataset.mode = mode;
      },
      setDoneMap: function (map) {
        state.doneMap = map || {};
        paint();
      },
      setSelected: function (id) {
        state.selected = id;
        paintSelection();
      },
      getGraph: function () {
        storeAxisPositions(state.graph, state.axis);
        return state.graph;
      },
      focusNode,
      focusGroup,
      paint,
      store: function () {
        storeAxisPositions(state.graph, state.axis);
      },
    };
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  global.CorrespondCanvas = {
    create: createCanvas,
    applyAxisPositions,
    storeAxisPositions,
    walkTree,
    findTree,
    ancestorPath,
    axisList,
    treeFor,
    homeOf,
    itemTitle,
    NODE_W,
    NODE_H,
  };
})(window);
