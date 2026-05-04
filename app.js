const SESSION_KEY = "fastbook_session_v1";
const API_BASE = "/api";
const IS_FILE_PROTOCOL = window.location.protocol === "file:";

const state = loadState();
const query = new URLSearchParams(window.location.search);
const masterSlugFromUrl = query.get("master");

const elements = {
  authPanel: document.getElementById("auth-panel"),
  masterPanel: document.getElementById("master-panel"),
  clientPanel: document.getElementById("client-panel"),
  emptyState: document.getElementById("empty-state"),
  registerForm: document.getElementById("register-form"),
  loginForm: document.getElementById("login-form"),
  logoutBtn: document.getElementById("logout-btn"),
  tabHome: document.getElementById("tab-home"),
  tabServices: document.getElementById("tab-services"),
  tabProfile: document.getElementById("tab-profile"),
  viewCalendar: document.getElementById("view-calendar"),
  viewServices: document.getElementById("view-services"),
  viewProfile: document.getElementById("view-profile"),
  masterForm: document.getElementById("master-form"),
  serviceForm: document.getElementById("service-form"),
  serviceModal: document.getElementById("service-modal"),
  serviceModalTitle: document.getElementById("service-modal-title"),
  openServiceModal: document.getElementById("open-service-modal"),
  closeServiceModal: document.getElementById("close-service-modal"),
  serviceList: document.getElementById("service-list"),
  appointmentsList: document.getElementById("appointments-list"),
  selectedDateTitle: document.getElementById("selected-date-title"),
  mainCalendar: document.getElementById("main-calendar"),
  mainMonthLabel: document.getElementById("main-month-label"),
  toggleMainCalendar: document.getElementById("toggle-main-calendar"),
  mainPrevMonth: document.getElementById("main-prev-month"),
  mainNextMonth: document.getElementById("main-next-month"),
  offdayCalendar: document.getElementById("offday-calendar"),
  offMonthLabel: document.getElementById("off-month-label"),
  offPrevMonth: document.getElementById("off-prev-month"),
  offNextMonth: document.getElementById("off-next-month"),
  saveOffdays: document.getElementById("save-offdays"),
  publishComment: document.getElementById("publish-comment"),
  shareBox: document.getElementById("share-box"),
  qrBox: document.getElementById("qr-box"),
  bookingForm: document.getElementById("booking-form"),
  bookingSubmit: document.getElementById("booking-submit"),
  bookingServiceCards: document.getElementById("booking-service-cards"),
  bookingDateChips: document.getElementById("booking-date-chips"),
  bookingService: document.getElementById("booking-service"),
  bookingDate: document.getElementById("booking-date"),
  bookingTime: document.getElementById("booking-time"),
  bookingTimeSlots: document.getElementById("booking-time-slots"),
  masterCommentDisplay: document.getElementById("master-comment-display"),
  commentTitle: document.getElementById("comment-title"),
};

let selectedMainDate = toDateInput(new Date());
let mainCalendarCursor = new Date();
let offdayCursor = new Date();
let draftOffdays = new Set();
let mainCalendarExpanded = false;

init();

async function init() {
  if (masterSlugFromUrl) {
    try {
      const { master } = await apiFetch(`/public/masters/${masterSlugFromUrl}`);
      state.masters = [master];
      state.activeMasterId = master.id;
      showOnly("client");
      bindClient(master);
      renderClient(master);
      return;
    } catch {
      return showOnly("empty");
    }
  }

  bindMasterTabs();
  bindMaster();
  bindAuth();
  if (!state.token) return showOnly("auth");

  try {
    const { master } = await apiFetch("/me", { token: state.token });
    state.masters = [master];
    state.activeMasterId = master.id;
  } catch {
    clearSession();
    return showOnly("auth");
  }
  showOnly("master");
  switchMasterView("calendar");
  renderMaster();
}

function showOnly(mode) {
  elements.authPanel.classList.add("hidden");
  elements.masterPanel.classList.add("hidden");
  elements.clientPanel.classList.add("hidden");
  elements.emptyState.classList.add("hidden");

  if (mode === "auth") elements.authPanel.classList.remove("hidden");
  if (mode === "master") elements.masterPanel.classList.remove("hidden");
  if (mode === "client") elements.clientPanel.classList.remove("hidden");
  if (mode === "empty") elements.emptyState.classList.remove("hidden");
}

function bindAuth() {
  elements.registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = getValue("register-name");
    const email = getValue("register-email").toLowerCase();
    const password = getValue("register-password");
    if (!name || !email || password.length < 6) return alert("РџСЂРѕРІРµСЂСЊС‚Рµ РґР°РЅРЅС‹Рµ СЂРµРіРёСЃС‚СЂР°С†РёРё.");
    try {
      const { token, master } = await apiFetch("/auth/register", {
        method: "POST",
        body: { name, email, password },
      });
      saveSession(token);
      state.token = token;
      state.masters = [master];
      state.activeMasterId = master.id;
      elements.registerForm.reset();
      showOnly("master");
      switchMasterView("calendar");
      renderMaster();
    } catch (error) {
      alert(error.message || "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊСЃСЏ.");
    }
  });

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = getValue("login-email").toLowerCase();
    const password = getValue("login-password");
    try {
      const { token, master } = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      saveSession(token);
      state.token = token;
      state.masters = [master];
      state.activeMasterId = master.id;
      elements.loginForm.reset();
      showOnly("master");
      switchMasterView("calendar");
      renderMaster();
    } catch {
      alert("РќРµРІРµСЂРЅС‹Р№ email РёР»Рё РїР°СЂРѕР»СЊ.");
    }
  });
}

function bindMasterTabs() {
  elements.tabHome.addEventListener("click", () => switchMasterView("calendar"));
  elements.tabServices.addEventListener("click", () => switchMasterView("services"));
  elements.tabProfile.addEventListener("click", () => switchMasterView("profile"));
}

function switchMasterView(view) {
  elements.viewCalendar.classList.toggle("hidden", view !== "calendar");
  elements.viewServices.classList.toggle("hidden", view !== "services");
  elements.viewProfile.classList.toggle("hidden", view !== "profile");
  elements.tabServices.classList.toggle("is-active", view === "services");
  elements.tabProfile.classList.toggle("is-active", view === "profile");
}

function bindMaster() {
  elements.logoutBtn.addEventListener("click", () => {
    clearSession();
    state.token = null;
    state.masters = [];
    state.activeMasterId = null;
    showOnly("auth");
  });

  elements.mainPrevMonth.addEventListener("click", () => {
    mainCalendarCursor = new Date(mainCalendarCursor.getFullYear(), mainCalendarCursor.getMonth() - 1, 1);
    renderMainCalendar(getActiveMaster());
  });
  elements.mainNextMonth.addEventListener("click", () => {
    mainCalendarCursor = new Date(mainCalendarCursor.getFullYear(), mainCalendarCursor.getMonth() + 1, 1);
    renderMainCalendar(getActiveMaster());
  });
  elements.toggleMainCalendar.addEventListener("click", () => {
    mainCalendarExpanded = !mainCalendarExpanded;
    renderMainCalendar(getActiveMaster());
  });

  elements.offPrevMonth.addEventListener("click", () => {
    offdayCursor = new Date(offdayCursor.getFullYear(), offdayCursor.getMonth() - 1, 1);
    renderOffdayCalendar(getActiveMaster());
  });
  elements.offNextMonth.addEventListener("click", () => {
    offdayCursor = new Date(offdayCursor.getFullYear(), offdayCursor.getMonth() + 1, 1);
    renderOffdayCalendar(getActiveMaster());
  });

  elements.masterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = getValue("master-name");
    const slug = normalizeSlug(getValue("master-slug"));
    const workStart = getValue("work-start");
    const workEnd = getValue("work-end");
    const slotStepMin = Number(getValue("slot-step"));
    const bufferMin = Number(getValue("buffer-min"));
    const workDays = [...elements.masterForm.querySelectorAll(".weekdays input:checked")].map((item) => Number(item.value));

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return alert("РЎСЃС‹Р»РєР° РјР°СЃС‚РµСЂР° РјРѕР¶РµС‚ СЃРѕРґРµСЂР¶Р°С‚СЊ С‚РѕР»СЊРєРѕ Р»Р°С‚РёРЅРёС†Сѓ, С†РёС„СЂС‹ Рё РґРµС„РёСЃ.");
    if (toMinutes(workEnd) <= toMinutes(workStart)) return alert("РљРѕРЅРµС† СЂР°Р±РѕС‡РµРіРѕ РґРЅСЏ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РїРѕР·Р¶Рµ РЅР°С‡Р°Р»Р°.");
    if (!workDays.length) return alert("Р’С‹Р±РµСЂРёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ СЂР°Р±РѕС‡РёР№ РґРµРЅСЊ.");

    const duplicate = state.masters.find((m) => m.slug === slug && m.id !== state.activeMasterId);
    if (duplicate) return alert("РўР°РєР°СЏ СЃСЃС‹Р»РєР° СѓР¶Рµ Р·Р°РЅСЏС‚Р°.");

    let master = getActiveMaster();
    if (!master) {
      master = {
        id: uid(),
        name,
        slug,
        notes: "",
        workStart,
        workEnd,
        slotStepMin,
        bufferMin,
        workDays,
        services: [],
        offDays: [],
        appointments: [],
        editingServiceId: null,
        showPrice: true,
      };
      state.masters.push(master);
      state.activeMasterId = master.id;
    } else {
      Object.assign(master, { name, slug, workStart, workEnd, slotStepMin, bufferMin, workDays });
    }

    persist();
    renderMaster();
  });

  elements.publishComment.addEventListener("click", () => {
    const master = getActiveMaster();
    if (!master) return alert("РЎРЅР°С‡Р°Р»Р° СЃРѕС…СЂР°РЅРёС‚Рµ РґР°РЅРЅС‹Рµ РјР°СЃС‚РµСЂР°.");
    master.notes = getValue("master-notes");
    persist();
    renderMaster();
  });

  elements.serviceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const master = getActiveMaster();
    if (!master) {
      alert("РЎРЅР°С‡Р°Р»Р° Р·Р°РїРѕР»РЅРёС‚Рµ РґР°РЅРЅС‹Рµ РІ В«РњРѕР№ РєР°Р±РёРЅРµС‚В».");
      return switchMasterView("profile");
    }

    master.showPrice = !document.getElementById("hide-price").checked;

    const title = getValue("service-title");
    const price = Number(getValue("service-price"));
    const durationMin = Number(getValue("service-duration"));
    const notes = getValue("service-notes");

    if (!title || durationMin <= 0 || price < 0) return alert("РџСЂРѕРІРµСЂСЊС‚Рµ РїРѕР»СЏ СѓСЃР»СѓРіРё.");

    if (master.editingServiceId) {
      const service = master.services.find((s) => s.id === master.editingServiceId);
      if (service) Object.assign(service, { title, price, durationMin, notes });
      master.editingServiceId = null;
      elements.serviceForm.querySelector("button[type='submit']").textContent = "Р”РѕР±Р°РІРёС‚СЊ СѓСЃР»СѓРіСѓ";
      elements.serviceModalTitle.textContent = "Р”РѕР±Р°РІРёС‚СЊ СѓСЃР»СѓРіСѓ";
    } else {
      master.services.push({ id: uid(), title, price, durationMin, notes });
    }

    elements.serviceForm.reset();
    document.getElementById("hide-price").checked = !master.showPrice;
    setValue("service-duration", "60");
    persist();
    renderMaster();
    elements.serviceModal.close();
  });

  elements.openServiceModal.addEventListener("click", () => {
    const master = getActiveMaster();
    if (!master) {
      alert("РЎРЅР°С‡Р°Р»Р° Р·Р°РїРѕР»РЅРёС‚Рµ РґР°РЅРЅС‹Рµ РІ В«РњРѕР№ РєР°Р±РёРЅРµС‚В».");
      return switchMasterView("profile");
    }
    master.editingServiceId = null;
    elements.serviceModalTitle.textContent = "Р”РѕР±Р°РІРёС‚СЊ СѓСЃР»СѓРіСѓ";
    elements.serviceForm.reset();
    setValue("service-duration", "60");
    elements.serviceModal.showModal();
  });

  elements.closeServiceModal.addEventListener("click", () => {
    elements.serviceModal.close();
  });

  elements.serviceList.addEventListener("click", (event) => {
    const master = getActiveMaster();
    if (!master) return;

    const editBtn = event.target.closest("button[data-edit-service]");
    if (editBtn) {
      const service = master.services.find((s) => s.id === editBtn.dataset.editService);
      if (!service) return;
      master.editingServiceId = service.id;
      setValue("service-title", service.title);
      setValue("service-price", String(service.price));
      setValue("service-duration", String(service.durationMin));
      setValue("service-notes", service.notes || "");
      elements.serviceModalTitle.textContent = "Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ СѓСЃР»СѓРіСѓ";
      elements.serviceForm.querySelector("button[type='submit']").textContent = "РЎРѕС…СЂР°РЅРёС‚СЊ";
      elements.serviceModal.showModal();
      return;
    }

    const deleteBtn = event.target.closest("button[data-remove-service]");
    if (!deleteBtn) return;
    const serviceId = deleteBtn.dataset.removeService;
    master.services = master.services.filter((s) => s.id !== serviceId);
    master.appointments = master.appointments.filter((a) => a.serviceId !== serviceId);
    if (master.editingServiceId === serviceId) master.editingServiceId = null;
    persist();
    renderMaster();
  });

  elements.saveOffdays.addEventListener("click", () => {
    const master = getActiveMaster();
    if (!master) return;
    master.offDays = [...draftOffdays].sort();
    persist();
    renderMaster();
  });

  elements.appointmentsList.addEventListener("click", (event) => {
    const master = getActiveMaster();
    if (!master) return;

    const removeBtn = event.target.closest("button[data-remove-appointment]");
    if (removeBtn) {
      master.appointments = master.appointments.filter((item) => item.id !== removeBtn.dataset.removeAppointment);
      persist();
      renderMaster();
      return;
    }

    const moveBtn = event.target.closest("button[data-move-appointment]");
    if (!moveBtn) return;
    const appointment = master.appointments.find((item) => item.id === moveBtn.dataset.moveAppointment);
    if (!appointment) return;
    const service = master.services.find((item) => item.id === appointment.serviceId);
    if (!service) return alert("РќРµР»СЊР·СЏ РїРµСЂРµРЅРµСЃС‚Рё: СѓСЃР»СѓРіР° СѓРґР°Р»РµРЅР°.");

    const newDate = window.prompt("РќРѕРІР°СЏ РґР°С‚Р° (YYYY-MM-DD):", appointment.date);
    if (!newDate) return;
    if (!isDateAllowed(master, newDate)) return alert("РќР° СЌС‚Сѓ РґР°С‚Сѓ Р·Р°РїРёСЃСЊ РЅРµРґРѕСЃС‚СѓРїРЅР°.");
    const starts = findAvailableStarts(master, service, newDate, appointment.id);
    if (!starts.length) return alert("РќР° РІС‹Р±СЂР°РЅРЅСѓСЋ РґР°С‚Сѓ РЅРµС‚ СЃРІРѕР±РѕРґРЅРѕРіРѕ РІСЂРµРјРµРЅРё.");

    const newTime = window.prompt(`РќРѕРІРѕРµ РІСЂРµРјСЏ (${starts.join(", ")}):`, starts[0]);
    if (!newTime || !starts.includes(newTime)) return alert("Р­С‚Рѕ РІСЂРµРјСЏ РЅРµРґРѕСЃС‚СѓРїРЅРѕ.");

    appointment.date = newDate;
    appointment.start = newTime;
    appointment.end = minutesToTime(toMinutes(newTime) + service.durationMin);
    persist();
    renderMaster();
  });
}

function bindClient(master) {
  elements.bookingService.addEventListener("change", () => renderAvailableTimes(master));
  elements.bookingDate.addEventListener("change", () => renderAvailableTimes(master));

  elements.bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const serviceId = elements.bookingService.value;
    const date = elements.bookingDate.value;
    const start = elements.bookingTime.value;
    const phone = getValue("client-phone");
    const name = getValue("client-name");

    const service = master.services.find((s) => s.id === serviceId);
    if (!service) return alert("Р’С‹Р±РµСЂРёС‚Рµ СѓСЃР»СѓРіСѓ.");
    if (!date || !start || !phone || !name) return alert("Р—Р°РїРѕР»РЅРёС‚Рµ РґР°С‚Сѓ, РІСЂРµРјСЏ, С‚РµР»РµС„РѕРЅ Рё РёРјСЏ.");
    if (!isDateAllowed(master, date)) return alert("Р’С‹С…РѕРґРЅРѕР№");

    const available = findAvailableStarts(master, service, date);
    if (!available.includes(start)) {
      renderAvailableTimes(master);
      return alert("Р’С‹Р±СЂР°РЅРЅРѕРµ РІСЂРµРјСЏ СѓР¶Рµ Р·Р°РЅСЏС‚Рѕ.");
    }

    const appointmentPayload = {
      id: uid(),
      serviceId,
      clientName: name,
      clientPhone: phone,
      date,
      start,
      end: minutesToTime(toMinutes(start) + service.durationMin),
      createdAt: new Date().toISOString(),
    };

    if (masterSlugFromUrl) {
      await apiFetch(`/public/masters/${master.slug}/book`, {
        method: "POST",
        body: appointmentPayload,
      });
      const { master: updatedMaster } = await apiFetch(`/public/masters/${master.slug}`);
      Object.assign(master, updatedMaster);
    } else {
      master.appointments.push(appointmentPayload);
      persist();
    }

    elements.bookingForm.reset();
    elements.bookingDate.value = date;
    elements.bookingService.value = serviceId;
    renderAvailableTimes(master);
    alert("Р—Р°РїРёСЃСЊ СЃРѕС…СЂР°РЅРµРЅР°.");
  });
}

function renderMaster() {
  const master = getActiveMaster();
  if (!master) return;

  draftOffdays = new Set(master.offDays);
  setValue("master-name", master.name);
  setValue("master-slug", master.slug);
  setValue("work-start", master.workStart);
  setValue("work-end", master.workEnd);
  setValue("slot-step", String(master.slotStepMin));
  setValue("buffer-min", String(master.bufferMin));
  setValue("master-notes", master.notes || "");
  document.getElementById("hide-price").checked = master.showPrice === false;
  elements.serviceForm.querySelector("button[type='submit']").textContent = "РЎРѕС…СЂР°РЅРёС‚СЊ";

  elements.masterForm.querySelectorAll(".weekdays input").forEach((box) => {
    box.checked = master.workDays.includes(Number(box.value));
  });

  renderServices(master);
  renderMainCalendar(master);
  renderAppointments(master);
  renderOffdayCalendar(master);
  renderShare(master);
  renderQr(master);
}

function renderServices(master) {
  elements.serviceList.innerHTML = "";
  if (!master.services.length) {
    elements.serviceList.innerHTML = `<li class="muted">РЈСЃР»СѓРіРё РїРѕРєР° РЅРµ РґРѕР±Р°РІР»РµРЅС‹.</li>`;
    return;
  }

  master.services.forEach((service) => {
    const li = document.createElement("li");
    li.className = "one-line";
    li.innerHTML = `
      <span><strong>${escapeHtml(service.title)}</strong> В· ${service.durationMin} РјРёРЅ В· ${service.price} в‚Ѕ В· ${escapeHtml(service.notes || "Р±РµР· РЅСЋР°РЅСЃРѕРІ")}</span>
      <span class="item-actions">
        <button class="secondary" data-edit-service="${service.id}" type="button">Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ</button>
        <button data-remove-service="${service.id}" type="button">РЈРґР°Р»РёС‚СЊ</button>
      </span>
    `;
    elements.serviceList.appendChild(li);
  });
}

function renderMainCalendar(master) {
  elements.toggleMainCalendar.textContent = mainCalendarExpanded ? "в–ґ" : "в–ѕ";
  elements.mainPrevMonth.classList.toggle("is-nav-hidden", !mainCalendarExpanded);
  elements.mainNextMonth.classList.toggle("is-nav-hidden", !mainCalendarExpanded);
  elements.mainCalendar.classList.toggle("expanded", mainCalendarExpanded);
  elements.mainCalendar.classList.toggle("collapsed", !mainCalendarExpanded);
  if (mainCalendarExpanded) {
    renderMonthCalendar({
      target: elements.mainCalendar,
      label: elements.mainMonthLabel,
      cursor: mainCalendarCursor,
      selectedDate: selectedMainDate,
      offDays: master.offDays,
      onClickDate: (date) => {
        selectedMainDate = date;
        renderMainCalendar(master);
        renderAppointments(master);
      },
    });
    return;
  }

  elements.mainMonthLabel.textContent = "Р‘Р»РёР¶Р°Р№С€РёРµ 7 РґРЅРµР№";
  renderSevenDaysCalendar(master);
}

function renderSevenDaysCalendar(master) {
  elements.mainCalendar.innerHTML = "";
  const start = new Date();
  const weekdays = ["Р’СЃ", "РџРЅ", "Р’С‚", "РЎСЂ", "Р§С‚", "РџС‚", "РЎР±"];

  const weekHeader = document.createElement("div");
  weekHeader.className = "week-header";
  Array.from({ length: 7 }).forEach((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const cell = document.createElement("div");
    cell.textContent = weekdays[date.getDay()];
    weekHeader.appendChild(cell);
  });
  elements.mainCalendar.appendChild(weekHeader);

  const row = document.createElement("div");
  row.className = "calendar-grid seven-days";

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const iso = toDateInput(date);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-cell";
    if (master.offDays.includes(iso)) cell.classList.add("is-offday");
    if (selectedMainDate === iso) cell.classList.add("is-selected");
    cell.textContent = `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
    cell.addEventListener("click", () => {
      selectedMainDate = iso;
      renderMainCalendar(master);
      renderAppointments(master);
    });
    row.appendChild(cell);
  }
  elements.mainCalendar.appendChild(row);
}

function renderOffdayCalendar(master) {
  renderMonthCalendar({
    target: elements.offdayCalendar,
    label: elements.offMonthLabel,
    cursor: offdayCursor,
    selectedDate: null,
    offDays: [...draftOffdays],
    onClickDate: (date) => {
      if (draftOffdays.has(date)) draftOffdays.delete(date);
      else draftOffdays.add(date);
      renderOffdayCalendar(master);
    },
  });
}

function renderMonthCalendar({ target, label, cursor, selectedDate, offDays, onClickDate }) {
  target.innerHTML = "";
  label.textContent = cursor.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  const weekHeader = document.createElement("div");
  weekHeader.className = "week-header";
  ["РџРЅ", "Р’С‚", "РЎСЂ", "Р§С‚", "РџС‚", "РЎР±", "Р’СЃ"].forEach((day) => {
    const cell = document.createElement("div");
    cell.textContent = day;
    weekHeader.appendChild(cell);
  });
  target.appendChild(weekHeader);

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < offset; i += 1) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.disabled = true;
    empty.className = "calendar-cell empty";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-cell";
    cell.textContent = String(day);
    if (offDays.includes(date)) cell.classList.add("is-offday");
    if (selectedDate === date) cell.classList.add("is-selected");
    cell.addEventListener("click", () => onClickDate(date));
    grid.appendChild(cell);
  }

  target.appendChild(grid);
}

function renderAppointments(master) {
  elements.appointmentsList.innerHTML = "";
  elements.selectedDateTitle.textContent = `Р—Р°РїРёСЃРё РЅР° ${selectedMainDate}`;

  const items = master.appointments
    .filter((item) => item.date === selectedMainDate)
    .sort((a, b) => a.start.localeCompare(b.start));

  if (!items.length) {
    elements.appointmentsList.innerHTML = `<li class="muted">РќР° РІС‹Р±СЂР°РЅРЅСѓСЋ РґР°С‚Сѓ Р·Р°РїРёСЃРµР№ РЅРµС‚.</li>`;
    return;
  }

  items.forEach((item) => {
    const service = master.services.find((s) => s.id === item.serviceId);
    const li = document.createElement("li");
    li.className = "one-line";
    li.innerHTML = `
      <span>${item.start}вЂ“${item.end} В· ${escapeHtml(item.clientName)} В· ${escapeHtml(item.clientPhone)} В· ${escapeHtml(service?.notes || "Р±РµР· РЅСЋР°РЅСЃРѕРІ")}</span>
      <span class="item-actions">
        <button class="secondary" data-move-appointment="${item.id}" type="button">РџРµСЂРµРЅРµСЃС‚Рё</button>
        <button data-remove-appointment="${item.id}" type="button">РЈРґР°Р»РёС‚СЊ</button>
      </span>
    `;
    elements.appointmentsList.appendChild(li);
  });
}

function renderShare(master) {
  const link = `${window.location.origin}${window.location.pathname}?master=${master.slug}`;
  elements.shareBox.innerHTML = `<strong>РЎСЃС‹Р»РєР° РґР»СЏ РєР»РёРµРЅС‚РѕРІ:</strong><br><a href="${link}" target="_blank" rel="noopener">${link}</a>`;
}

function renderQr(master) {
  const link = `${window.location.origin}${window.location.pathname}?master=${master.slug}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
  elements.qrBox.innerHTML = `<strong>QR-РєРѕРґ</strong><img src="${qr}" alt="QR РєРѕРґ РјР°СЃС‚РµСЂР°" loading="lazy" />`;
}

function renderClient(master) {
  renderClientServices(master);
  renderDateChips(master);
  const hasComment = Boolean(master.notes?.trim());
  elements.commentTitle.classList.toggle("hidden", !hasComment);
  elements.masterCommentDisplay.classList.toggle("hidden", !hasComment);
  elements.masterCommentDisplay.textContent = hasComment ? master.notes : "";

  const today = new Date();
  const max = new Date(today);
  max.setDate(max.getDate() + 60);
  elements.bookingDate.min = toDateInput(today);
  elements.bookingDate.max = toDateInput(max);
  if (!elements.bookingDate.value) elements.bookingDate.value = toDateInput(today);

  renderAvailableTimes(master);
  updateBookingSubmitText();
}

function renderClientServices(master) {
  elements.bookingService.innerHTML = "";
  elements.bookingServiceCards.innerHTML = "";
  if (!master.services.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "РЈ РјР°СЃС‚РµСЂР° РїРѕРєР° РЅРµС‚ СѓСЃР»СѓРі";
    elements.bookingService.appendChild(opt);
    elements.bookingServiceCards.innerHTML = `<p class="muted">РЈ РјР°СЃС‚РµСЂР° РїРѕРєР° РЅРµС‚ СѓСЃР»СѓРі.</p>`;
    return;
  }

  master.services.forEach((service) => {
    const opt = document.createElement("option");
    opt.value = service.id;
    const pricePart = master.showPrice === false ? "" : ` В· ${service.price} в‚Ѕ`;
    opt.textContent = `${service.title} В· ${service.durationMin} РјРёРЅ${pricePart}`;
    elements.bookingService.appendChild(opt);

    const card = document.createElement("button");
    card.type = "button";
    card.className = "service-card";
    card.dataset.serviceId = service.id;
    card.innerHTML = `
      <strong>${escapeHtml(service.title)}</strong>
      <span>${service.durationMin} РјРёРЅ${pricePart}</span>
    `;
    card.addEventListener("click", () => {
      elements.bookingService.value = service.id;
      elements.bookingServiceCards.querySelectorAll(".service-card").forEach((node) => node.classList.remove("is-selected"));
      card.classList.add("is-selected");
      renderAvailableTimes(master);
    });
    elements.bookingServiceCards.appendChild(card);
  });

  if (!elements.bookingService.value) elements.bookingService.value = master.services[0].id;
  const currentCard = elements.bookingServiceCards.querySelector(`[data-service-id="${elements.bookingService.value}"]`);
  currentCard?.classList.add("is-selected");
}

function renderDateChips(master) {
  elements.bookingDateChips.innerHTML = "";
  const start = new Date();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const iso = toDateInput(date);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "date-chip";
    chip.dataset.date = iso;
    const weekday = date.toLocaleDateString("ru-RU", { weekday: "short" });
    const dayMonth = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    chip.innerHTML = `<strong>${i === 0 ? "РЎРµРіРѕРґРЅСЏ" : weekday}</strong><span>${dayMonth}</span>`;
    chip.disabled = !isDateAllowed(master, iso);
    chip.addEventListener("click", () => {
      elements.bookingDate.value = iso;
      updateDateChipSelection();
      renderAvailableTimes(master);
    });
    elements.bookingDateChips.appendChild(chip);
  }
  updateDateChipSelection();
}

function renderAvailableTimes(master) {
  const service = master.services.find((s) => s.id === elements.bookingService.value);
  const date = elements.bookingDate.value;
  elements.bookingTime.value = "";
  elements.bookingTimeSlots.innerHTML = "";

  if (!service || !date) return appendTimeText("РќРµС‚ РґРѕСЃС‚СѓРїРЅРѕРіРѕ РІСЂРµРјРµРЅРё");
  if (!isDateAllowed(master, date)) return appendTimeText("Р’С‹С…РѕРґРЅРѕР№");

  const starts = findAvailableStarts(master, service, date);
  if (!starts.length) return appendTimeText("РќРµС‚ РґРѕСЃС‚СѓРїРЅРѕРіРѕ РІСЂРµРјРµРЅРё");

  starts.forEach((time) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-btn";
    btn.textContent = time;
    btn.addEventListener("click", () => {
      elements.bookingTime.value = time;
      elements.bookingTimeSlots.querySelectorAll(".slot-btn").forEach((node) => node.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      updateBookingSubmitText();
    });
    elements.bookingTimeSlots.appendChild(btn);
  });
  updateBookingSubmitText();
}

function appendTimeText(text) {
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = text;
  elements.bookingTimeSlots.appendChild(p);
  updateBookingSubmitText();
}

function updateDateChipSelection() {
  elements.bookingDateChips.querySelectorAll(".date-chip").forEach((chip) => {
    chip.classList.toggle("is-selected", chip.dataset.date === elements.bookingDate.value);
  });
}

function updateBookingSubmitText() {
  if (!elements.bookingSubmit) return;
  const date = elements.bookingDate.value;
  const time = elements.bookingTime.value;
  if (!date || !time) {
    elements.bookingSubmit.textContent = "Р—Р°РїРёСЃР°С‚СЊСЃСЏ";
    return;
  }
  const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  elements.bookingSubmit.textContent = `Р—Р°РїРёСЃР°С‚СЊСЃСЏ РЅР° ${prettyDate} РІ ${time}`;
}

function findAvailableStarts(master, service, date, ignoreAppointmentId = null) {
  const free = [];
  const from = toMinutes(master.workStart);
  const to = toMinutes(master.workEnd);
  for (let start = from; start + service.durationMin <= to; start += master.slotStepMin) {
    const end = start + service.durationMin;
    if (isRangeFree(master, date, start, end, master.bufferMin, ignoreAppointmentId)) free.push(minutesToTime(start));
  }
  return free;
}

function isRangeFree(master, date, startMin, endMin, buffer, ignoreAppointmentId = null) {
  for (const appt of master.appointments) {
    if (appt.date !== date) continue;
    if (ignoreAppointmentId && appt.id === ignoreAppointmentId) continue;
    const bookedStart = toMinutes(appt.start) - buffer;
    const bookedEnd = toMinutes(appt.end) + buffer;
    if (startMin < bookedEnd && bookedStart < endMin) return false;
  }
  return true;
}

function isDateAllowed(master, date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return master.workDays.includes(day) && !master.offDays.includes(date);
}

function getActiveMaster() {
  return state.masters.find((m) => m.id === state.activeMasterId) || null;
}

function getMasterBySlug(slug) {
  return state.masters.find((m) => m.slug === slug) || null;
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { token: null, masters: [], activeMasterId: null };
    const parsed = JSON.parse(raw);
    return { token: parsed.token || null, masters: [], activeMasterId: null };
  } catch {
    return { token: null, masters: [], activeMasterId: null };
  }
}

function persist() {
  const master = getActiveMaster();
  if (!master || !state.token) return;
  normalizeMasterIds(master);
  apiFetch(`/masters/${master.id}`, {
    method: "PUT",
    token: state.token,
    body: master,
  }).catch((error) => {
    console.error(error);
  });
}

function normalizeMasterIds(master) {
  const serviceIdMap = new Map();
  master.services = master.services.map((service) => {
    if (isUuid(service.id)) return service;
    const newId = uid();
    serviceIdMap.set(service.id, newId);
    return { ...service, id: newId };
  });

  master.appointments = master.appointments.map((appointment) => {
    const normalizedServiceId = serviceIdMap.get(appointment.serviceId) || appointment.serviceId;
    const normalizedId = isUuid(appointment.id) ? appointment.id : uid();
    return { ...appointment, id: normalizedId, serviceId: normalizedServiceId };
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function saveSession(token) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

async function apiFetch(path, { method = "GET", token, body } = {}) {
  if (IS_FILE_PROTOCOL) {
    throw new Error("РџСЂРёР»РѕР¶РµРЅРёРµ РЅРµР»СЊР·СЏ РѕС‚РєСЂС‹РІР°С‚СЊ РґРІРѕР№РЅС‹Рј РєР»РёРєРѕРј РїРѕ index.html. Р—Р°РїСѓСЃС‚РёС‚Рµ С‡РµСЂРµР· npm start Рё РѕС‚РєСЂРѕР№С‚Рµ http://localhost:3000.");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function setValue(id, value) {
  document.getElementById(id).value = value;
}

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(total) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function toDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function normalizeSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}


