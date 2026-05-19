// Dennis's Romantic Study & Life Planner - App Logic

// ==========================================================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================================================

const defaultState = {
  completedTopics: {}, // unitId_topicIndex: boolean
  reflections: [],     // array of { date: string, text: string }
  studyStreak: 1,      // initial streak
  sessionsCompleted: 0,
  minutesTicked: 0,
  lastActiveDate: ""   // for calculating streak
};

let state = { ...defaultState };

function loadState() {
  const saved = localStorage.getItem("dennis_planner_state");
  if (saved) {
    try {
      state = { ...defaultState, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Error parsing saved state", e);
    }
  } else {
    state.lastActiveDate = new Date().toDateString();
    saveState();
  }
}

function saveState() {
  localStorage.setItem("dennis_planner_state", JSON.stringify(state));
}

// Calculate days together since a landmark date (Dennis & Lorraine's starting point: say Aug 12, 2018)
function updateDaysTogether() {
  const startDate = new Date("2026-05-05");
  const today = new Date();
  const diffTime = Math.abs(today - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const element = document.getElementById("days-together-counter");
  if (element) {
    element.textContent = `${diffDays} Beautiful Days Together`;
  }

  const headerVal = document.getElementById("days-together-val-header");
  if (headerVal) {
    headerVal.textContent = `${diffDays} Days`;
  }
}

// Check study streak
function checkStreak() {
  const todayStr = new Date().toDateString();
  if (state.lastActiveDate !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (state.lastActiveDate === yesterdayStr) {
      // Streak continues!
      state.studyStreak += 1;
    } else {
      // Streak reset (but keep it at 1 minimum for encouragement!)
      state.studyStreak = 1;
    }
    state.lastActiveDate = todayStr;
    saveState();
  }

  const streakEl = document.getElementById("streak-count");
  if (streakEl) streakEl.textContent = state.studyStreak;
}

// ==========================================================================
// NAVIGATION & TABS
// ==========================================================================

function switchTab(tabId) {
  // Update nav active classes
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Toggle tab panels
  const panels = document.querySelectorAll(".tab-panel");
  panels.forEach(panel => {
    if (panel.id === tabId) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  // Trigger floating hearts on specific tabs
  if (tabId === "vault") {
    createHeartWave(8);
  }
}

// ==========================================================================
// ACTIVE DIGITAL CLOCK & GREETING CARD
// ==========================================================================

function startClockAndGreeting() {
  function tick() {
    const now = new Date();

    // Header digital clock
    const clockEl = document.getElementById("local-time-clock");
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    }

    // Dynamic greeting based on Dennis's day
    const hour = now.getHours();
    let greetTitle = "Hey, my love";
    let subGreet = "Thinking about you always.";
    let greetingCategory = "afternoon";

    if (hour >= 3 && hour < 9.5) {
      // Dennis is sleeping
      greetTitle = "Sweet Dreams, Dennis 😴";
      subGreet = "Rest well. Lorraine is watching over you in spirit.";
      greetingCategory = "night";
    } else if (hour >= 9.5 && hour < 10) {
      // Morning prep
      greetTitle = "Good Morning, Handsome! ☕";
      subGreet = "Let's wake up gently and prepare for our study.";
      greetingCategory = "morning";
    } else if (hour >= 10 && hour < 12) {
      // Study peak
      greetTitle = "Golden Focus Hour! 🧠";
      subGreet = "Your brain is at peak energy. Let's conquer GBC & Measurements!";
      greetingCategory = "morning";
    } else if (hour >= 12 && hour < 15) {
      // Rest/love & Prep
      greetTitle = "Time to Recharge, Dennis 💖";
      subGreet = "Take a break, stretch, and know that you are deeply loved.";
      greetingCategory = "afternoon";
    } else {
      // Work Night Shift 3pm - 3am
      greetTitle = "Night Shift Hustle! 💼";
      subGreet = "You are working so hard for your dreams. Stay strong, champion.";
      greetingCategory = "evening";
    }

    const titleEl = document.getElementById("time-greeting");
    const subEl = document.getElementById("sub-greeting");
    if (titleEl) titleEl.textContent = greetTitle;
    if (subEl) subEl.textContent = subGreet;

    // Daily custom messages updates (if not modified recently)
    const heroMsgEl = document.getElementById("hero-message");
    if (heroMsgEl && !heroMsgEl.dataset.initialized) {
      heroMsgEl.textContent = PLANNER_DATA.hourlyMessages[greetingCategory];
      heroMsgEl.dataset.initialized = "true";
    }
  }

  tick();
  setInterval(tick, 1000 * 60); // tick every minute
}

// Countdown Clock for July Exams
function startCountdown() {
  const examTime = new Date(PLANNER_DATA.examDate).getTime();

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = examTime - now;

    if (distance < 0) {
      document.getElementById("countdown-display").innerHTML = "🚀 EXAM TIME! YOU GOT THIS!";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    document.getElementById("cd-days").textContent = String(days).padStart(2, "0");
    document.getElementById("cd-hours").textContent = String(hours).padStart(2, "0");
    document.getElementById("cd-mins").textContent = String(minutes).padStart(2, "0");
  }

  updateCountdown();
  setInterval(updateCountdown, 1000 * 60); // update every minute
}

// ==========================================================================
// DYNAMIC SVG DIAL GENERATOR (24-HOUR BALANCE DIAL)
// ==========================================================================

function drawScheduleDial() {
  const svg = document.getElementById("schedule-svg-dial");
  if (!svg) return;

  // Clear existing dial wedges (except guidelines)
  const existingWedges = svg.querySelectorAll(".dial-sector");
  existingWedges.forEach(w => w.remove());

  // Center point
  const cx = 100;
  const cy = 100;
  const r = 85;

  // Dennis's schedule runs 24 hours. Let's represent 24 hours.
  // 3:30 AM is our starting sleep hour (Start at top of clock? Or midnight at top? Let's keep Midnight at top).
  // Midnight = 0 degrees (top). 3:30 AM = (3.5 / 24) * 360 = 52.5 degrees.
  // Let's parse time like "03:30 AM" into minutes from midnight (0 to 1440)
  function timeToMinutes(timeStr) {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Draw wedge path helper
  function getWedgePath(startMin, endMin) {
    // 1440 mins = 360 deg. 1 min = 0.25 deg.
    // SVG angles start at 3 o'clock. To start at 12 o'clock, subtract 90 degrees.
    const startDeg = (startMin * 0.25) - 90;
    let endDeg = (endMin * 0.25) - 90;

    // If it spans past midnight
    if (endMin < startMin) {
      endDeg += 360;
    }

    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArcFlag = (endDeg - startDeg) > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  PLANNER_DATA.schedule.forEach((item, idx) => {
    const [startStr, endStr] = item.time.split(" - ");
    const startMin = timeToMinutes(startStr);
    const endMin = timeToMinutes(endStr);

    const pathData = getWedgePath(startMin, endMin);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", item.color);
    path.setAttribute("class", "dial-sector");
    path.setAttribute("data-index", idx);

    // Click event to show detailed information
    path.addEventListener("click", () => {
      document.querySelectorAll(".dial-sector").forEach(w => w.classList.remove("active"));
      path.classList.add("active");

      // Update dial center details
      document.getElementById("dial-center-title").textContent = item.title;
      document.getElementById("dial-center-title").setAttribute("fill", item.color);

      // Update detail card
      document.getElementById("detail-icon").textContent = item.icon;
      document.getElementById("detail-title").textContent = item.title;
      document.getElementById("detail-time").textContent = `${item.time} (${item.duration})`;
      document.getElementById("detail-romantic-note").textContent = item.note;

      const tagEl = document.getElementById("detail-tag");
      tagEl.textContent = item.id.toUpperCase().replace("-", " ");

      const detailsCard = document.getElementById("schedule-details-box");
      detailsCard.style.borderColor = item.color;

      // Highlight timeline row
      document.querySelectorAll(".timeline-node").forEach(node => {
        if (node.getAttribute("data-id") === item.id) {
          node.classList.add("active");
          node.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
          node.classList.remove("active");
        }
      });

      createHeartWave(3);
    });

    svg.appendChild(path);
  });

  // Select first item as default active wedge
  setTimeout(() => {
    const firstWedge = svg.querySelector(".dial-sector");
    if (firstWedge) firstWedge.dispatchEvent(new Event("click"));
  }, 100);
}

// Build standard timeline checklist below dial
function buildTimelineList() {
  const container = document.getElementById("timeline-flow-list");
  if (!container) return;

  container.innerHTML = "";

  PLANNER_DATA.schedule.forEach(item => {
    const node = document.createElement("div");
    node.className = "timeline-node";
    node.setAttribute("data-id", item.id);

    node.innerHTML = `
      <div class="timeline-node-bullet" style="border-color: ${item.color}"></div>
      <div class="timeline-node-content">
        <div class="timeline-node-info">
          <h4><span>${item.icon}</span> ${item.title}</h4>
          <p>${item.note.substring(0, 45)}...</p>
        </div>
        <div class="timeline-node-badge">${item.time}</div>
      </div>
    `;

    node.addEventListener("click", () => {
      // Simulate dial wedge click
      const sectors = document.querySelectorAll(".dial-sector");
      sectors.forEach(sec => {
        const idx = parseInt(sec.getAttribute("data-index"));
        if (PLANNER_DATA.schedule[idx].id === item.id) {
          sec.dispatchEvent(new Event("click"));
        }
      });
    });

    container.appendChild(node);
  });
}

// ==========================================================================
// STUDY UNITS SYLLABUS PROGRESS TRACKER
// ==========================================================================

function updateOverallProgress() {
  let totalTopics = 0;
  let completedCount = 0;

  PLANNER_DATA.units.forEach(unit => {
    totalTopics += unit.topics.length;
    unit.topics.forEach((_, idx) => {
      if (state.completedTopics[`${unit.id}_${idx}`]) {
        completedCount++;
      }
    });
  });

  const percentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  // Update circular chart on Dashboard
  const chartCircle = document.getElementById("overall-chart-circle");
  if (chartCircle) {
    chartCircle.setAttribute("stroke-dasharray", `${percentage}, 100`);
  }

  const textEl = document.getElementById("overall-percentage-text");
  if (textEl) textEl.textContent = `${percentage}%`;

  const summaryEl = document.getElementById("overall-topics-summary");
  if (summaryEl) {
    summaryEl.textContent = `${completedCount} out of ${totalTopics} subtopics completed.`;
  }

  // Update Golden morning study bar indicator on Dashboard
  const barEl = document.getElementById("study-progress-fill");
  if (barEl) {
    barEl.style.width = `${Math.max(8, percentage)}%`; // give it a baseline
  }
}

function renderStudyUnits() {
  const container = document.getElementById("units-container");
  if (!container) return;

  container.innerHTML = "";

  PLANNER_DATA.units.forEach(unit => {
    const card = document.createElement("div");
    card.className = "card unit-card";
    card.style.borderColor = `rgba(${hexToRgb(unit.color)}, 0.2)`;

    // Calculate individual unit progress
    let unitTotal = unit.topics.length;
    let unitCompleted = 0;
    unit.topics.forEach((_, idx) => {
      if (state.completedTopics[`${unit.id}_${idx}`]) {
        unitCompleted++;
      }
    });
    const unitPercent = Math.round((unitCompleted / unitTotal) * 100);

    let listHTML = "";
    unit.topics.forEach((topic, idx) => {
      const isChecked = state.completedTopics[`${unit.id}_${idx}`] ? "checked" : "";
      listHTML += `
        <label class="checklist-item">
          <input type="checkbox" data-unit="${unit.id}" data-index="${idx}" ${isChecked}>
          <span>${topic}</span>
        </label>
      `;
    });

    card.innerHTML = `
      <div class="unit-card-header">
        <div class="unit-card-title">
          <div class="unit-icon" style="box-shadow: 0 0 10px rgba(${hexToRgb(unit.color)}, 0.2)">${unit.icon}</div>
          <div>
            <h3>${unit.title}</h3>
          </div>
        </div>
        <div class="unit-percent-badge" style="color: ${unit.color}; border-color: rgba(${hexToRgb(unit.color)}, 0.3)">${unitPercent}% Complete</div>
      </div>
      
      <div class="unit-advice-drawer">
        📚 <strong>Lorraine's Advice:</strong> "${unit.lorraineAdvice}"
      </div>
      
      <div class="subtopics-checklist">
        ${listHTML}
      </div>
    `;

    // Hook checkbox clicks
    const checkboxes = card.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.addEventListener("change", (e) => {
        const uId = e.target.getAttribute("data-unit");
        const idx = e.target.getAttribute("data-index");

        if (e.target.checked) {
          state.completedTopics[`${uId}_${idx}`] = true;
          createHeartWave(4);
        } else {
          delete state.completedTopics[`${uId}_${idx}`];
        }

        saveState();
        updateOverallProgress();

        // Update specific card percentage badge instantly
        let updatedCompleted = 0;
        checkboxes.forEach(box => { if (box.checked) updatedCompleted++; });
        const newPercent = Math.round((updatedCompleted / checkboxes.length) * 100);
        card.querySelector(".unit-percent-badge").textContent = `${newPercent}% Complete`;
      });
    });

    container.appendChild(card);
  });
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ?
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '255, 255, 255';
}

// ==========================================================================
// POMODORO FOCUS TIMER WITH WEB AUDIO SYNTHESIZER
// ==========================================================================

let timerInterval = null;
let timerSecondsRemaining = 1500; // default 25m study
let currentTimerMode = "study"; // study, sprint, break
let timerIsRunning = false;

// Audio context holder for synthesis
let audioCtx = null;
let synthNode = null;
let noiseNode = null;

function setupTimerControls() {
  const digitsEl = document.getElementById("timer-digits");
  const startBtn = document.getElementById("btn-timer-start");
  const pauseBtn = document.getElementById("btn-timer-pause");
  const resetBtn = document.getElementById("btn-timer-reset");
  const modeBtns = document.querySelectorAll(".timer-mode-btn");

  function updateDigits() {
    const mins = Math.floor(timerSecondsRemaining / 60);
    const secs = timerSecondsRemaining % 60;
    digitsEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // Mode selectors
  modeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (timerIsRunning) return; // ignore when active

      modeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      timerSecondsRemaining = parseInt(btn.getAttribute("data-time"));
      currentTimerMode = btn.getAttribute("data-mode");
      updateDigits();

      // Sweet break intervention note
      if (currentTimerMode === "break") {
        document.getElementById("timer-whisper").textContent = "Time to rest! Stand up, stretch, and send Lorraine a heart message. I'm waiting! ❤️";
      } else {
        document.getElementById("timer-whisper").textContent = PLANNER_DATA.romanticQuotes[Math.floor(Math.random() * PLANNER_DATA.romanticQuotes.length)];
      }
    });
  });

  // Start focus
  startBtn.addEventListener("click", () => {
    if (timerIsRunning) return;

    timerIsRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;

    // Rotate vinyl player
    const disc = document.getElementById("vinyl-disc");
    disc.style.animationPlayState = "running";

    // Play/continue synthesized sound
    startSynthesizer();

    timerInterval = setInterval(() => {
      if (timerSecondsRemaining > 0) {
        timerSecondsRemaining--;
        updateDigits();

        // Log statistical study minute ticks
        if (timerSecondsRemaining % 60 === 0 && currentTimerMode !== "break") {
          state.minutesTicked++;
          saveState();
          updateTimerStats();
        }
      } else {
        // Timer completed!
        clearInterval(timerInterval);
        timerIsRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        disc.style.animationPlayState = "paused";
        stopSynthesizer();

        // Increment stats
        if (currentTimerMode !== "break") {
          state.sessionsCompleted++;
          saveState();
          updateTimerStats();
          createHeartWave(25);
          alertLoveTokenPopup("🎉 Session Accomplished!", "You did absolutely amazing! Lorraine is so incredibly proud of you. Take a well-deserved break now.");
        } else {
          createHeartWave(10);
          alertLoveTokenPopup("🌸 Break Finished!", "Ready to focus again, my study prince? Let's do another session!");
        }
      }
    }, 1000);
  });

  // Pause
  pauseBtn.addEventListener("click", () => {
    if (!timerIsRunning) return;

    clearInterval(timerInterval);
    timerIsRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;

    // Pause vinyl
    const disc = document.getElementById("vinyl-disc");
    disc.style.animationPlayState = "paused";

    stopSynthesizer();
  });

  // Reset
  resetBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    timerIsRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;

    // Pause vinyl
    const disc = document.getElementById("vinyl-disc");
    disc.style.animationPlayState = "paused";

    stopSynthesizer();

    // Reset standard time based on active button mode
    const activeBtn = document.querySelector(".timer-mode-btn.active");
    timerSecondsRemaining = parseInt(activeBtn.getAttribute("data-time"));
    updateDigits();
  });

  // Study whispers toggle
  document.getElementById("next-whisper-btn").addEventListener("click", () => {
    document.getElementById("timer-whisper").textContent = PLANNER_DATA.romanticQuotes[Math.floor(Math.random() * PLANNER_DATA.romanticQuotes.length)];
    createHeartWave(2);
  });

  updateDigits();
}

function updateTimerStats() {
  const sessionEl = document.getElementById("stat-sessions");
  const minsEl = document.getElementById("stat-minutes");
  if (sessionEl) sessionEl.textContent = state.sessionsCompleted;
  if (minsEl) minsEl.textContent = state.minutesTicked;
}

// Sound synthesizer via Web Audio API (soothing synthesized drones)
function startSynthesizer() {
  const activeBtn = document.querySelector(".sound-btn.active");
  const soundType = activeBtn ? activeBtn.getAttribute("data-synth") : "none";

  if (soundType === "none") return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Resume context if suspended (needed in Chrome/Firefox browser security)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const statusEl = document.getElementById("synth-status");
  statusEl.textContent = "Synthesizing real-time soothing soundwaves...";

  if (soundType === "lofi") {
    // Generate soft low-frequency chord synthesis (ambient lofi drone)
    // Plays deep cozy sine chords
    synthNode = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    synthNode.type = "triangle";
    synthNode.frequency.setValueAtTime(110, audioCtx.currentTime); // A2 pitch

    // Add detune chord oscillators programmatically
    const osc2 = audioCtx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(138.61, audioCtx.currentTime); // C#3 major third

    const osc3 = audioCtx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(165, audioCtx.currentTime); // E3 perfect fifth

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(350, audioCtx.currentTime); // lowpass cozy tone

    gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime); // quiet ambient volume

    synthNode.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    synthNode.start();
    osc2.start();
    osc3.start();

    // Cache nodes so we can stop them cleanly later
    synthNode.oscRefs = [synthNode, osc2, osc3];
  } else if (soundType === "rain") {
    // Generate Rain synthesis using noise buffers
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // white noise
    }

    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 500;
    filter.Q.value = 0.6; // crackling rain patter filter

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.05;

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseNode.start();
  } else if (soundType === "waves") {
    // Generate ocean waves using slow amplitude-modulating pink noise
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    // Amplitude modulator (slow LFO oscillation)
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 250;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);

    // Dynamic wave crash modulation
    gainNode.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 3);
    gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 6);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseNode.start();

    // Slow amplitude loop interval
    noiseNode.waveInterval = setInterval(() => {
      if (!audioCtx || audioCtx.state === "closed") return;
      try {
        gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 3);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 6);
      } catch (e) { }
    }, 6000);
  }
}

function stopSynthesizer() {
  const statusEl = document.getElementById("synth-status");
  statusEl.textContent = "Synthesizer offline.";

  // Stop custom oscillators
  if (synthNode) {
    if (synthNode.oscRefs) {
      synthNode.oscRefs.forEach(osc => { try { osc.stop(); } catch (e) { } });
    } else {
      try { synthNode.stop(); } catch (e) { }
    }
    synthNode = null;
  }

  // Stop noise sources
  if (noiseNode) {
    if (noiseNode.waveInterval) clearInterval(noiseNode.waveInterval);
    try { noiseNode.stop(); } catch (e) { }
    noiseNode = null;
  }
}

// Hook Sound synthesizer buttons
function hookSoundBtns() {
  const soundBtns = document.querySelectorAll(".sound-btn");
  soundBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      soundBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Reset synthesizer cleanly if currently active
      if (timerIsRunning) {
        stopSynthesizer();
        startSynthesizer();
      }
    });
  });
}

// ==========================================================================
// FLOATING HEARTS & INTERACTIVE CHEERS
// ==========================================================================

function createFloatingHeart(xOffset = null) {
  const container = document.getElementById("hearts-container");
  if (!container) return;

  const heart = document.createElement("div");
  heart.className = "floating-heart";

  const hearts = ["❤️", "💖", "💋", "💕", "🌸", "🧸", "✨"];
  heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];

  // Custom horizontal spread
  const left = xOffset !== null ? xOffset : Math.random() * 100;
  heart.style.left = `${left}%`;

  // Custom scaling and duration variance
  const scale = 0.5 + Math.random() * 0.8;
  const duration = 2.5 + Math.random() * 2;

  heart.style.transform = `scale(${scale})`;
  heart.style.animationDuration = `${duration}s`;

  container.appendChild(heart);

  // Clean up element after animation finishes
  setTimeout(() => {
    heart.remove();
  }, duration * 1000);
}

function createHeartWave(count = 5) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      createFloatingHeart();
    }, i * 200);
  }
}

// ==========================================================================
// PORTALS: DIALOGS & ENVELOPE LOVE LETTERS
// ==========================================================================

function alertLoveTokenPopup(title, message, icon = "💌") {
  const overlay = document.getElementById("token-dialog-overlay");
  document.getElementById("token-dialog-icon").textContent = icon;
  document.getElementById("token-dialog-title").textContent = title;
  document.getElementById("token-dialog-message").textContent = message;

  overlay.classList.add("open");
  createHeartWave(12);
}

function setupLoveTokens() {
  document.getElementById("token-kiss").addEventListener("click", () => {
    alertLoveTokenPopup(
      "💋 Virtual Kiss Dispatched!",
      "A soft, warm kiss has flown straight from Lorraine's lips into your inbox! Feel the warmth and let it feed your concentration. You are my handsome man!",
      "💋"
    );
  });

  document.getElementById("token-motivation").addEventListener("click", () => {
    alertLoveTokenPopup(
      "🤗 Cozy Emergency Hug!",
      "Whenever the syllabus looks scary or you are missing me, wrap yourself in this virtual hug. I believe in your capabilities more than anyone else in this world. You are going to demolish these diploma exams!",
      "💖"
    );
  });

  document.getElementById("token-shift").addEventListener("click", () => {
    alertLoveTokenPopup(
      "🦉 Midnight Shift Fuel!",
      "Working 3 PM to 3 AM takes elite strength! Here is a cup of cozy motivation. Stay sharp, stay safe, and remember I'll be waiting to kiss you when I see you! I'm so proud of your dedication.",
      "☕"
    );
  });

  // Close dialogs
  document.getElementById("token-dialog-close").addEventListener("click", () => {
    document.getElementById("token-dialog-overlay").classList.remove("open");
  });
  document.getElementById("token-dialog-btn").addEventListener("click", () => {
    document.getElementById("token-dialog-overlay").classList.remove("open");
  });
}

// Envelopes Mood Letters Database
const moodLetters = {
  stressed: {
    title: "When You're Stressed 😰",
    body: `My dearest Dennis,

    If you are opening this, it means you're feeling the weight of everything right now. Please take a deep breath. Release your shoulders.
    
    Balancing a grueling 12-hour night shift and preparing for a higher diploma is something that very few people could even attempt, let alone carry out. You are not weak for feeling stressed; you are human, and what you are doing is incredibly brave.
    
    Don't look at all four units at once. Let's just focus on one little drawing, or one GBC page. Step by step. You are incredibly smart, and your brain was built to solve complex problems. 
    
    I am holding your hand right now. You are not alone in this journey. I love you, and I believe in you.`
  },
  tired: {
    title: "When You're Tired at 2 AM 🌙",
    body: `Hey, my handsome night owl. 🦉

    It's in the deep hours of the night. Your eyes are heavy, your muscles are tired, and the shift feels long. 
    
    Here is my heart, glowing next to you, giving you warmth and energy. I am probably asleep right now dreaming about us, but a big part of me is sitting right there next to your desk, cheering you on.
    
    Drink a sip of fresh water. Close your eyes for 30 seconds and feel me wrapping my arms around you. You are working so hard to build our tomorrow, and I see every bit of your effort.
    
    Stay safe, stay awake. In a few hours, the sun will rise, you'll slide into bed, and I'll be there to celebrate you.`
  },
  givingup: {
    title: "When You Feel Like Giving Up 🥺",
    body: `Dennis, my hero,

    Stop. Sit back. Close the textbook. 
    
    If your mind is whispering that it's too hard, or that you can't pass, I want you to listen to my voice instead.
    
    You have fought through so many challenges in your life. You have built yourself into the dedicated, capable man you are today. You are a natural-born achiever. Drawing, GBC, Measurements, Estimation... these are just words on paper. You are a builder of realities!
    
    If you fail a mock topic today, it doesn't matter. What matters is that you get up. You have July marked, and you are going to show up like a giant.
    
    I love you in your high moments, but I love you even more when you feel weak. Let me carry some of that weight. Rest today. We will fight again tomorrow.`
  },
  missingme: {
    title: "When You Miss Me 👩‍❤️‍👨",
    body: `My lovely Dennis,

    If you are missing me, please look at the moon or out the window. We are sharing the same sky, breathing the same air, and sharing the exact same future.
    
    Distance is just a number. The love I have for you has been growing since our childhood, and it gets stronger with every single sunrise. 
    
    I miss you too—so much. But every page you study, and every hour of your shift, is a golden thread weaving our lives closer.
    
    Close your eyes, put your hand over your heart, and listen to the pulse. That's me, whisper-singing to you. I am always yours.`
  }
};

function setupMoodLetters() {
  const envelopes = document.querySelectorAll(".mood-envelope");
  const overlay = document.getElementById("letter-dialog-overlay");
  const titleEl = document.getElementById("letter-dialog-title");
  const bodyEl = document.getElementById("letter-dialog-body");

  envelopes.forEach(env => {
    env.addEventListener("click", () => {
      const mood = env.getAttribute("data-mood");
      const letter = moodLetters[mood];

      titleEl.textContent = letter.title;
      bodyEl.innerHTML = letter.body.replace(/\n/g, "<br>");

      overlay.classList.add("open");
      createHeartWave(15);
    });
  });

  // Close letter
  document.getElementById("letter-dialog-close").addEventListener("click", () => {
    overlay.classList.remove("open");
  });
}

// ==========================================================================
// REFLECTION JOURNAL LOGS
// ==========================================================================

function renderReflections() {
  const container = document.getElementById("reflections-list-container");
  if (!container) return;

  if (state.reflections.length === 0) {
    container.innerHTML = `<p class="no-logs">No reflections written yet. Start your journey!</p>`;
    return;
  }

  container.innerHTML = "";
  state.reflections.forEach(ref => {
    const item = document.createElement("div");
    item.className = "reflection-item";

    item.innerHTML = `
      <div class="reflection-meta">
        <span>Locked by Dennis</span>
        <span>${ref.date}</span>
      </div>
      <div class="reflection-body-text">${ref.text}</div>
    `;

    container.appendChild(item);
  });
}

function setupJournalForm() {
  const form = document.getElementById("journal-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const input = document.getElementById("journal-input");
    const text = input.value.trim();

    if (!text) return;

    const newReflection = {
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      text: text
    };

    state.reflections.unshift(newReflection); // add to top
    saveState();

    input.value = ""; // clear input
    renderReflections();

    createHeartWave(8);
    alertLoveTokenPopup("🔒 Log Locked in Vault!", "Your reflection has been safely logged. Lorraine will read this and smile! You are doing amazing.", "🔒");
  });
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Load local state
  loadState();

  // Setup tab buttons click bindings
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.getAttribute("data-tab"));
    });
  });

  // Start digital clocks & countdown
  startClockAndGreeting();
  startCountdown();
  updateDaysTogether();
  checkStreak();

  // Draw day schedule balance SVG dial
  drawScheduleDial();
  buildTimelineList();

  // Load study units syllabus checklists
  updateOverallProgress();
  renderStudyUnits();

  // Focus Pomodoro Timer controls
  setupTimerControls();
  updateTimerStats();
  hookSoundBtns();

  // Support tokens and envelopes
  setupLoveTokens();
  setupMoodLetters();

  // Reflection journal logs
  setupJournalForm();
  renderReflections();

  // Sweet entry greeting wave
  setTimeout(() => {
    createHeartWave(12);
  }, 1000);
});
