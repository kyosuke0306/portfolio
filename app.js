(() => {
  "use strict";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);

  const STORAGE_KEY = "portfolio.data.v1";

  const defaultData = {
    profile: {
      name: "井川　恭輔",
      title: "フロントエンドエンジニア",
      bio: "システムエンジニアです。",
      avatar: null,
    },
    skills: [
      { label: "フロントエンド開発", status: "current", date: "", month: "", note: "" },
      { label: "UI / UX デザイン", status: "current", date: "", month: "", note: "" },
      { label: "ユーザー視点での設計", status: "current", date: "", month: "", note: "" },
      { label: "課題解決力", status: "current", date: "", month: "", note: "" },
    ],
    personality: [
      { label: "誠実", status: "current", date: "", month: "", note: "" },
      { label: "粘り強い", status: "current", date: "", month: "", note: "" },
      { label: "好奇心旺盛", status: "current", date: "", month: "", note: "" },
    ],
    certifications: [
      { label: "ITパスポート", status: "current", date: "2022", month: "", note: "" },
      { label: "基本情報技術者試験（FE）", status: "current", date: "2023", month: "", note: "" },
    ],
    career: [
      { startYear: "2025", startMonth: "4", endYear: "2026", endMonth: "3", role: "エンジニア", org: "パーソルエクセルHRパートナーズ株式会社", status: "current", note: "" },
      { startYear: "2026", startMonth: "4", endYear: "present", endMonth: "", role: "フロントエンドエンジニア", org: "島精機製作所株式会社", status: "current", note: "" },
    ],
    projects: [
      {
        title: "サンプル作品",
        description: "作品の概要や制作背景をここに入力します。プログラムでもイラストでも構いません。",
        tech: ["Web開発", "React"],
        link: "",
        thumbnail: null,
        status: "current",
        date: "2024",
        month: "",
        note: "",
      },
    ],
  };

  const YEAR_RANGE_FUTURE = 15;
  const YEAR_RANGE_PAST = 30;

  function currentYear() {
    return new Date().getFullYear();
  }

  function yearOptionsHtml(selectedYear, { withPresent = false, blankLabel = "年" } = {}) {
    const thisYear = currentYear();
    let html = `<option value=""${selectedYear ? "" : " selected"}>${blankLabel}</option>`;
    if (withPresent) {
      html += `<option value="present"${selectedYear === "present" ? " selected" : ""}>現在</option>`;
    }
    for (let y = thisYear + YEAR_RANGE_FUTURE; y >= thisYear - YEAR_RANGE_PAST; y--) {
      html += `<option value="${y}"${String(y) === String(selectedYear) ? " selected" : ""}>${y}年</option>`;
    }
    return html;
  }

  function monthOptionsHtml(selectedMonth, blankLabel = "月") {
    let html = `<option value=""${selectedMonth ? "" : " selected"}>${blankLabel}</option>`;
    for (let m = 1; m <= 12; m++) {
      html += `<option value="${m}"${String(m) === String(selectedMonth) ? " selected" : ""}>${m}月</option>`;
    }
    return html;
  }

  function normalizeYear(date) {
    const match = String(date || "").match(/\d{4}/);
    return match ? match[0] : "";
  }

  function normalizeMonth(month) {
    const m = parseInt(month, 10);
    return Number.isFinite(m) && m >= 1 && m <= 12 ? String(m) : "";
  }

  function formatYearMonth(year, month) {
    if (!year) return "";
    return month ? `${year}年${month}月` : `${year}年`;
  }

  function normalizeStatus(status) {
    return status === "ideal" ? "ideal" : "current";
  }

  function normalizeLabelItems(arr, fallback) {
    if (!Array.isArray(arr)) return structuredClone(fallback);
    return arr.map((item) =>
      typeof item === "string"
        ? { label: item, status: "current", date: "", month: "", note: "" }
        : {
            label: item.label || "",
            status: normalizeStatus(item.status),
            date: normalizeYear(item.date),
            month: normalizeMonth(item.month),
            note: item.note || "",
          }
    );
  }

  function normalizeCareer(arr) {
    if (!Array.isArray(arr)) return structuredClone(defaultData.career);
    return arr.map((c) => {
      let startYear = normalizeYear(c.startYear);
      let endYear = c.endYear === "present" ? "present" : normalizeYear(c.endYear);
      if (!startYear && !endYear && c.period) {
        // 旧データ（自由記述の期間）から年を抽出して移行
        const years = String(c.period).match(/\d{4}/g) || [];
        startYear = years[0] || "";
        endYear = /現在/.test(c.period) ? "present" : years[1] || "";
      }
      return {
        startYear,
        startMonth: normalizeMonth(c.startMonth),
        endYear,
        endMonth: endYear === "present" ? "" : normalizeMonth(c.endMonth),
        role: c.role || "",
        org: c.org || "",
        status: normalizeStatus(c.status),
        note: c.note || "",
      };
    });
  }

  function formatCareerPeriod(c) {
    const start = formatYearMonth(c.startYear, c.startMonth);
    const end = c.endYear === "present" ? "現在" : formatYearMonth(c.endYear, c.endMonth);
    if (start && end) return `${start} - ${end}`;
    return start || end;
  }

  // 年月を「年 * 12 + 月」の通し番号に変換（月未選択は年初扱い）
  function yearMonthKey(year, month, fallback) {
    const y = parseInt(year, 10);
    if (!Number.isFinite(y)) return fallback;
    const m = parseInt(month, 10);
    return y * 12 + (Number.isFinite(m) ? m - 1 : 0);
  }

  function sortCareerEntries(entries) {
    return entries.slice().sort((a, b) => {
      const keyA = yearMonthKey(a.startYear, a.startMonth, Infinity);
      const keyB = yearMonthKey(b.startYear, b.startMonth, Infinity);
      if (keyA !== keyB) return keyA - keyB;
      const ea = a.endYear === "present" ? Infinity : yearMonthKey(a.endYear, a.endMonth, 0);
      const eb = b.endYear === "present" ? Infinity : yearMonthKey(b.endYear, b.endMonth, 0);
      return ea - eb;
    });
  }

  function normalizeProjects(arr) {
    if (!Array.isArray(arr)) return structuredClone(defaultData.projects);
    return arr.map((p) => ({
      title: p.title || "",
      description: p.description || "",
      tech: Array.isArray(p.tech) ? p.tech : [],
      link: p.link || "",
      thumbnail: p.thumbnail || null,
      status: normalizeStatus(p.status),
      date: normalizeYear(p.date),
      month: normalizeMonth(p.month),
      note: p.note || "",
    }));
  }

  function normalizeData(parsed) {
    return {
      profile: { ...defaultData.profile, ...(parsed.profile || {}) },
      skills: normalizeLabelItems(parsed.skills, defaultData.skills),
      personality: normalizeLabelItems(parsed.personality, defaultData.personality),
      certifications: normalizeLabelItems(parsed.certifications, defaultData.certifications),
      career: normalizeCareer(parsed.career),
      projects: normalizeProjects(parsed.projects),
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultData);
      return normalizeData(JSON.parse(raw));
    } catch {
      return structuredClone(defaultData);
    }
  }

  let state = loadData();

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function getInitials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  }

  function attachNoteToggles(container) {
    container.querySelectorAll("[data-note-toggle]").forEach((host) => {
      host.addEventListener("click", () => host.classList.toggle("note-open"));
      host.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          host.classList.toggle("note-open");
        }
      });
    });
  }

  // ============================================
  // RENDER: Profile core
  // ============================================
  function renderProfile() {
    document.getElementById("profileName").textContent = state.profile.name;
    document.getElementById("profileTitle").textContent = state.profile.title;
    document.getElementById("footerName").textContent = state.profile.name;
    document.getElementById("bioText").textContent = state.profile.bio;

    const frame = document.getElementById("avatarFrame");
    const initialsEl = document.getElementById("avatarInitials");
    let img = frame.querySelector("img");

    if (state.profile.avatar) {
      if (!img) {
        img = document.createElement("img");
        frame.insertBefore(img, initialsEl);
      }
      img.src = state.profile.avatar;
      img.alt = state.profile.name;
      img.style.display = "block";
      initialsEl.style.display = "none";
    } else {
      if (img) img.style.display = "none";
      initialsEl.style.display = "flex";
      initialsEl.textContent = getInitials(state.profile.name);
    }
  }

  // ============================================
  // RENDER: Orbit (desktop) — one grouped cluster per category
  // ============================================
  function renderOrbit() {
    const nodesLayer = document.getElementById("orbitNodes");
    const svg = document.getElementById("orbitLines");
    nodesLayer.innerHTML = "";
    svg.innerHTML = "";

    // ステージ実寸に依存しないよう、viewBox 100x100 とパーセント配置で描画する
    svg.setAttribute("viewBox", "0 0 100 100");
    const cx = 50;
    const cy = 50;
    const radius = 39;

    const clusters = [
      { key: "skills", label: "スキル", angle: -135, items: state.skills },
      { key: "certifications", label: "資格", angle: -45, items: state.certifications },
      { key: "personality", label: "性格", angle: 45, items: state.personality },
      {
        key: "career",
        label: "経歴",
        angle: 135,
        items: sortCareerEntries(state.career).map((c) => ({ label: c.role, status: c.status })),
      },
    ];

    clusters.forEach((cluster, i) => {
      const angle = cluster.angle * (Math.PI / 180);
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", cx);
      line.setAttribute("y1", cy);
      line.setAttribute("x2", x);
      line.setAttribute("y2", y);
      line.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(line);

      const card = document.createElement("div");
      card.className = `orbit-cluster orbit-cluster--${cluster.key}`;
      card.style.left = `${x}%`;
      card.style.top = `${y}%`;
      card.style.animationDelay = `${i * 0.08}s`;

      const chips = cluster.items.length
        ? `<div class="orbit-cluster-chips">${cluster.items
            .map(
              (item) =>
                `<span class="orbit-cluster-chip${item.status === "ideal" ? " orbit-cluster-chip--ideal" : ""}">${escapeHtml(item.label)}</span>`
            )
            .join("")}</div>`
        : `<p class="orbit-cluster-empty">未登録</p>`;

      card.innerHTML = `<div class="orbit-cluster-header"><span class="dot"></span><span>${cluster.label}</span></div>${chips}`;
      nodesLayer.appendChild(card);
    });
  }

  // ============================================
  // RENDER: Skills / Certifications badge grids (About section)
  // ============================================
  function renderBadgeGrid(elId, items, badgeClass) {
    const el = document.getElementById(elId);
    const current = items.filter((i) => i.status !== "ideal");
    const ideal = items.filter((i) => i.status === "ideal");
    const chip = (item, isIdeal) => {
      const dateHtml = item.date ? `<span class="badge-date">${escapeHtml(formatYearMonth(item.date, item.month))}</span>` : "";
      const hasNote = Boolean(item.note);
      const noteHtml = hasNote ? `<div class="item-note">${escapeHtml(item.note)}</div>` : "";
      return `<div class="badge-wrap"${hasNote ? ' data-note-toggle tabindex="0" role="button"' : ""}>
        <span class="badge ${badgeClass}${isIdeal ? " badge--ideal" : ""}${hasNote ? " badge--clickable" : ""}">${escapeHtml(item.label)}${dateHtml}</span>
        ${noteHtml}
      </div>`;
    };

    if (!items.length) {
      el.innerHTML = `<p class="subgroup-empty">まだ登録されていません。</p>`;
      return;
    }

    if (!ideal.length) {
      el.innerHTML = `<div class="badge-row">${current.map((i) => chip(i, false)).join("")}</div>`;
      attachNoteToggles(el);
      return;
    }

    el.innerHTML = `
      <div class="subgroup">
        <h4 class="subgroup-label">現状</h4>
        <div class="badge-row">${current.length ? current.map((i) => chip(i, false)).join("") : '<span class="subgroup-empty">なし</span>'}</div>
      </div>
      <div class="subgroup subgroup--ideal">
        <h4 class="subgroup-label">理想</h4>
        <div class="badge-row">${ideal.map((i) => chip(i, true)).join("")}</div>
      </div>`;
    attachNoteToggles(el);
  }

  function renderSkillsGrid() {
    renderBadgeGrid("skillsGrid", state.skills, "badge--skill");
  }

  function renderPersonalityGrid() {
    renderBadgeGrid("personalityGrid", state.personality, "badge--personality");
  }

  function renderCertsGrid() {
    renderBadgeGrid("certsGrid", state.certifications, "badge--cert");
  }

  // ============================================
  // RENDER: Career timeline (About section)
  // ============================================
  function renderCareerTimeline() {
    const list = document.getElementById("careerList");
    const sorted = sortCareerEntries(state.career);
    const current = sorted.filter((c) => c.status !== "ideal");
    const ideal = sorted.filter((c) => c.status === "ideal");
    const entry = (c) => {
      const hasNote = Boolean(c.note);
      const noteHtml = hasNote ? `<div class="item-note">${escapeHtml(c.note)}</div>` : "";
      return `
        <div class="career-entry${hasNote ? " career-entry--clickable" : ""}"${hasNote ? ' data-note-toggle tabindex="0" role="button"' : ""}>
          <div class="career-period">${escapeHtml(formatCareerPeriod(c))}</div>
          <div class="career-role">${escapeHtml(c.role)}</div>
          <div class="career-org">${escapeHtml(c.org)}</div>
          ${noteHtml}
        </div>`;
    };

    if (!state.career.length) {
      list.innerHTML = `<p class="empty-state">まだ経歴が登録されていません。</p>`;
      return;
    }

    if (!ideal.length) {
      list.innerHTML = `<div class="career-track">${current.map(entry).join("")}</div>`;
      attachNoteToggles(list);
      return;
    }

    list.innerHTML = `
      <div class="subgroup">
        <h4 class="subgroup-label">現状</h4>
        <div class="career-track">${current.length ? current.map(entry).join("") : '<p class="subgroup-empty">なし</p>'}</div>
      </div>
      <div class="subgroup subgroup--ideal">
        <h4 class="subgroup-label">理想（目指すキャリア）</h4>
        <div class="career-track career-track--ideal">${ideal.map(entry).join("")}</div>
      </div>`;
    attachNoteToggles(list);
  }

  // ============================================
  // RENDER: Projects grid
  // ============================================
  function renderProjects() {
    const grid = document.getElementById("projectGrid");
    const current = state.projects.filter((p) => p.status !== "ideal");
    const ideal = state.projects.filter((p) => p.status === "ideal");

    const card = (p) => {
      const thumb = p.thumbnail
        ? `<img class="project-thumb" src="${escapeHtml(p.thumbnail)}" alt="${escapeHtml(p.title)}" />`
        : `<div class="project-thumb project-thumb--placeholder"><span>${escapeHtml(getInitials(p.title))}</span></div>`;
      const hasNote = Boolean(p.note);
      const noteHtml = hasNote ? `<div class="item-note">${escapeHtml(p.note)}</div>` : "";
      return `
        <div class="project-card${p.status === "ideal" ? " project-card--ideal" : ""}${hasNote ? " project-card--clickable" : ""}"${hasNote ? ' data-note-toggle tabindex="0" role="button"' : ""}>
          ${thumb}
          <div class="project-card-body">
            <h3>${escapeHtml(p.title)}</h3>
            ${p.date ? `<p class="project-date">制作時期: ${escapeHtml(formatYearMonth(p.date, p.month))}</p>` : ""}
            <p>${escapeHtml(p.description)}</p>
            <div class="tech-tags">
              ${(p.tech || []).map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join("")}
            </div>
            ${noteHtml}
            ${p.link ? `<a class="project-link" href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">作品を見る ↗</a>` : ""}
          </div>
        </div>`;
    };

    if (!state.projects.length) {
      grid.innerHTML = `<p class="empty-state">まだ作品が登録されていません。編集画面から追加してください。</p>`;
      return;
    }

    if (!ideal.length) {
      grid.innerHTML = `<div class="project-grid-inner">${current.map(card).join("")}</div>`;
      attachNoteToggles(grid);
      return;
    }

    grid.innerHTML = `
      <div class="subgroup">
        <h3 class="subgroup-label">実績</h3>
        <div class="project-grid-inner">${current.length ? current.map(card).join("") : '<p class="subgroup-empty">なし</p>'}</div>
      </div>
      <div class="subgroup subgroup--ideal">
        <h3 class="subgroup-label">挑戦したいこと</h3>
        <div class="project-grid-inner">${ideal.map(card).join("")}</div>
      </div>`;
    attachNoteToggles(grid);
  }

  function renderAll() {
    renderProfile();
    renderOrbit();
    renderSkillsGrid();
    renderPersonalityGrid();
    renderCertsGrid();
    renderCareerTimeline();
    renderProjects();
  }

  // ============================================
  // Init (view)
  // ============================================
  document.getElementById("year").textContent = new Date().getFullYear();
  renderAll();

  // 閲覧専用ページ（index.html）には編集UIが無いので、ここで終了する。
  // 編集UIを含むのはローカル専用の edit.html のみ。
  const overlay = document.getElementById("editorOverlay");
  if (!overlay) return;

  // ============================================
  // EDITOR: open/close + tabs
  // ============================================
  const editBtn = document.getElementById("editModeBtn");
  const closeBtn = document.getElementById("closeEditorBtn");

  function openEditor() {
    overlay.classList.add("open");
    fillProfileForm();
    renderSkillsList();
    renderPersonalityList();
    renderCertsList();
    renderCareerEditList();
    renderProjectsEditList();
  }

  function closeEditor() {
    overlay.classList.remove("open");
  }

  editBtn.addEventListener("click", openEditor);
  closeBtn.addEventListener("click", closeEditor);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeEditor();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeEditor();
  });

  // ============================================
  // EDITOR: export / import
  // ============================================
  const exportDataBtn = document.getElementById("exportDataBtn");
  const importDataBtn = document.getElementById("importDataBtn");
  const importDataInput = document.getElementById("importDataInput");

  exportDataBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-data.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  importDataBtn.addEventListener("click", () => importDataInput.click());

  importDataInput.addEventListener("change", async () => {
    const file = importDataInput.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("invalid shape");
      }
      state = normalizeData(parsed);
      persist();
      renderAll();
      openEditor();
    } catch {
      alert("JSONファイルを読み込めませんでした。書き出したファイルか確認してください。");
    }
    importDataInput.value = "";
  });

  document.getElementById("editorTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add("active");
  });

  // ============================================
  // EDITOR: Profile tab
  // ============================================
  const inputName = document.getElementById("inputName");
  const inputTitle = document.getElementById("inputTitle");
  const inputBio = document.getElementById("inputBio");
  const inputAvatar = document.getElementById("inputAvatar");
  const removeAvatarBtn = document.getElementById("removeAvatarBtn");

  function fillProfileForm() {
    inputName.value = state.profile.name;
    inputTitle.value = state.profile.title;
    inputBio.value = state.profile.bio;
  }

  function updateProfileField(field, value) {
    state.profile[field] = value;
    persist();
    renderProfile();
  }

  inputName.addEventListener("input", () => updateProfileField("name", inputName.value.trim() || defaultData.profile.name));
  inputTitle.addEventListener("input", () => updateProfileField("title", inputTitle.value.trim()));
  inputBio.addEventListener("input", () => updateProfileField("bio", inputBio.value));

  inputAvatar.addEventListener("change", async () => {
    const file = inputAvatar.files[0];
    if (!file) return;
    state.profile.avatar = await readFileAsDataURL(file);
    persist();
    renderProfile();
  });

  removeAvatarBtn.addEventListener("click", () => {
    state.profile.avatar = null;
    inputAvatar.value = "";
    persist();
    renderProfile();
  });

  // ============================================
  // EDITOR: generic {label, status} list (Skills, Certifications)
  // ============================================
  function statusToggleLabel(status) {
    return status === "ideal" ? "理想" : "現状";
  }

  function setupStatusToggle(btn, labels) {
    btn.addEventListener("click", () => {
      btn.dataset.status = btn.dataset.status === "ideal" ? "current" : "ideal";
      btn.textContent = labels[btn.dataset.status];
      btn.classList.toggle("status-toggle--ideal", btn.dataset.status === "ideal");
    });
  }

  function resetStatusToggle(btn, labels) {
    btn.dataset.status = "current";
    btn.textContent = labels.current;
    btn.classList.remove("status-toggle--ideal");
  }

  function renderSimpleList(listEl, arrayKey, onChange) {
    listEl.innerHTML = "";
    state[arrayKey].forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "editable-item editable-item--simple";
      li.innerHTML = `
        <div class="item-row">
          <input type="text" value="${escapeHtml(item.label)}" data-field="label" data-index="${index}" placeholder="項目名" />
          <select class="date-select" data-field="date" data-index="${index}">${yearOptionsHtml(item.date)}</select>
          <select class="date-select month-select" data-field="month" data-index="${index}">${monthOptionsHtml(item.month)}</select>
        </div>
        <div class="item-row">
          <textarea class="note-input" rows="2" data-field="note" data-index="${index}" placeholder="補足（任意）">${escapeHtml(item.note || "")}</textarea>
        </div>
        <div class="item-row">
          <button type="button" class="status-toggle status-toggle--${item.status}" data-action="toggle-status" data-index="${index}">${statusToggleLabel(item.status)}</button>
          <div class="item-actions">
            <button type="button" class="icon-action icon-action--danger" data-action="delete" data-index="${index}">削除</button>
          </div>
        </div>`;
      listEl.appendChild(li);
    });

    listEl.querySelectorAll("input, select, textarea").forEach((field) => {
      field.addEventListener("input", () => {
        const idx = Number(field.dataset.index);
        state[arrayKey][idx][field.dataset.field] = field.value;
        persist();
        onChange();
      });
    });

    listEl.querySelectorAll('[data-action="toggle-status"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        const item = state[arrayKey][idx];
        item.status = item.status === "ideal" ? "current" : "ideal";
        persist();
        renderSimpleList(listEl, arrayKey, onChange);
        onChange();
      });
    });

    listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        state[arrayKey].splice(idx, 1);
        persist();
        renderSimpleList(listEl, arrayKey, onChange);
        onChange();
      });
    });
  }

  const skillsList = document.getElementById("skillsList");
  const personalityList = document.getElementById("personalityList");
  const certsList = document.getElementById("certsList");

  function onSkillsChange() {
    renderOrbit();
    renderSkillsGrid();
  }
  function onPersonalityChange() {
    renderOrbit();
    renderPersonalityGrid();
  }
  function onCertsChange() {
    renderOrbit();
    renderCertsGrid();
  }

  function renderSkillsList() {
    renderSimpleList(skillsList, "skills", onSkillsChange);
  }
  function renderPersonalityList() {
    renderSimpleList(personalityList, "personality", onPersonalityChange);
  }
  function renderCertsList() {
    renderSimpleList(certsList, "certifications", onCertsChange);
  }

  const skillStatusBtn = document.getElementById("skillStatus");
  const skillStatusLabels = { current: "現状", ideal: "理想" };
  setupStatusToggle(skillStatusBtn, skillStatusLabels);

  const personalityStatusBtn = document.getElementById("personalityStatus");
  const personalityStatusLabels = { current: "現状", ideal: "理想" };
  setupStatusToggle(personalityStatusBtn, personalityStatusLabels);

  const certStatusBtn = document.getElementById("certStatus");
  const certStatusLabels = { current: "現状", ideal: "理想" };
  setupStatusToggle(certStatusBtn, certStatusLabels);

  document.getElementById("skillsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("skillInput");
    const date = document.getElementById("skillDate");
    const month = document.getElementById("skillMonth");
    const note = document.getElementById("skillNote");
    const value = input.value.trim();
    if (!value) return;
    state.skills.push({ label: value, status: skillStatusBtn.dataset.status, date: date.value.trim(), month: month.value, note: note.value.trim() });
    persist();
    input.value = "";
    date.value = "";
    month.value = "";
    note.value = "";
    resetStatusToggle(skillStatusBtn, skillStatusLabels);
    renderSkillsList();
    onSkillsChange();
  });

  document.getElementById("personalityForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("personalityInput");
    const date = document.getElementById("personalityDate");
    const month = document.getElementById("personalityMonth");
    const note = document.getElementById("personalityNote");
    const value = input.value.trim();
    if (!value) return;
    state.personality.push({
      label: value,
      status: personalityStatusBtn.dataset.status,
      date: date.value.trim(),
      month: month.value,
      note: note.value.trim(),
    });
    persist();
    input.value = "";
    date.value = "";
    month.value = "";
    note.value = "";
    resetStatusToggle(personalityStatusBtn, personalityStatusLabels);
    renderPersonalityList();
    onPersonalityChange();
  });

  document.getElementById("certsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("certInput");
    const date = document.getElementById("certDate");
    const month = document.getElementById("certMonth");
    const note = document.getElementById("certNote");
    const value = input.value.trim();
    if (!value) return;
    state.certifications.push({ label: value, status: certStatusBtn.dataset.status, date: date.value.trim(), month: month.value, note: note.value.trim() });
    persist();
    input.value = "";
    date.value = "";
    month.value = "";
    note.value = "";
    resetStatusToggle(certStatusBtn, certStatusLabels);
    renderCertsList();
    onCertsChange();
  });

  // ============================================
  // EDITOR: Career tab
  // ============================================
  const careerEditList = document.getElementById("careerEditList");

  function renderCareerEditList() {
    careerEditList.innerHTML = "";
    state.career.forEach((entry, index) => {
      const li = document.createElement("li");
      li.className = "editable-item editable-item--career";
      li.innerHTML = `
        <div class="item-row">
          <select class="date-select" data-field="startYear" data-index="${index}">${yearOptionsHtml(entry.startYear)}</select>
          <select class="date-select month-select" data-field="startMonth" data-index="${index}">${monthOptionsHtml(entry.startMonth)}</select>
          <span class="period-sep">〜</span>
          <select class="date-select" data-field="endYear" data-index="${index}">${yearOptionsHtml(entry.endYear, { withPresent: true })}</select>
          <select class="date-select month-select" data-field="endMonth" data-index="${index}">${monthOptionsHtml(entry.endMonth)}</select>
        </div>
        <div class="item-row">
          <input type="text" value="${escapeHtml(entry.role)}" data-field="role" data-index="${index}" placeholder="役職" />
          <input type="text" value="${escapeHtml(entry.org)}" data-field="org" data-index="${index}" placeholder="組織名" />
        </div>
        <div class="item-row">
          <textarea class="note-input" rows="2" data-field="note" data-index="${index}" placeholder="補足（任意）">${escapeHtml(entry.note || "")}</textarea>
        </div>
        <div class="item-row">
          <button type="button" class="status-toggle status-toggle--${entry.status}" data-action="toggle-status" data-index="${index}">${statusToggleLabel(entry.status)}</button>
          <div class="item-actions">
            <button type="button" class="icon-action icon-action--danger" data-action="delete" data-index="${index}">削除</button>
          </div>
        </div>`;
      careerEditList.appendChild(li);
    });

    careerEditList.querySelectorAll("input, select, textarea").forEach((field) => {
      field.addEventListener("input", () => {
        const idx = Number(field.dataset.index);
        state.career[idx][field.dataset.field] = field.value;
        persist();
        renderCareerTimeline();
        renderOrbit();
      });
    });

    careerEditList.querySelectorAll('[data-action="toggle-status"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        const entry = state.career[idx];
        entry.status = entry.status === "ideal" ? "current" : "ideal";
        persist();
        renderCareerEditList();
        renderCareerTimeline();
        renderOrbit();
      });
    });

    careerEditList.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        state.career.splice(idx, 1);
        persist();
        renderCareerEditList();
        renderCareerTimeline();
        renderOrbit();
      });
    });
  }

  const careerStatusBtn = document.getElementById("careerStatus");
  const careerStatusLabels = { current: "現状（経歴）", ideal: "理想（目指すキャリア）" };
  setupStatusToggle(careerStatusBtn, careerStatusLabels);

  document.getElementById("careerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const startYear = document.getElementById("careerStartYear");
    const startMonth = document.getElementById("careerStartMonth");
    const endYear = document.getElementById("careerEndYear");
    const endMonth = document.getElementById("careerEndMonth");
    const role = document.getElementById("careerRole");
    const org = document.getElementById("careerOrg");
    const note = document.getElementById("careerNote");
    if (!startYear.value || !role.value.trim() || !org.value.trim()) return;

    state.career.push({
      startYear: startYear.value,
      startMonth: startMonth.value,
      endYear: endYear.value,
      endMonth: endYear.value === "present" ? "" : endMonth.value,
      role: role.value.trim(),
      org: org.value.trim(),
      status: careerStatusBtn.dataset.status,
      note: note.value.trim(),
    });
    persist();
    startYear.value = "";
    startMonth.value = "";
    endYear.value = "";
    endMonth.value = "";
    role.value = "";
    org.value = "";
    note.value = "";
    resetStatusToggle(careerStatusBtn, careerStatusLabels);
    renderCareerEditList();
    renderCareerTimeline();
    renderOrbit();
  });

  // ============================================
  // EDITOR: Projects tab
  // ============================================
  const projectsEditList = document.getElementById("projectsEditList");

  function renderProjectsEditList() {
    projectsEditList.innerHTML = "";
    state.projects.forEach((proj, index) => {
      const li = document.createElement("li");
      li.className = "editable-item editable-item--project";
      const thumbPreview = proj.thumbnail
        ? `<img src="${escapeHtml(proj.thumbnail)}" alt="" />`
        : `<span>${escapeHtml(getInitials(proj.title))}</span>`;
      li.innerHTML = `
        <div class="item-row item-row--thumb">
          <div class="item-thumb-preview">${thumbPreview}</div>
          <input type="file" accept="image/*" data-action="thumb" data-index="${index}" />
          ${proj.thumbnail ? `<button type="button" class="icon-action" data-action="remove-thumb" data-index="${index}">画像を削除</button>` : ""}
        </div>
        <div class="item-row">
          <input type="text" value="${escapeHtml(proj.title)}" data-field="title" data-index="${index}" placeholder="作品名" />
          <select class="date-select" data-field="date" data-index="${index}">${yearOptionsHtml(proj.date)}</select>
          <select class="date-select month-select" data-field="month" data-index="${index}">${monthOptionsHtml(proj.month)}</select>
        </div>
        <div class="item-row">
          <textarea rows="2" data-field="description" data-index="${index}" placeholder="説明">${escapeHtml(proj.description)}</textarea>
        </div>
        <div class="item-row">
          <textarea class="note-input" rows="2" data-field="note" data-index="${index}" placeholder="補足（任意）">${escapeHtml(proj.note || "")}</textarea>
        </div>
        <div class="item-row">
          <input type="text" value="${escapeHtml((proj.tech || []).join(", "))}" data-field="tech" data-index="${index}" placeholder="タグ・使用ツール（カンマ区切り）" />
        </div>
        <div class="item-row">
          <input type="url" value="${escapeHtml(proj.link || "")}" data-field="link" data-index="${index}" placeholder="リンク" />
          <button type="button" class="status-toggle status-toggle--${proj.status}" data-action="toggle-status" data-index="${index}">${statusToggleLabel(proj.status)}</button>
        </div>
        <div class="item-actions">
          <button type="button" class="icon-action icon-action--danger" data-action="delete" data-index="${index}">削除</button>
        </div>`;
      projectsEditList.appendChild(li);
    });

    projectsEditList.querySelectorAll('[data-action="toggle-status"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        const proj = state.projects[idx];
        proj.status = proj.status === "ideal" ? "current" : "ideal";
        persist();
        renderProjectsEditList();
        renderProjects();
      });
    });

    projectsEditList.querySelectorAll('input:not([type="file"]), textarea, select').forEach((field) => {
      field.addEventListener("input", () => {
        const idx = Number(field.dataset.index);
        const key = field.dataset.field;
        if (key === "tech") {
          state.projects[idx].tech = field.value
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        } else {
          state.projects[idx][key] = field.value;
        }
        persist();
        renderProjects();
      });
    });

    projectsEditList.querySelectorAll('input[type="file"][data-action="thumb"]').forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        const idx = Number(input.dataset.index);
        state.projects[idx].thumbnail = await readFileAsDataURL(file);
        persist();
        renderProjectsEditList();
        renderProjects();
      });
    });

    projectsEditList.querySelectorAll('[data-action="remove-thumb"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        state.projects[idx].thumbnail = null;
        persist();
        renderProjectsEditList();
        renderProjects();
      });
    });

    projectsEditList.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        state.projects.splice(idx, 1);
        persist();
        renderProjectsEditList();
        renderProjects();
      });
    });
  }

  const projStatusBtn = document.getElementById("projStatus");
  const projStatusLabels = { current: "現状（実績）", ideal: "理想（挑戦したいこと）" };
  setupStatusToggle(projStatusBtn, projStatusLabels);

  document.getElementById("projectsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("projTitle");
    const desc = document.getElementById("projDesc");
    const tech = document.getElementById("projTech");
    const link = document.getElementById("projLink");
    const thumb = document.getElementById("projThumb");
    const date = document.getElementById("projDate");
    const month = document.getElementById("projMonth");
    const note = document.getElementById("projNote");
    if (!title.value.trim() || !desc.value.trim()) return;

    const thumbFile = thumb.files[0];
    state.projects.push({
      title: title.value.trim(),
      description: desc.value.trim(),
      tech: tech.value.split(",").map((t) => t.trim()).filter(Boolean),
      link: link.value.trim(),
      thumbnail: thumbFile ? await readFileAsDataURL(thumbFile) : null,
      status: projStatusBtn.dataset.status,
      date: date.value.trim(),
      month: month.value,
      note: note.value.trim(),
    });
    persist();
    title.value = "";
    desc.value = "";
    tech.value = "";
    thumb.value = "";
    link.value = "";
    date.value = "";
    month.value = "";
    note.value = "";
    resetStatusToggle(projStatusBtn, projStatusLabels);
    renderProjectsEditList();
    renderProjects();
  });

  // ============================================
  // Init (editor)
  // ============================================
  ["skillDate", "personalityDate", "certDate", "projDate"].forEach((id) => {
    document.getElementById(id).innerHTML = yearOptionsHtml("");
  });
  ["skillMonth", "personalityMonth", "certMonth", "projMonth", "careerStartMonth", "careerEndMonth"].forEach((id) => {
    document.getElementById(id).innerHTML = monthOptionsHtml("");
  });
  document.getElementById("careerStartYear").innerHTML = yearOptionsHtml("");
  document.getElementById("careerEndYear").innerHTML = yearOptionsHtml("", { withPresent: true });
})();
