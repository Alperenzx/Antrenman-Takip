// ===== DEFAULT EXERCISE POOL =====
const cleanStandardPool = [
  { id: "bp", name: "Bench Press", muscle: "Göğüs", videoId: "hWbUlkb5Ms4", start: 0, end: 0 },
  { id: "dips_gogus", name: "Dips (Göğüs)", muscle: "Göğüs", videoId: "eicOUO9WaJc", start: 0, end: 0 },
  { id: "mp", name: "Military Press", muscle: "Omuz", videoId: "", start: 0, end: 0 },
  { id: "lr", name: "Lateral Raise", muscle: "Omuz", videoId: "Kl3LEzQ5Zqs", start: 0, end: 0 },
  { id: "lp", name: "Lat Pulldown", muscle: "Sırt", videoId: "hnSqbBk15tw", start: 0, end: 0 },
  { id: "pr", name: "Pendlay Row", muscle: "Sırt", videoId: "axoeDmW0oAY", start: 0, end: 0 },
  { id: "barbell_curl", name: "Barbell Curl", muscle: "Biceps", videoId: "54x2WF1_Suc", start: 0, end: 0 },
  { id: "skull_crusher", name: "Skull Crusher", muscle: "Triceps", videoId: "K3mFeNz4e3w", start: 0, end: 0 },
  { id: "cf", name: "Chest Fly", muscle: "Göğüs", videoId: "I-Ue34qLxc4", start: 0, end: 0 },
  { id: "clr", name: "Cable Lateral Raise", muscle: "Omuz", videoId: "928aRhhPP8I", start: 420, end: 553 },
  { id: "sspm", name: "Seated Shoulder Press (Machine)", muscle: "Omuz", videoId: "6v4nrRVySj0", start: 0, end: 0 },
  { id: "scrvg", name: "Seated Cable Row (V Grip)", muscle: "Sırt", videoId: "qD1WZ5pSuvk", start: 0, end: 0 },
  { id: "coteb", name: "Cable Overhead Triceps Extension", muscle: "Triceps", videoId: "928aRhhPP8I", start: 659, end: 710 },
  { id: "bc", name: "Bayesian Curl", muscle: "Biceps", videoId: "928aRhhPP8I", start: 711, end: 766 }
];

const unwantedNames = [
  "back curl (cable)", "back curl", "overhead triceps extension (bar)",
  "overhead triceps extension", "single arm lateral raise", "triceps bar baş üstü",
  "biceps tek kol", "seated cable row"
];


// ===== DATA INITIALIZATION =====
let savedPool = JSON.parse(localStorage.getItem("fit_pool")) || [];
savedPool = savedPool.filter(item => !unwantedNames.includes(item.name.toLowerCase()));

cleanStandardPool.forEach(defEx => {
  const idx = savedPool.findIndex(s => s.id === defEx.id || s.name.toLowerCase() === defEx.name.toLowerCase());
  if (idx !== -1) {
    savedPool[idx] = { ...savedPool[idx], ...defEx };
  } else {
    savedPool.push(defEx);
  }
});

localStorage.setItem("fit_pool", JSON.stringify(savedPool));
let globalExercisePool = savedPool;

let routines = JSON.parse(localStorage.getItem("fit_routines")) || [];
const validIds = globalExercisePool.map(e => e.id);
routines.forEach(r => {
  r.exerciseIds = r.exerciseIds.filter(id => validIds.includes(id));
});
localStorage.setItem("fit_routines", JSON.stringify(routines));


// ===== GLOBAL STATE =====
let currentRoutineId = null;
let selectedDetailExId = null;
let isCreatingFromLibrary = false;
let tempSelectedExerciseIds = [];
let chartInstanceLib = null;
let chartInstanceWorkout = null;
let isReorderingRoutine = false;
let isReorderingLibrary = false;
let longPressTimer = null;
let routineSets = JSON.parse(localStorage.getItem("fit_routine_sets")) || {};
let restTimerInterval = null;
let restSecondsElapsed = 0;


// ===== THEME MANAGEMENT =====
function initTheme() {
  const savedTheme = localStorage.getItem("fit_theme") || "oled";
  applyTheme(savedTheme);
}

function toggleTheme() {
  const current = document.body.classList.contains("theme-oled") ? "oled" : "stealth";
  const nextTheme = current === "oled" ? "stealth" : "oled";
  applyTheme(nextTheme);
  localStorage.setItem("fit_theme", nextTheme);
}

function applyTheme(theme) {
  if (theme === "stealth") {
    document.body.classList.remove("theme-oled");
    document.body.classList.add("theme-stealth");
  } else {
    document.body.classList.remove("theme-stealth");
    document.body.classList.add("theme-oled");
  }
}


// ===== STORAGE HELPERS =====
function savePool() { localStorage.setItem("fit_pool", JSON.stringify(globalExercisePool)); }
function saveRoutines() { localStorage.setItem("fit_routines", JSON.stringify(routines)); }
function getHistory(exId) { return JSON.parse(localStorage.getItem(`fit_history_${exId}`) || "[]"); }
function saveHistory(exId, history) { localStorage.setItem(`fit_history_${exId}`, JSON.stringify(history)); }
function saveRoutineSets() { localStorage.setItem("fit_routine_sets", JSON.stringify(routineSets)); }


// ===== SCROLL LOCK =====
function lockScroll() { document.body.classList.add("modal-open"); }
function unlockScroll() { document.body.classList.remove("modal-open"); }


// ===== LONG PRESS HANDLER =====
function attachLongPress(element, callback) {
  let moved = false;
  const start = () => {
    moved = false;
    longPressTimer = setTimeout(() => {
      if (!moved) callback();
    }, 450);
  };
  const cancel = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  element.addEventListener("touchstart", start, { passive: true });
  element.addEventListener("touchmove", () => { moved = true; cancel(); }, { passive: true });
  element.addEventListener("touchend", cancel);
  element.addEventListener("touchcancel", cancel);
  element.addEventListener("contextmenu", (e) => { e.preventDefault(); return false; });
}


// ===== REORDER MODE =====
function toggleReorderMode(scope) {
  if (scope === 'routine') {
    isReorderingRoutine = !isReorderingRoutine;
    const btn = document.getElementById("btnToggleReorderRoutine");
    btn.innerText = isReorderingRoutine ? "Bitti ✓" : "Düzenle";
    btn.className = isReorderingRoutine ? "text-[11px] btn-premium text-white px-3 py-1.5 rounded-full font-bold" : "text-[11px] glass text-zinc-300 px-3 py-1.5 rounded-full font-bold";
    renderWorkout(false);
  } else if (scope === 'library') {
    isReorderingLibrary = !isReorderingLibrary;
    const btn = document.getElementById("btnToggleReorderLibrary");
    btn.innerText = isReorderingLibrary ? "Bitti ✓" : "Düzenle";
    btn.className = isReorderingLibrary ? "text-[11px] btn-premium text-white px-3 py-1.5 rounded-xl font-bold" : "text-[11px] glass text-zinc-300 px-3 py-1.5 rounded-xl font-bold";
    renderLibrary();
  }
}


// ===== SWIPE-TO-BACK GESTURE =====
let touchStartX = 0;
let touchStartY = 0;
let isSwipingBack = false;
let activeSwipeElement = null;

function getActiveSubView() {
  if (!document.getElementById("viewWorkoutExerciseDetail").classList.contains("hidden")) {
    return { el: document.getElementById("viewWorkoutExerciseDetail"), backFn: closeWorkoutExerciseDetail };
  }
  if (!document.getElementById("viewLibraryDetail").classList.contains("hidden")) {
    return { el: document.getElementById("viewLibraryDetail"), backFn: closeLibraryDetail };
  }
  if (!document.getElementById("viewWorkout").classList.contains("hidden")) {
    return { el: document.getElementById("viewWorkout"), backFn: goHome };
  }
  if (!document.getElementById("viewLibrary").classList.contains("hidden")) {
    return { el: document.getElementById("viewLibrary"), backFn: closeLibraryPage };
  }
  return null;
}

window.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;

  if (x <= 38) {
    const active = getActiveSubView();
    if (active) {
      touchStartX = x;
      touchStartY = y;
      isSwipingBack = true;
      activeSwipeElement = active.el;
      activeSwipeElement.style.transition = "none";
    }
  }
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (!isSwipingBack || !activeSwipeElement) return;
  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;
  const deltaX = currentX - touchStartX;
  const deltaY = Math.abs(currentY - touchStartY);

  if (deltaX > 0 && deltaX > deltaY) {
    activeSwipeElement.style.transform = `translateX(${deltaX}px)`;
    activeSwipeElement.style.boxShadow = `-10px 0 25px rgba(0,0,0,0.6)`;
  }
}, { passive: true });

window.addEventListener("touchend", (e) => {
  if (!isSwipingBack || !activeSwipeElement) return;
  isSwipingBack = false;
  const currentX = e.changedTouches[0].clientX;
  const deltaX = currentX - touchStartX;
  const active = getActiveSubView();

  activeSwipeElement.style.transition = "transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s ease";

  if (deltaX > 80 && active) {
    activeSwipeElement.style.transform = `translateX(100%)`;
    setTimeout(() => {
      activeSwipeElement.style.transform = "";
      activeSwipeElement.style.boxShadow = "";
      active.backFn();
    }, 220);
  } else {
    activeSwipeElement.style.transform = `translateX(0)`;
    setTimeout(() => {
      if (activeSwipeElement) {
        activeSwipeElement.style.transform = "";
        activeSwipeElement.style.boxShadow = "";
      }
    }, 240);
  }
  activeSwipeElement = null;
});

window.addEventListener("popstate", () => {
  const active = getActiveSubView();
  if (active) active.backFn();
});

function pushHistoryState(pageName) {
  history.pushState({ page: pageName }, "");
}


// ===== BOTTOM SHEET DRAG =====
let sheetStartY = 0;
let isDraggingSheet = false;
const modalEl = document.getElementById("exercisePickerModal");
const sheetEl = document.getElementById("exercisePickerSheet");
const dragArea = document.getElementById("sheetDragArea");

dragArea.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  sheetStartY = e.touches[0].clientY;
  isDraggingSheet = true;
  sheetEl.style.transition = "none";
}, { passive: true });

dragArea.addEventListener("touchmove", (e) => {
  if (!isDraggingSheet) return;
  const currentY = e.touches[0].clientY;
  const deltaY = currentY - sheetStartY;
  if (deltaY > 0) {
    sheetEl.style.transform = `translateY(${deltaY}px)`;
    const opacity = Math.max(0.2, 1 - (deltaY / 300));
    modalEl.style.backgroundColor = `rgba(0, 0, 0, ${0.8 * opacity})`;
  }
}, { passive: true });

dragArea.addEventListener("touchend", (e) => {
  if (!isDraggingSheet) return;
  isDraggingSheet = false;
  const currentY = e.changedTouches[0].clientY;
  const deltaY = currentY - sheetStartY;

  if (deltaY > 80) {
    animateCloseSheet();
  } else {
    sheetEl.style.transition = "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)";
    sheetEl.style.transform = "translateY(0)";
    modalEl.style.backgroundColor = "";
  }
});

function openExerciseSelector() {
  const current = routines.find(r => r.id === currentRoutineId);
  if (!current) return;

  tempSelectedExerciseIds = [...current.exerciseIds];
  renderPickerList();

  modalEl.classList.remove("hidden");
  modalEl.offsetHeight;
  modalEl.classList.add("show-modal");
  sheetEl.style.transform = "";
  modalEl.style.backgroundColor = "";
  lockScroll();
}

function animateCloseSheet() {
  sheetEl.style.transition = "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)";
  modalEl.style.transition = "opacity 0.28s ease";
  sheetEl.style.transform = "translateY(100%)";
  modalEl.style.opacity = "0";

  setTimeout(() => {
    modalEl.classList.remove("show-modal");
    modalEl.classList.add("hidden");
    modalEl.style.opacity = "";
    sheetEl.style.transform = "";
    sheetEl.style.transition = "";
    modalEl.style.transition = "";
    modalEl.style.backgroundColor = "";
    unlockScroll();
  }, 280);
}

function closeExerciseSelector(event) {
  if (event && event.target !== modalEl && !event.target.classList.contains("tap-press")) return;
  animateCloseSheet();
}


// ===== PAGE TRANSITIONS =====
function goHome() {
  currentRoutineId = null;
  isReorderingRoutine = false;
  document.getElementById("viewWorkout").classList.add("hidden");
  document.getElementById("viewLibrary").classList.add("hidden");
  document.getElementById("viewLibraryDetail").classList.add("hidden");
  document.getElementById("viewWorkoutExerciseDetail").classList.add("hidden");
  document.getElementById("floatingExerciseBubble").classList.remove("hidden");

  const vHome = document.getElementById("viewHome");
  vHome.classList.remove("hidden");
  vHome.classList.remove("anim-forward");
  vHome.classList.add("anim-back");
  renderHome();
}

function openWorkout(routineId) {
  currentRoutineId = routineId;
  isReorderingRoutine = false;
  pushHistoryState("workout");
  document.getElementById("viewHome").classList.add("hidden");
  document.getElementById("viewLibrary").classList.add("hidden");
  document.getElementById("viewLibraryDetail").classList.add("hidden");
  document.getElementById("viewWorkoutExerciseDetail").classList.add("hidden");
  document.getElementById("floatingExerciseBubble").classList.add("hidden");

  const vWorkout = document.getElementById("viewWorkout");
  vWorkout.classList.remove("hidden");
  vWorkout.classList.remove("anim-back");
  vWorkout.classList.add("anim-forward");
  renderWorkout(true);
}


// ===== STATS DASHBOARD =====
function updateStatsDashboard() {
  let totalPR = 0;
  globalExercisePool.forEach(ex => {
    const maxKg = getMaxKg(getHistory(ex.id));
    if (maxKg && maxKg > 0) totalPR++;
  });

  const statPR = document.getElementById("statTotalPR");
  const statEx = document.getElementById("statExCount");
  const statR = document.getElementById("statRoutineCount");

  animateNumber(statPR, totalPR);
  animateNumber(statEx, globalExercisePool.length);
  animateNumber(statR, routines.length);
}

function animateNumber(el, target) {
  const duration = 600;
  const start = 0;
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    el.innerText = current;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}


// ===== HOME PAGE RENDER =====
function renderHome() {
  const container = document.getElementById("routineCardList");
  container.innerHTML = "";
  updateStatsDashboard();

  if (routines.length === 0) {
    container.innerHTML = `
      <div class="glass rounded-[28px] p-8 text-center mt-4 glow-ring">
        <div class="w-16 h-16 rounded-2xl gradient-accent-subtle border border-violet-500/20 text-violet-400 font-bold text-2xl flex items-center justify-center mx-auto mb-4 anim-float">📋</div>
        <h3 class="text-base font-extrabold text-white mb-1.5">Henüz Program Yok</h3>
        <p class="text-xs text-zinc-500 mb-5 font-medium leading-relaxed">Yeni bir antrenman programı oluşturarak<br>egzersizlerini eklemeye başlayabilirsin.</p>
        <div class="progress-bar w-1/2 mx-auto">
          <div class="progress-bar-fill" style="width: 0%"></div>
        </div>
      </div>
    `;
    return;
  }

  routines.forEach((r, idx) => {
    const count = r.exerciseIds.length;

    // Calculate completion for this routine
    let totalSets = 0, doneSets = 0;
    if (routineSets[r.id]) {
      r.exerciseIds.forEach(exId => {
        const sets = routineSets[r.id][exId] || [];
        totalSets += sets.length;
        doneSets += sets.filter(s => s.done).length;
      });
    }
    const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

    // Get muscle groups
    const muscles = [...new Set(r.exerciseIds.map(id => {
      const ex = globalExercisePool.find(e => e.id === id);
      return ex ? ex.muscle : null;
    }).filter(Boolean))];
    const muscleText = muscles.slice(0, 3).join(' · ') || 'Boş Program';

    const card = document.createElement("div");
    card.className = `tap-press routine-card glass p-4 rounded-[20px] flex flex-col cursor-pointer anim-card glow-ring`;
    card.style.animationDelay = `${idx * 50}ms`;
    card.onclick = () => openWorkout(r.id);
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2.5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white font-black text-sm shadow-lg">
            ${r.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 class="text-[15px] font-extrabold text-white tracking-tight leading-tight">${r.name}</h3>
            <p class="text-[10px] text-zinc-500 font-medium mt-0.5">${muscleText}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-zinc-500 font-num">${count} Hareket</span>
          <span class="text-zinc-600 text-sm">›</span>
        </div>
      </div>
      ${totalSets > 0 ? `
        <div class="progress-bar mt-1">
          <div class="progress-bar-fill" style="width: ${pct}%"></div>
        </div>
        <div class="flex justify-between items-center mt-1.5">
          <span class="text-[9px] text-zinc-600 font-num font-bold">${doneSets}/${totalSets} set</span>
          <span class="text-[9px] font-bold font-num ${pct === 100 ? 'text-emerald-400' : 'text-violet-400'}">${pct}%</span>
        </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
}


// ===== ROUTINE MODAL =====
function openNewRoutineModal() {
  const modal = document.getElementById("newRoutineModal");
  const input = document.getElementById("newRoutineInput");
  input.value = "";
  modal.classList.remove("hidden");
  lockScroll();
  setTimeout(() => input.focus(), 80);
}

function closeNewRoutineModal() {
  document.getElementById("newRoutineModal").classList.add("hidden");
  unlockScroll();
}

function submitNewRoutine() {
  const input = document.getElementById("newRoutineInput");
  const name = input.value.trim();
  if (!name) return;

  const newRoutine = { id: "r_" + Date.now(), name: name, exerciseIds: [] };
  routines.push(newRoutine);
  saveRoutines();
  closeNewRoutineModal();
  setTimeout(() => openWorkout(newRoutine.id), 80);
}

function deleteCurrentRoutine() {
  if (confirm("Bu programı tamamen silmek istiyor musun?")) {
    routines = routines.filter(r => r.id !== currentRoutineId);
    if (routineSets[currentRoutineId]) {
      delete routineSets[currentRoutineId];
      saveRoutineSets();
    }
    saveRoutines();
    goHome();
  }
}


// ===== WORKOUT RENDER =====
function renderWorkout(animate = false) {
  const routine = routines.find(r => r.id === currentRoutineId);
  if (!routine) return goHome();

  document.getElementById("workoutTitle").innerText = routine.name;
  document.getElementById("workoutSubtitle").innerText = `${routine.exerciseIds.length} Egzersiz`;

  const container = document.getElementById("routineContainer");
  container.innerHTML = "";

  if (routine.exerciseIds.length === 0) {
    container.innerHTML = `
      <div class="glass rounded-[28px] p-6 text-center mt-3 glow-ring">
        <p class="text-xs text-zinc-400 mb-1 font-semibold">Bu program henüz boş.</p>
        <p class="text-[11px] text-zinc-500 font-medium">Alttaki butona basarak hareket ekleyebilirsin.</p>
      </div>
    `;
    return;
  }

  if (!routineSets[currentRoutineId]) {
    routineSets[currentRoutineId] = {};
  }

  routine.exerciseIds.forEach((exId, exIndex) => {
    const ex = globalExercisePool.find(e => e.id === exId);
    if (!ex) return;

    if (!routineSets[currentRoutineId][exId]) {
      routineSets[currentRoutineId][exId] = [];
    }

    const sets = routineSets[currentRoutineId][exId];
    const hist = getHistory(exId);
    const lastRec = hist[hist.length - 1];

    // Calculate exercise completion
    const doneSets = sets.filter(s => s.done).length;
    const totalSets = sets.length;
    const exPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

    const card = document.createElement("div");
    card.id = `routine_card_${exId}`;
    card.className = `glass rounded-[22px] p-4 glow-ring transition-all duration-300 ${animate ? 'anim-card' : ''} ${isReorderingRoutine ? 'wiggle' : ''}`;
    card.style.cssText = animate ? `animation-delay: ${exIndex * 50}ms;` : '';
    if (isReorderingRoutine) card.style.borderColor = 'rgba(124,58,237,0.4)';

    attachLongPress(card, () => {
      if (!isReorderingRoutine) toggleReorderMode('routine');
    });

    let setsHtml = "";
    sets.forEach((set, idx) => {
      const isDone = set.done;

      let typeColorClass = "text-zinc-300";
      if (set.type === "F") typeColorClass = "text-rose-400 font-extrabold";
      else if (set.type === "W") typeColorClass = "text-amber-400 font-extrabold";
      else if (set.type === "D") typeColorClass = "text-purple-400 font-extrabold";

      setsHtml += `
        <div class="set-row grid grid-cols-[22px_1fr_1fr_48px_36px] gap-2 items-center theme-subcard p-2 rounded-xl border ${isDone ? 'done-glow border-violet-500/30 bg-violet-950/20' : 'border-white/[0.04]'} transition">
          <span class="text-[11px] font-bold ${isDone ? 'gradient-text' : 'text-zinc-500'} text-center font-num">${idx + 1}</span>
          
          <div class="flex flex-col">
            <input type="text" inputmode="decimal" pattern="[0-9]*" placeholder="${lastRec ? lastRec.kg : 'KG'}" value="${set.kg}" onchange="updateSetVal('${ex.id}', ${idx}, 'kg', this.value)" class="w-full theme-card border rounded-lg p-1.5 text-center text-xs text-white focus:outline-none focus:border-violet-500/60 font-num font-bold transition">
            <input type="text" placeholder="Bar: ${set.plates || 'kaç+kaç'}" value="${set.plates || ''}" onchange="updateSetVal('${ex.id}', ${idx}, 'plates', this.value)" class="w-full bg-transparent text-[9px] text-center text-zinc-500 focus:outline-none font-num mt-0.5">
          </div>
          
          <div class="flex flex-col">
            <input type="text" inputmode="numeric" pattern="[0-9]*" placeholder="${lastRec ? lastRec.reps : 'Rep'}" value="${set.reps}" onchange="updateSetVal('${ex.id}', ${idx}, 'reps', this.value)" class="w-full theme-card border rounded-lg p-1.5 text-center text-xs text-white focus:outline-none focus:border-violet-500/60 font-num font-bold transition">
            <span class="text-[9px] text-center text-transparent font-num mt-0.5">-</span>
          </div>
          
          <div class="flex flex-col items-center justify-center">
            <div class="relative w-full flex items-center justify-center">
              <select onchange="updateSetVal('${ex.id}', ${idx}, 'type', this.value)" class="type-custom-select w-full theme-card border rounded-lg p-1.5 text-center text-[10px] font-black ${typeColorClass} focus:outline-none font-num cursor-pointer">
                <option value="Norm" ${set.type === 'Norm' ? 'selected' : ''}>OK (Normal)</option>
                <option value="F" ${set.type === 'F' ? 'selected' : ''}>F (Fail)</option>
                <option value="W" ${set.type === 'W' ? 'selected' : ''}>W (Warmup)</option>
                <option value="D" ${set.type === 'D' ? 'selected' : ''}>D (Drop Set)</option>
                <option value="R1" ${set.type === 'R1' ? 'selected' : ''}>R1 (RIR 1)</option>
                <option value="R2" ${set.type === 'R2' ? 'selected' : ''}>R2 (RIR 2)</option>
              </select>
            </div>
            <span class="text-[9px] text-center text-transparent font-num mt-0.5">-</span>
          </div>
          
          <div class="flex flex-col items-center">
            <button onclick="toggleSet('${ex.id}', ${idx})" class="tap-press w-9 h-9 rounded-xl font-extrabold flex items-center justify-center text-xs transition ${isDone ? 'btn-premium text-white' : 'glass text-zinc-500'}">✓</button>
            <span class="text-[9px] text-center text-transparent font-num mt-0.5">-</span>
          </div>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="cursor-pointer flex-1 py-1" onclick="${isReorderingRoutine ? '' : `openWorkoutExerciseDetail('${ex.id}')`}">
          <h3 class="gradient-text font-extrabold text-sm leading-tight tracking-tight flex items-center gap-1.5">
            ${ex.name} <span class="text-zinc-600 text-[10px]">›</span>
          </h3>
          <div class="flex items-center gap-2 mt-0.5">
            <p class="text-[10px] text-zinc-500 font-medium">${ex.muscle}</p>
            ${totalSets > 0 ? `<span class="text-[9px] font-bold font-num ${exPct === 100 ? 'text-emerald-400' : 'text-violet-400'}">${doneSets}/${totalSets}</span>` : ''}
          </div>
        </div>

        ${isReorderingRoutine ? `
          <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
            <button onclick="animateAndMoveRoutine(${exIndex}, -1)" class="w-8 h-8 glass text-zinc-200 rounded-xl text-xs font-bold active:scale-75 transition flex items-center justify-center">▲</button>
            <button onclick="animateAndMoveRoutine(${exIndex}, 1)" class="w-8 h-8 glass text-zinc-200 rounded-xl text-xs font-bold active:scale-75 transition flex items-center justify-center">▼</button>
            <button onclick="removeExerciseFromRoutine('${ex.id}')" class="w-8 h-8 bg-rose-600/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold active:scale-75 ml-1 flex items-center justify-center">🗑️</button>
          </div>
        ` : ''}
      </div>

      ${sets.length > 0 ? `
        <div class="space-y-1 mb-2.5">
          <div class="grid grid-cols-[22px_1fr_1fr_48px_36px] gap-2 text-zinc-500 font-num text-[9px] px-1 text-center font-bold">
            <span>S</span><span>KG</span><span>REP</span><span>TÜR</span><span>TİK</span>
          </div>
          ${setsHtml}
        </div>
      ` : ''}

      <div class="flex justify-between items-center pt-1.5">
        <button onclick="addSet('${ex.id}')" class="tap-press text-[11px] font-bold text-violet-400 py-1.5 px-3 rounded-xl gradient-accent-subtle border border-violet-500/20 transition hover:border-violet-500/40">+ Set Ekle</button>
        ${sets.length > 0 ? `
          <button onclick="removeSet('${ex.id}')" class="tap-press text-[10px] text-zinc-500 hover:text-rose-400 py-1 px-2 font-medium transition">- Set Sil</button>
        ` : '<span></span>'}
      </div>
    `;
    container.appendChild(card);
  });
}


// ===== ROUTINE REORDER ANIMATION =====
function animateAndMoveRoutine(index, direction) {
  const routine = routines.find(r => r.id === currentRoutineId);
  if (!routine) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= routine.exerciseIds.length) return;

  const currentExId = routine.exerciseIds[index];
  const targetExId = routine.exerciseIds[targetIndex];

  const currentCard = document.getElementById(`routine_card_${currentExId}`);
  const targetCard = document.getElementById(`routine_card_${targetExId}`);

  if (currentCard && targetCard) {
    const firstCurrentRect = currentCard.getBoundingClientRect();
    const firstTargetRect = targetCard.getBoundingClientRect();

    const temp = routine.exerciseIds[index];
    routine.exerciseIds[index] = routine.exerciseIds[targetIndex];
    routine.exerciseIds[targetIndex] = temp;
    saveRoutines();

    renderWorkout(false);

    const newCurrentCard = document.getElementById(`routine_card_${currentExId}`);
    const newTargetCard = document.getElementById(`routine_card_${targetExId}`);

    if (newCurrentCard && newTargetCard) {
      const lastCurrentRect = newCurrentCard.getBoundingClientRect();
      const lastTargetRect = newTargetCard.getBoundingClientRect();

      const invertCurrentY = firstCurrentRect.top - lastCurrentRect.top;
      const invertTargetY = firstTargetRect.top - lastTargetRect.top;

      newCurrentCard.style.transform = `translateY(${invertCurrentY}px) scale(1.02)`;
      newCurrentCard.style.transition = 'none';
      newCurrentCard.classList.add('swap-highlight');

      newTargetCard.style.transform = `translateY(${invertTargetY}px)`;
      newTargetCard.style.transition = 'none';

      newCurrentCard.offsetHeight;

      newCurrentCard.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.32s ease, border-color 0.32s ease';
      newTargetCard.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)';

      newCurrentCard.style.transform = 'translateY(0) scale(1)';
      newTargetCard.style.transform = 'translateY(0)';

      setTimeout(() => {
        newCurrentCard.classList.remove('swap-highlight');
        newCurrentCard.style.transform = '';
        newTargetCard.style.transform = '';
        newCurrentCard.style.transition = '';
        newTargetCard.style.transition = '';
      }, 340);
    }
  }
}


// ===== SET OPERATIONS =====
function updateSetVal(exId, idx, field, val) {
  if (routineSets[currentRoutineId] && routineSets[currentRoutineId][exId] && routineSets[currentRoutineId][exId][idx]) {
    routineSets[currentRoutineId][exId][idx][field] = val;
    saveRoutineSets();
    if (field === 'type') renderWorkout(false);
  }
}

function addSet(exId) {
  if (!routineSets[currentRoutineId][exId]) {
    routineSets[currentRoutineId][exId] = [];
  }
  const sets = routineSets[currentRoutineId][exId];
  const prev = sets[sets.length - 1];
  const hist = getHistory(exId);
  const lastRec = hist[hist.length - 1];

  sets.push({
    kg: prev ? prev.kg : (lastRec ? lastRec.kg : ""),
    plates: prev ? prev.plates : "",
    reps: prev ? prev.reps : (lastRec ? lastRec.reps : ""),
    type: prev ? prev.type : (lastRec ? lastRec.type : "Norm"),
    done: false
  });

  saveRoutineSets();
  renderWorkout(false);
}

function removeSet(exId) {
  if (routineSets[currentRoutineId] && routineSets[currentRoutineId][exId] && routineSets[currentRoutineId][exId].length > 0) {
    routineSets[currentRoutineId][exId].pop();
    saveRoutineSets();
    renderWorkout(false);
  }
}

function toggleSet(exId, idx) {
  const set = routineSets[currentRoutineId][exId][idx];
  if (!set.kg) { alert("Lütfen ağırlık yazın!"); return; }
  set.done = !set.done;
  saveRoutineSets();

  if (set.done) {
    const hist = getHistory(exId);
    const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    hist.push({ date, kg: set.kg, reps: set.reps || "8", type: set.type, setNumber: idx + 1, timestamp: Date.now() });
    saveHistory(exId, hist);

    startForwardRestTimer();
  }
  renderWorkout(false);
}

function removeExerciseFromRoutine(exId) {
  const current = routines.find(r => r.id === currentRoutineId);
  if (!current) return;
  current.exerciseIds = current.exerciseIds.filter(id => id !== exId);
  saveRoutines();
  renderWorkout(false);
}


// ===== REST TIMER =====
function startForwardRestTimer() {
  restSecondsElapsed = 0;
  const bar = document.getElementById("restTimerBar");
  bar.classList.remove("hidden");
  updateRestTimerDisplay();

  if (restTimerInterval) clearInterval(restTimerInterval);
  restTimerInterval = setInterval(() => {
    restSecondsElapsed++;
    updateRestTimerDisplay();
  }, 1000);
}

function updateRestTimerDisplay() {
  const m = Math.floor(restSecondsElapsed / 60);
  const s = restSecondsElapsed % 60;
  document.getElementById("restTimerDisplay").innerText =
    `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function resetRestTimer() {
  restSecondsElapsed = 0;
  updateRestTimerDisplay();
}

function closeRestTimer() {
  if (restTimerInterval) clearInterval(restTimerInterval);
  document.getElementById("restTimerBar").classList.add("hidden");
}


// ===== FINISH WORKOUT =====
function finishWorkout() {
  const routine = routines.find(r => r.id === currentRoutineId);
  if (!routine) return;

  let totalSets = 0;
  let totalVolume = 0;
  const prList = [];

  routine.exerciseIds.forEach(exId => {
    const sets = (routineSets[currentRoutineId] && routineSets[currentRoutineId][exId]) || [];
    const ex = globalExercisePool.find(e => e.id === exId);
    let maxSessionKg = 0;

    sets.forEach(s => {
      if (s.done) {
        totalSets++;
        const kgVal = parseFloat(s.kg) || 0;
        const repVal = parseFloat(s.reps) || 0;
        totalVolume += (kgVal * repVal);
        if (kgVal > maxSessionKg) maxSessionKg = kgVal;
      }
    });

    const hist = getHistory(exId);
    const prevHist = hist.slice(0, -sets.filter(s => s.done).length);
    const prevMax = getMaxKg(prevHist) || 0;
    if (maxSessionKg > prevMax && prevMax > 0 && ex) {
      prList.push(`${ex.name}: ${maxSessionKg} KG (Önceki: ${prevMax} KG)`);
    }
  });

  document.getElementById("sumTotalSets").innerText = totalSets;
  document.getElementById("sumTotalVolume").innerText = `${Math.round(totalVolume)} KG`;

  const prBox = document.getElementById("sumPRBox");
  const prListEl = document.getElementById("sumPRList");
  if (prList.length > 0) {
    prListEl.innerHTML = prList.map(p => `<div>• ${p}</div>`).join("");
    prBox.classList.remove("hidden");
  } else {
    prBox.classList.add("hidden");
  }

  document.getElementById("summaryModal").classList.remove("hidden");
  lockScroll();
}

function closeSummaryModal() {
  document.getElementById("summaryModal").classList.add("hidden");
  unlockScroll();
  closeRestTimer();
  goHome();
}


// ===== LIBRARY PAGE =====
function openLibraryPage() {
  pushHistoryState("library");
  document.getElementById("viewHome").classList.add("hidden");
  document.getElementById("viewWorkout").classList.add("hidden");
  document.getElementById("viewLibraryDetail").classList.add("hidden");
  document.getElementById("viewWorkoutExerciseDetail").classList.add("hidden");
  document.getElementById("floatingExerciseBubble").classList.add("hidden");

  const vLib = document.getElementById("viewLibrary");
  vLib.classList.remove("hidden");
  vLib.classList.remove("anim-back");
  vLib.classList.add("anim-forward");
  renderLibrary();
}

function closeLibraryPage() {
  document.getElementById("viewLibrary").classList.add("hidden");
  isReorderingLibrary = false;
  goHome();
}

function getMaxKg(hist) {
  if (!hist || hist.length === 0) return null;
  let max = 0;
  hist.forEach(h => {
    const nums = h.kg.match(/\d+(\.\d+)?/g);
    if (nums) {
      const val = nums.reduce((a, b) => parseFloat(a) + parseFloat(b), 0);
      if (val > max) max = val;
    }
  });
  return max > 0 ? max : null;
}

function renderLibrary() {
  const container = document.getElementById("libraryListContainer");
  container.innerHTML = "";
  document.getElementById("libraryCountLabel").innerText = `${globalExercisePool.length} Hareket`;

  globalExercisePool.forEach((ex, idx) => {
    const hist = getHistory(ex.id);
    const maxKg = getMaxKg(hist);

    const card = document.createElement("div");
    card.id = `lib_card_${ex.id}`;
    card.className = `tap-press routine-card glass p-3.5 rounded-[18px] flex items-center justify-between cursor-pointer anim-card glow-ring transition-all duration-300 ${isReorderingLibrary ? 'wiggle' : ''}`;
    card.style.animationDelay = `${idx * 20}ms`;
    if (isReorderingLibrary) card.style.borderColor = 'rgba(124,58,237,0.4)';

    attachLongPress(card, () => {
      if (!isReorderingLibrary) toggleReorderMode('library');
    });

    card.onclick = () => {
      if (!isReorderingLibrary) openLibraryDetail(ex.id);
    };

    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl gradient-accent-subtle flex items-center justify-center text-violet-400 font-black text-xs">
          ${ex.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 class="text-sm font-extrabold text-white tracking-tight">${ex.name}</h4>
          <p class="text-[10px] text-zinc-500 font-medium mt-0.5">${ex.muscle}</p>
        </div>
      </div>
      
      ${isReorderingLibrary ? `
        <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
          <button onclick="animateAndMoveLibrary(${idx}, -1)" class="w-8 h-8 glass text-zinc-200 rounded-xl text-xs font-bold active:scale-75 transition flex items-center justify-center">▲</button>
          <button onclick="animateAndMoveLibrary(${idx}, 1)" class="w-8 h-8 glass text-zinc-200 rounded-xl text-xs font-bold active:scale-75 transition flex items-center justify-center">▼</button>
          <button onclick="deleteGlobalExercise('${ex.id}')" class="w-8 h-8 bg-rose-600/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold active:scale-75 ml-1 flex items-center justify-center">🗑️</button>
        </div>
      ` : `
        <div class="text-right font-num">
          <span class="text-[9px] text-zinc-500 font-bold block uppercase tracking-[0.12em]">MAX KG</span>
          <span class="text-xs font-black ${maxKg ? 'gradient-text' : 'text-zinc-600'}">${maxKg ? maxKg + ' KG' : 'Kayıt Yok'}</span>
        </div>
      `}
    `;
    container.appendChild(card);
  });
}


// ===== LIBRARY REORDER ANIMATION =====
function animateAndMoveLibrary(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= globalExercisePool.length) return;

  const currentExId = globalExercisePool[index].id;
  const targetExId = globalExercisePool[targetIndex].id;

  const currentCard = document.getElementById(`lib_card_${currentExId}`);
  const targetCard = document.getElementById(`lib_card_${targetExId}`);

  if (currentCard && targetCard) {
    const firstCurrentRect = currentCard.getBoundingClientRect();
    const firstTargetRect = targetCard.getBoundingClientRect();

    const temp = globalExercisePool[index];
    globalExercisePool[index] = globalExercisePool[targetIndex];
    globalExercisePool[targetIndex] = temp;
    savePool();

    renderLibrary();

    const newCurrentCard = document.getElementById(`lib_card_${currentExId}`);
    const newTargetCard = document.getElementById(`lib_card_${targetExId}`);

    if (newCurrentCard && newTargetCard) {
      const lastCurrentRect = newCurrentCard.getBoundingClientRect();
      const lastTargetRect = newTargetCard.getBoundingClientRect();

      const invertCurrentY = firstCurrentRect.top - lastCurrentRect.top;
      const invertTargetY = firstTargetRect.top - lastTargetRect.top;

      newCurrentCard.style.transform = `translateY(${invertCurrentY}px) scale(1.02)`;
      newCurrentCard.style.transition = 'none';
      newCurrentCard.classList.add('swap-highlight');

      newTargetCard.style.transform = `translateY(${invertTargetY}px)`;
      newTargetCard.style.transition = 'none';

      newCurrentCard.offsetHeight;

      newCurrentCard.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.32s ease, border-color 0.32s ease';
      newTargetCard.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)';

      newCurrentCard.style.transform = 'translateY(0) scale(1)';
      newTargetCard.style.transform = 'translateY(0)';

      setTimeout(() => {
        newCurrentCard.classList.remove('swap-highlight');
        newCurrentCard.style.transform = '';
        newTargetCard.style.transform = '';
        newCurrentCard.style.transition = '';
        newTargetCard.style.transition = '';
      }, 340);
    }
  }
}

function deleteGlobalExercise(exId) {
  if (confirm("Bu hareketi havuzdan tamamen silmek istiyor musun?")) {
    globalExercisePool = globalExercisePool.filter(e => e.id !== exId);
    savePool();
    renderLibrary();
  }
}


// ===== LIBRARY DETAIL =====
function openLibraryDetail(exId) {
  const ex = globalExercisePool.find(e => e.id === exId);
  if (!ex) return;

  pushHistoryState("libraryDetail");
  document.getElementById("libDetailExTitle").innerText = ex.name;
  document.getElementById("libDetailExMuscle").innerText = ex.muscle;

  const hist = getHistory(exId);
  const histContainer = document.getElementById("libDetailHistoryList");
  histContainer.innerHTML = "";

  const maxKg = getMaxKg(hist);
  document.getElementById("libDetailMaxKg").innerText = maxKg ? `${maxKg} KG` : "Kayıt Yok";
  document.getElementById("libDetailFirstDate").innerText = (hist.length > 0) ? hist[0].date : "Kayıt Yok";

  renderGroupedHistory(hist, histContainer, "lib_day_");

  const ctx = document.getElementById('libDetailChart').getContext('2d');
  if (chartInstanceLib) chartInstanceLib.destroy();
  chartInstanceLib = createProgressionChart(ctx, hist);

  document.getElementById("viewLibrary").classList.add("hidden");
  const vDetail = document.getElementById("viewLibraryDetail");
  vDetail.classList.remove("hidden");
  vDetail.classList.remove("anim-back");
  vDetail.classList.add("anim-forward");
}

function closeLibraryDetail() {
  document.getElementById("viewLibraryDetail").classList.add("hidden");
  openLibraryPage();
}


// ===== WORKOUT EXERCISE DETAIL =====
let currentActiveVideoData = null;

function openWorkoutExerciseDetail(exId) {
  selectedDetailExId = exId;
  const ex = globalExercisePool.find(e => e.id === exId);
  if (!ex) return;

  pushHistoryState("workoutDetail");
  document.getElementById("workoutExDetailTitle").innerText = ex.name;
  document.getElementById("workoutExDetailMuscle").innerText = ex.muscle;

  const note = localStorage.getItem(`fit_note_${exId}`) || "";
  document.getElementById("workoutExNoteInput").value = note;

  currentActiveVideoData = ex;
  const iframe = document.getElementById("workoutVideoIframe");
  if (ex.videoId) {
    let embedUrl = `https://www.youtube-nocookie.com/embed/${ex.videoId}?rel=0&modestbranding=1&playsinline=1`;
    if (ex.start > 0) embedUrl += `&start=${ex.start}`;
    if (ex.end > 0) embedUrl += `&end=${ex.end}`;
    iframe.src = embedUrl;
    document.getElementById("btnOpenNativeYouTube").classList.remove("hidden");
  } else {
    iframe.src = "";
    document.getElementById("btnOpenNativeYouTube").classList.add("hidden");
  }

  const hist = getHistory(exId);
  const ctx = document.getElementById('workoutProgressionChart').getContext('2d');
  if (chartInstanceWorkout) chartInstanceWorkout.destroy();
  chartInstanceWorkout = createProgressionChart(ctx, hist);

  const histContainer = document.getElementById("workoutExHistoryList");
  histContainer.innerHTML = "";
  renderGroupedHistory(hist, histContainer, "workout_day_");

  document.getElementById("viewWorkout").classList.add("hidden");
  const vWDetail = document.getElementById("viewWorkoutExerciseDetail");
  vWDetail.classList.remove("hidden");
  vWDetail.classList.remove("anim-back");
  vWDetail.classList.add("anim-forward");
}

function openVideoInYouTubeApp() {
  if (!currentActiveVideoData || !currentActiveVideoData.videoId) return;
  const vId = currentActiveVideoData.videoId;
  const startSec = currentActiveVideoData.start || 0;

  const appUrl = `vnd.youtube://${vId}?t=${startSec}`;
  const webUrl = `https://www.youtube.com/watch?v=${vId}&t=${startSec}s`;

  window.location.href = appUrl;
  setTimeout(() => {
    window.open(webUrl, "_blank");
  }, 500);
}

function closeWorkoutExerciseDetail() {
  const iframe = document.getElementById("workoutVideoIframe");
  iframe.src = "";
  currentActiveVideoData = null;

  document.getElementById("viewWorkoutExerciseDetail").classList.add("hidden");
  const vWorkout = document.getElementById("viewWorkout");
  vWorkout.classList.remove("hidden");
  vWorkout.classList.remove("anim-forward");
  vWorkout.classList.add("anim-back");
  renderWorkout(false);
}

function saveWorkoutExerciseNote() {
  if (!selectedDetailExId) return;
  const note = document.getElementById("workoutExNoteInput").value;
  localStorage.setItem(`fit_note_${selectedDetailExId}`, note);
  alert("Not kaydedildi!");
}


// ===== GROUPED HISTORY RENDER =====
function renderGroupedHistory(hist, container, prefix) {
  if (!hist || hist.length === 0) {
    container.innerHTML = `<p class="text-zinc-500 text-xs py-4 text-center font-medium glass rounded-2xl">Henüz tamamlanan set kaydı yok.</p>`;
    return;
  }

  const grouped = {};
  hist.forEach(item => {
    if (!grouped[item.date]) grouped[item.date] = [];
    grouped[item.date].push(item);
  });

  const days = Object.keys(grouped).reverse();

  days.forEach((day, dIdx) => {
    const daySets = grouped[day];
    const lastSet = daySets[daySets.length - 1];

    const groupCard = document.createElement("div");
    groupCard.className = "glass rounded-[18px] overflow-hidden transition glow-ring";

    let subSetsRows = "";
    daySets.forEach((s, sIdx) => {
      subSetsRows += `
        <div class="flex justify-between items-center py-1.5 border-b border-white/[0.03] last:border-b-0 text-[11px] font-num">
          <span class="text-zinc-500 font-bold">${s.setNumber || sIdx + 1}. Set</span>
          <span class="font-extrabold text-white">${s.kg} KG</span>
          <span class="text-zinc-400 font-medium">${s.reps} Rep</span>
          <span class="${s.type === 'F' ? 'text-rose-400' : 'text-zinc-400'} font-bold">[${s.type}]</span>
        </div>
      `;
    });

    groupCard.innerHTML = `
      <div class="p-3.5 flex justify-between items-center cursor-pointer tap-press" onclick="toggleDayDetails('${prefix}${dIdx}')">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-white font-num">${day}</span>
            <span class="text-[10px] text-zinc-500 glass px-1.5 py-0.5 rounded font-num">${daySets.length} Set</span>
          </div>
          <p class="text-[11px] text-zinc-400 font-num mt-1">Son Set: <span class="gradient-text font-bold">${lastSet.kg} KG</span> × ${lastSet.reps} Rep <span class="text-rose-400">[${lastSet.type}]</span></p>
        </div>
        <span class="text-zinc-500 text-xs font-mono transition-transform duration-200" id="arrow_${prefix}${dIdx}">▼</span>
      </div>

      <div id="${prefix}${dIdx}" class="hidden px-3.5 pb-3 pt-1 border-t border-white/[0.04] theme-subcard">
        <span class="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.12em] block mb-1">O Günün Tüm Setleri</span>
        ${subSetsRows}
      </div>
    `;
    container.appendChild(groupCard);
  });
}


// ===== CHART =====
function createProgressionChart(ctx, hist) {
  const labels = hist.map(h => h.date);
  const dataPoints = hist.map(h => {
    const nums = h.kg.match(/\d+(\.\d+)?/g);
    return nums ? nums.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) : 0;
  });

  const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
  gradient.addColorStop(0, '#7c3aed');
  gradient.addColorStop(0.5, '#6366f1');
  gradient.addColorStop(1, '#3b82f6');

  const bgGradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  bgGradient.addColorStop(0, 'rgba(124, 58, 237, 0.15)');
  bgGradient.addColorStop(1, 'rgba(124, 58, 237, 0)');

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.slice(-8),
      datasets: [{
        data: dataPoints.slice(-8),
        borderColor: gradient,
        backgroundColor: bgGradient,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#7c3aed',
        pointBorderColor: '#a78bfa',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#52525b', font: { family: 'JetBrains Mono', size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#52525b', font: { family: 'JetBrains Mono', size: 9 } } }
      }
    }
  });
}

function toggleDayDetails(elId) {
  const detailsEl = document.getElementById(elId);
  const arrowEl = document.getElementById(`arrow_${elId}`);
  if (detailsEl.classList.contains("hidden")) {
    detailsEl.classList.remove("hidden");
    arrowEl.style.transform = "rotate(180deg)";
  } else {
    detailsEl.classList.add("hidden");
    arrowEl.style.transform = "rotate(0deg)";
  }
}


// ===== EXERCISE PICKER =====
function renderPickerList() {
  const list = document.getElementById("pickerList");
  list.innerHTML = "";

  const sortedPool = [...globalExercisePool].sort((a, b) => {
    const aSelected = tempSelectedExerciseIds.includes(a.id);
    const bSelected = tempSelectedExerciseIds.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  sortedPool.forEach(ex => {
    const isSelected = tempSelectedExerciseIds.includes(ex.id);
    const item = document.createElement("div");
    item.className = `tap-press flex items-center justify-between p-3.5 rounded-[18px] border cursor-pointer transition-all duration-200 ${isSelected ? 'gradient-accent-subtle border-violet-500/40 glow-ring' : 'glass'}`;
    item.onclick = () => toggleTempSelection(ex.id);
    item.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg ${isSelected ? 'gradient-accent' : 'gradient-accent-subtle'} flex items-center justify-center text-white font-black text-[10px]">
          ${ex.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p class="font-extrabold text-white text-xs tracking-tight">${ex.name}</p>
          <p class="text-[10px] text-zinc-500 font-medium mt-0.5">${ex.muscle}</p>
        </div>
      </div>
      <div class="w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs transition ${isSelected ? 'btn-premium text-white' : 'glass text-zinc-500'}">
        ${isSelected ? '✓' : '+'}
      </div>
    `;
    list.appendChild(item);
  });

  document.getElementById("btnConfirmSelect").innerText = `${tempSelectedExerciseIds.length} Hareketi Programa Kaydet`;
}

function toggleTempSelection(exId) {
  if (tempSelectedExerciseIds.includes(exId)) {
    tempSelectedExerciseIds = tempSelectedExerciseIds.filter(id => id !== exId);
  } else {
    tempSelectedExerciseIds.push(exId);
  }
  renderPickerList();
}

function saveSelectedExercises() {
  const current = routines.find(r => r.id === currentRoutineId);
  if (!current) return;

  current.exerciseIds = [...tempSelectedExerciseIds];
  saveRoutines();
  animateCloseSheet();
  renderWorkout(true);
}


// ===== NEW EXERCISE MODAL =====
function openNewExerciseModal(fromLibrary = false) {
  isCreatingFromLibrary = fromLibrary;
  document.getElementById("newExNameInput").value = "";
  document.getElementById("newExMuscleInput").value = "";
  document.getElementById("newExerciseModal").classList.remove("hidden");
}

function closeNewExerciseModal() {
  document.getElementById("newExerciseModal").classList.add("hidden");
}

function submitNewExercise() {
  const name = document.getElementById("newExNameInput").value.trim();
  const muscle = document.getElementById("newExMuscleInput").value.trim() || "Genel";
  if (!name) return;

  const newEx = { id: "ex_" + Date.now(), name: name, muscle: muscle, videoId: "", start: 0, end: 0 };
  globalExercisePool.push(newEx);
  savePool();

  closeNewExerciseModal();

  if (isCreatingFromLibrary) {
    renderLibrary();
  } else {
    tempSelectedExerciseIds.push(newEx.id);
    renderPickerList();
  }
}


// ===== BACKUP & RESTORE =====
function exportData() {
  const fullBackup = {
    pool: globalExercisePool,
    routines: routines,
    sets: routineSets,
    history: {}
  };

  globalExercisePool.forEach(ex => {
    fullBackup.history[ex.id] = getHistory(ex.id);
  });

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `antrenman_yedek_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.pool && data.routines) {
        localStorage.setItem("fit_pool", JSON.stringify(data.pool));
        localStorage.setItem("fit_routines", JSON.stringify(data.routines));
        if (data.sets) localStorage.setItem("fit_routine_sets", JSON.stringify(data.sets));
        if (data.history) {
          Object.keys(data.history).forEach(exId => {
            saveHistory(exId, data.history[exId]);
          });
        }
        alert("Yedek başarıyla yüklendi! Sayfa yenileniyor...");
        window.location.reload();
      } else {
        alert("Geçersiz yedek dosyası!");
      }
    } catch (err) {
      alert("Dosya okunurken hata oluştu!");
    }
  };
  reader.readAsText(file);
}


// ===== INIT =====
initTheme();
goHome();
