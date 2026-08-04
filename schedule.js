(() => {
  "use strict";

  // 予定はこの端末のブラウザにだけ保存する。data.json（公開データ）には一切入れない。
  const STORAGE_KEY = "portfolio.schedule.v1";

  const CATEGORIES = [
    { key: "work", label: "仕事" },
    { key: "study", label: "学習" },
    { key: "private", label: "私用" },
    { key: "other", label: "その他" },
  ];
  const DEFAULT_CATEGORY = "other";
  const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
  const DOTS_PER_CELL = 3; // カレンダーのマスに出す点の上限（超えたぶんは「+n」）

  function categoryLabel(key) {
    const found = CATEGORIES.find((c) => c.key === key);
    return found ? found.label : "";
  }

  // ============================================
  // 日付ユーティリティ
  // 日付は必ずローカル時刻で扱う。new Date("2026-08-04") は UTC 解釈になり、
  // 日本時間では前日にずれるので使わない。
  // ============================================
  const pad2 = (n) => String(n).padStart(2, "0");

  function toKey(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function fromKey(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
    if (!m) return null;
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    // 2026-02-31 のような存在しない日は Date が繰り上げるので弾く
    return toKey(date) === key ? date : null;
  }

  function todayKey() {
    return toKey(new Date());
  }

  function formatDateKey(key) {
    const date = fromKey(key);
    if (!date) return "";
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAY_LABELS[date.getDay()]}）`;
  }

  function normalizeTime(value) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
    if (!m) return "";
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour > 23 || minute > 59) return "";
    return `${pad2(hour)}:${pad2(minute)}`;
  }

  function formatTimeRange(event) {
    if (!event.start) return "終日";
    return event.end ? `${event.start} - ${event.end}` : event.start;
  }

  // ============================================
  // データ
  // ============================================
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeEvent(raw) {
    const date = fromKey(raw && raw.date) ? raw.date : "";
    if (!date) return null; // 日付の無い予定はカレンダーに置けない
    const start = normalizeTime(raw.start);
    // id は data-id 属性にそのまま入るので、読み込んだファイル由来の文字列は形を確かめる
    const id = /^[A-Za-z0-9_-]{1,64}$/.test(String(raw.id || "")) ? raw.id : newId();
    return {
      id,
      title: String(raw.title || "").slice(0, 80),
      date,
      start,
      end: start ? normalizeTime(raw.end) : "",
      category: CATEGORIES.some((c) => c.key === raw.category) ? raw.category : DEFAULT_CATEGORY,
      note: String(raw.note || "").slice(0, 300),
      done: Boolean(raw.done),
    };
  }

  function normalizeEvents(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeEvent).filter(Boolean);
  }

  let events = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return normalizeEvents(Array.isArray(parsed) ? parsed : parsed.events);
    } catch {
      return [];
    }
  }

  // 保存できなかったことを黙って飲み込むと「入れたはずの予定が消える」ので必ず画面に出す。
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, events }));
      return true;
    } catch (err) {
      console.error("予定を保存できませんでした:", err);
      setStatus("予定を保存できませんでした（ブラウザの保存容量の上限）。古い予定を削除してください。", "error");
      return false;
    }
  }

  // 終日（時刻なし）はその日の先頭に置く
  function compareEvents(a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.start !== b.start) return (a.start || "").localeCompare(b.start || "");
    return a.title.localeCompare(b.title, "ja");
  }

  function eventsOn(key) {
    return events.filter((e) => e.date === key).sort(compareEvents);
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

  // ============================================
  // 画面の状態
  // ============================================
  const today = todayKey();
  let selectedDate = today;
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth(); // 0 始まり
  let range = "day"; // day | upcoming | all
  let editingId = null;

  const el = (id) => document.getElementById(id);

  const statusEl = el("scheduleStatus");
  const summaryEl = el("scheduleSummary");
  const calendarTitle = el("calendarTitle");
  const calendarGrid = el("calendarGrid");
  const listTitle = el("listTitle");
  const eventList = el("eventList");
  const searchInput = el("searchInput");
  const statusFilter = el("statusFilter");
  const rangeTabs = el("rangeTabs");

  const inputTitle = el("eventTitle");
  const inputDate = el("eventDate");
  const inputStart = el("eventStart");
  const inputEnd = el("eventEnd");
  const inputCategory = el("eventCategory");
  const inputNote = el("eventNote");

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.className = "publish-status" + (kind ? ` publish-status--${kind}` : "");
  }

  // ============================================
  // 描画: 件数のまとめ
  // ============================================
  function renderSummary() {
    const todays = eventsOn(today);
    const openToday = todays.filter((e) => !e.done).length;
    const upcoming = events.filter((e) => e.date > today && !e.done).length;
    const overdue = events.filter((e) => e.date < today && !e.done).length;

    const card = (value, label, tone) =>
      `<div class="summary-card${tone ? ` summary-card--${tone}` : ""}">
        <strong>${value}</strong><span>${label}</span>
      </div>`;

    summaryEl.innerHTML =
      card(todays.length, "今日の予定") +
      card(openToday, "今日の未完了") +
      card(upcoming, "今日より先の未完了") +
      card(overdue, "過ぎた未完了", overdue ? "alert" : "");
  }

  // ============================================
  // 描画: カレンダー
  // ============================================
  function renderCalendar() {
    calendarTitle.textContent = `${viewYear}年${viewMonth + 1}月`;

    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leading = first.getDay(); // 日曜始まり
    const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

    let html = "";
    for (let i = 0; i < totalCells; i++) {
      const date = new Date(viewYear, viewMonth, i - leading + 1);
      const key = toKey(date);
      const inMonth = date.getMonth() === viewMonth;
      const dayEvents = eventsOn(key);

      const classes = ["calendar-cell"];
      if (!inMonth) classes.push("calendar-cell--muted");
      if (key === today) classes.push("calendar-cell--today");
      if (key === selectedDate) classes.push("calendar-cell--selected");
      if (date.getDay() === 0) classes.push("calendar-cell--sun");
      if (date.getDay() === 6) classes.push("calendar-cell--sat");

      const dots = dayEvents
        .slice(0, DOTS_PER_CELL)
        .map((e) => `<i class="cat-dot cat-dot--${e.category}${e.done ? " cat-dot--done" : ""}"></i>`)
        .join("");
      const more = dayEvents.length > DOTS_PER_CELL ? `<span class="cell-more">+${dayEvents.length - DOTS_PER_CELL}</span>` : "";

      const label = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 予定${dayEvents.length}件`;
      html += `<button type="button" class="${classes.join(" ")}" data-key="${key}" aria-label="${label}"${key === selectedDate ? ' aria-current="date"' : ""}>
        <span class="cell-day">${date.getDate()}</span>
        <span class="cell-dots">${dots}${more}</span>
      </button>`;
    }
    calendarGrid.innerHTML = html;
  }

  // ============================================
  // 描画: 一覧
  // ============================================
  function visibleEvents() {
    const keyword = searchInput.value.trim().toLowerCase();
    const state = statusFilter.value;

    return events
      .filter((e) => {
        if (range === "day" && e.date !== selectedDate) return false;
        if (range === "upcoming" && e.date < today) return false;
        if (state === "open" && e.done) return false;
        if (state === "done" && !e.done) return false;
        if (keyword) {
          const haystack = `${e.title} ${e.note} ${categoryLabel(e.category)}`.toLowerCase();
          if (!haystack.includes(keyword)) return false;
        }
        return true;
      })
      .sort(compareEvents);
  }

  function categoryOptionsHtml(selected) {
    return CATEGORIES.map(
      (c) => `<option value="${c.key}"${c.key === selected ? " selected" : ""}>${c.label}</option>`
    ).join("");
  }

  function eventItemHtml(event) {
    const editing = event.id === editingId;
    const body = editing
      ? `<div class="event-edit">
          <div class="item-row">
            <input type="text" maxlength="80" value="${escapeHtml(event.title)}" data-field="title" data-id="${event.id}" placeholder="予定の内容" />
          </div>
          <div class="item-row">
            <input type="date" value="${event.date}" data-field="date" data-id="${event.id}" aria-label="日付" />
            <select data-field="category" data-id="${event.id}" aria-label="分類">${categoryOptionsHtml(event.category)}</select>
          </div>
          <div class="item-row">
            <input type="time" value="${event.start}" data-field="start" data-id="${event.id}" aria-label="開始時刻" />
            <span class="period-sep">〜</span>
            <input type="time" value="${event.end}" data-field="end" data-id="${event.id}" aria-label="終了時刻" />
          </div>
          <div class="item-row">
            <textarea class="note-input" rows="2" maxlength="300" data-field="note" data-id="${event.id}" placeholder="メモ（任意）">${escapeHtml(event.note)}</textarea>
          </div>
          <div class="item-actions">
            <button type="button" class="icon-action" data-action="close-edit" data-id="${event.id}">編集を閉じる</button>
            <button type="button" class="icon-action icon-action--danger" data-action="delete" data-id="${event.id}">削除</button>
          </div>
        </div>`
      : "";

    return `<li class="event-item event-item--${event.category}${event.done ? " event-item--done" : ""}">
      <div class="event-main">
        <label class="event-check">
          <input type="checkbox"${event.done ? " checked" : ""} data-action="toggle-done" data-id="${event.id}" aria-label="完了にする" />
        </label>
        <div class="event-body">
          <div class="event-meta">
            <span class="event-time">${escapeHtml(formatTimeRange(event))}</span>
            <span class="event-category">${escapeHtml(categoryLabel(event.category))}</span>
            ${range === "day" ? "" : `<span class="event-date">${escapeHtml(formatDateKey(event.date))}</span>`}
          </div>
          <p class="event-title">${escapeHtml(event.title)}</p>
          ${event.note ? `<p class="event-note">${escapeHtml(event.note)}</p>` : ""}
        </div>
        <button type="button" class="icon-action" data-action="edit" data-id="${event.id}" aria-expanded="${editing}">${editing ? "閉じる" : "編集"}</button>
      </div>
      ${body}
    </li>`;
  }

  function renderList() {
    if (range === "day") {
      listTitle.textContent = formatDateKey(selectedDate) + (selectedDate === today ? "（今日）" : "");
    } else {
      listTitle.textContent = range === "upcoming" ? "今日以降の予定" : "すべての予定";
    }

    const list = visibleEvents();
    if (!list.length) {
      eventList.innerHTML = `<li class="empty-state">この条件に合う予定はありません。</li>`;
      return;
    }
    eventList.innerHTML = list.map(eventItemHtml).join("");
  }

  function renderAll() {
    renderSummary();
    renderCalendar();
    renderList();
  }

  // ============================================
  // 操作
  // ============================================
  function findEvent(id) {
    return events.find((e) => e.id === id);
  }

  calendarGrid.addEventListener("click", (e) => {
    const cell = e.target.closest(".calendar-cell");
    if (!cell) return;
    selectedDate = cell.dataset.key;
    inputDate.value = selectedDate;
    // 前後の月のマスを押したときは、その月へ移動する
    const date = fromKey(selectedDate);
    if (date.getMonth() !== viewMonth || date.getFullYear() !== viewYear) {
      viewYear = date.getFullYear();
      viewMonth = date.getMonth();
    }
    range = "day";
    syncRangeTabs();
    renderAll();
  });

  el("prevMonthBtn").addEventListener("click", () => {
    if (--viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar();
  });

  el("nextMonthBtn").addEventListener("click", () => {
    if (++viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendar();
  });

  el("todayBtn").addEventListener("click", () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectedDate = today;
    inputDate.value = selectedDate;
    renderAll();
  });

  function syncRangeTabs() {
    rangeTabs.querySelectorAll(".segmented-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.range === range);
    });
  }

  rangeTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented-btn");
    if (!btn) return;
    range = btn.dataset.range;
    syncRangeTabs();
    renderList();
  });

  searchInput.addEventListener("input", renderList);
  statusFilter.addEventListener("change", renderList);

  // 一覧の中の操作（項目は描き直すたびに作り直すので、親側でまとめて受ける）
  eventList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn || btn.dataset.action === "toggle-done") return;
    const event = findEvent(btn.dataset.id);
    if (!event) return;

    if (btn.dataset.action === "edit") {
      editingId = editingId === event.id ? null : event.id;
      renderList();
    } else if (btn.dataset.action === "close-edit") {
      editingId = null;
      renderList();
    } else if (btn.dataset.action === "delete") {
      if (!confirm(`「${event.title}」を削除します。よろしいですか？`)) return;
      events = events.filter((x) => x.id !== event.id);
      editingId = null;
      persist();
      renderAll();
    }
  });

  eventList.addEventListener("change", (e) => {
    const box = e.target.closest('[data-action="toggle-done"]');
    if (box) {
      const event = findEvent(box.dataset.id);
      if (!event) return;
      event.done = box.checked;
      persist();
      renderAll();
      return;
    }
    // 分類・日付は値が確定したところで一覧も描き直す
    // （文字入力のたびに描き直すと入力欄からフォーカスが外れるため、input では描き直さない）
    if (e.target.matches('select[data-field], input[type="date"][data-field]')) {
      renderList();
    }
  });

  // 編集欄は入力のたびに保存する（保存ボタンを押し忘れて消えるのを防ぐ）
  eventList.addEventListener("input", (e) => {
    const field = e.target.closest("[data-field]");
    if (!field) return;
    const event = findEvent(field.dataset.id);
    if (!event) return;
    const key = field.dataset.field;

    if (key === "date") {
      if (!fromKey(field.value)) return; // 入力途中の不完全な日付は無視する
      event.date = field.value;
    } else if (key === "start" || key === "end") {
      event[key] = normalizeTime(field.value);
      if (!event.start) event.end = "";
    } else if (key === "title") {
      event.title = field.value;
    } else if (key === "note") {
      event.note = field.value;
    } else if (key === "category") {
      event.category = field.value;
    }

    persist();
    renderSummary();
    renderCalendar();
  });

  // ============================================
  // 追加フォーム
  // ============================================
  el("scheduleForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = inputTitle.value.trim();
    const date = inputDate.value;
    if (!title || !fromKey(date)) {
      setStatus("予定の内容と日付を入れてください。", "error");
      return;
    }

    const start = normalizeTime(inputStart.value);
    const end = start ? normalizeTime(inputEnd.value) : "";
    if (start && end && end < start) {
      setStatus("終了時刻が開始時刻より前になっています。", "error");
      return;
    }

    events.push({
      id: newId(),
      title,
      date,
      start,
      end,
      category: inputCategory.value,
      note: inputNote.value.trim(),
      done: false,
    });
    if (!persist()) return;

    inputTitle.value = "";
    inputStart.value = "";
    inputEnd.value = "";
    inputNote.value = "";

    // 追加した日が見えていないと入れた実感が無いので、その日へ寄せる
    selectedDate = date;
    const added = fromKey(date);
    viewYear = added.getFullYear();
    viewMonth = added.getMonth();
    if (range === "upcoming" && date < today) range = "all";
    syncRangeTabs();

    renderAll();
    setStatus(`${formatDateKey(date)} に追加しました。`, "ok");
    inputTitle.focus();
  });

  // ============================================
  // 書き出し / 読み込み / 全削除
  // ============================================
  el("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ version: 1, events }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-schedule.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  const importInput = el("importInput");
  el("importBtn").addEventListener("click", () => importInput.click());

  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = normalizeEvents(Array.isArray(parsed) ? parsed : parsed.events);
      if (!incoming.length) throw new Error("empty");
      // 同じ id は読み込んだほうで置き換え、無いものは足す（端末をまたいでも消えない）
      const byId = new Map(events.map((e) => [e.id, e]));
      incoming.forEach((e) => byId.set(e.id, e));
      events = [...byId.values()];
      editingId = null;
      if (persist()) {
        renderAll();
        setStatus(`${incoming.length}件を読み込みました。`, "ok");
      }
    } catch {
      setStatus("JSONファイルを読み込めませんでした。書き出したファイルか確認してください。", "error");
    }
    importInput.value = "";
  });

  el("clearAllBtn").addEventListener("click", () => {
    if (!events.length) {
      setStatus("削除する予定がありません。", "error");
      return;
    }
    if (!confirm(`予定を${events.length}件すべて削除します。元に戻せません。よろしいですか？`)) return;
    events = [];
    editingId = null;
    persist();
    renderAll();
    setStatus("すべての予定を削除しました。", "ok");
  });

  // ============================================
  // 初期化
  // ============================================
  el("year").textContent = new Date().getFullYear();
  inputCategory.innerHTML = categoryOptionsHtml(DEFAULT_CATEGORY);
  inputDate.value = selectedDate;
  events = load();
  renderAll();
})();
