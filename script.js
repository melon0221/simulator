// ================== Global State ==================
let QUESTIONS = [];
let BANK = null;
let ANSWERS = {};
let FLAGS = {};
let CURRENT_BLOCK_INDEX = 0;
let CURRENT_INDEX_IN_BLOCK = 0;
let BLOCK_SECONDS = 60 * 60 + 15 * 60;
let TOTAL_SECONDS = 5 * 60 * 60 + 15 * 60;
let blockTimeLeft = BLOCK_SECONDS;
let totalTimeLeft = TOTAL_SECONDS;
let timerInterval = null;
let QUESTION_RESULTS = [];
let EXAM_SUMMARY = [];

// ================== DOM Elements ==================
const qTextEl = document.getElementById("question-text");
const qImgEl = document.getElementById("question-image");
const qImgWrapper = document.getElementById("question-image-wrapper");
const ansEl = document.getElementById("answer-options");
const prevBtn = document.getElementById("prev-button");
const nextBtn = document.getElementById("next-button");
const flagBtn = document.getElementById("flag-button");
const endBlockBtn = document.getElementById("end-block-button");
const reviewBtn = document.getElementById("review-button");
const pauseBtn = document.getElementById("pause-button");
const resumeBtn = document.getElementById("resume-button");
const finishExamBtn = document.getElementById("finish-exam-button");

const statusPill = document.getElementById("status-pill");
const flagPill = document.getElementById("flag-pill");
const examSectionLabel = document.getElementById("exam-section");
const timeRemainingLabel = document.getElementById("time-remaining");
const totalRemainingLabel = document.getElementById("total-remaining");

// Review Modals
const reviewModal = document.getElementById("review-modal");
const reviewGrid = document.getElementById("review-grid");
const closeReviewBtn = document.getElementById("close-review");
const clearFlagsBtn = document.getElementById("clear-flags");
const toggleFlaggedBtn = document.getElementById("toggle-flagged");

const sectionReviewModal = document.getElementById("section-review-modal");
const sectionReviewGrid = document.getElementById("section-review-grid");
const sectionReviewBackBtn = document.getElementById("section-review-back");
const sectionReviewEndBtn = document.getElementById("section-review-end");

// Exam Review Modals
const examReviewModal = document.getElementById("exam-review-modal");
const examReviewContent = document.getElementById("exam-review-content");
const examReviewCloseBtn = document.getElementById("exam-review-close");
const examReviewFinishBtn = document.getElementById("exam-review-finish");

// Image Zoom Modal
const imgModal = document.getElementById("image-modal");
const imgModalContent = document.getElementById("image-modal-content");

// ================== Utility ==================
function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h} hr ${m} min ${s.toString().padStart(2, "0")} sec`;
}

function saveState() {
  const state = {
    ANSWERS,
    FLAGS,
    CURRENT_BLOCK_INDEX,
    CURRENT_INDEX_IN_BLOCK,
    blockTimeLeft,
    totalTimeLeft,
  };
  localStorage.setItem(`nbme_state_${BANK}`, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(`nbme_state_${BANK}`);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    ANSWERS = saved.ANSWERS || {};
    FLAGS = saved.FLAGS || {};
    CURRENT_BLOCK_INDEX = saved.CURRENT_BLOCK_INDEX ?? 0;
    CURRENT_INDEX_IN_BLOCK = saved.CURRENT_INDEX_IN_BLOCK ?? 0;
    blockTimeLeft = saved.blockTimeLeft ?? BLOCK_SECONDS;
    totalTimeLeft = saved.totalTimeLeft ?? TOTAL_SECONDS;
  } catch {}
}

// ================== Timer ==================
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    blockTimeLeft--;
    totalTimeLeft--;
    if (blockTimeLeft <= 0) endSection();
    if (totalTimeLeft <= 0) finishExam();
    updateTimers();
    saveState();
  }, 1000);
}

function updateTimers() {
  timeRemainingLabel.textContent = formatTime(blockTimeLeft);
  totalRemainingLabel.textContent = `Total Exam Time Remaining: ${formatTime(totalTimeLeft)}`;
}

// ================== Question Rendering ==================
function renderQuestion() {
  const block = QUESTIONS[CURRENT_BLOCK_INDEX];
  const q = block[CURRENT_INDEX_IN_BLOCK];
  examSectionLabel.textContent = `Exam Section ${CURRENT_BLOCK_INDEX + 1}: Item ${CURRENT_INDEX_IN_BLOCK + 1} of ${block.length}`;
  qTextEl.textContent = q.question;

  if (q.image) {
    qImgEl.src = q.image;
    qImgEl.classList.remove("hidden");
    qImgWrapper.classList.remove("hidden");
  } else {
    qImgEl.src = "";
    qImgEl.classList.add("hidden");
    qImgWrapper.classList.add("hidden");
  }

  ansEl.innerHTML = "";
  q.options.forEach((opt, idx) => {
    const li = document.createElement("li");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = idx;
    if (ANSWERS[CURRENT_BLOCK_INDEX]?.[CURRENT_INDEX_IN_BLOCK] === idx) {
      input.checked = true;
    }
    input.onchange = () => {
      if (!ANSWERS[CURRENT_BLOCK_INDEX]) ANSWERS[CURRENT_BLOCK_INDEX] = {};
      ANSWERS[CURRENT_BLOCK_INDEX][CURRENT_INDEX_IN_BLOCK] = idx;
      updatePills();
      saveState();
    };
    li.appendChild(input);
    li.appendChild(document.createTextNode(opt));
    ansEl.appendChild(li);
  });

  updatePills();
  prevBtn.disabled = CURRENT_INDEX_IN_BLOCK === 0;
  nextBtn.disabled =
    CURRENT_INDEX_IN_BLOCK === block.length - 1 &&
    CURRENT_BLOCK_INDEX === QUESTIONS.length - 1;
}

function updatePills() {
  const ans = ANSWERS[CURRENT_BLOCK_INDEX]?.[CURRENT_INDEX_IN_BLOCK] ?? null;
  statusPill.textContent = ans === null ? "Unanswered" : "Answered";
  flagPill.classList.toggle("hidden", !FLAGS[CURRENT_BLOCK_INDEX]?.[CURRENT_INDEX_IN_BLOCK]);
}

// ================== Navigation ==================
prevBtn.onclick = () => {
  if (CURRENT_INDEX_IN_BLOCK > 0) CURRENT_INDEX_IN_BLOCK--;
  else if (CURRENT_BLOCK_INDEX > 0) {
    CURRENT_BLOCK_INDEX--;
    CURRENT_INDEX_IN_BLOCK = QUESTIONS[CURRENT_BLOCK_INDEX].length - 1;
  }
  renderQuestion();
  saveState();
};
nextBtn.onclick = () => {
  const block = QUESTIONS[CURRENT_BLOCK_INDEX];
  if (CURRENT_INDEX_IN_BLOCK < block.length - 1) CURRENT_INDEX_IN_BLOCK++;
  else if (CURRENT_BLOCK_INDEX < QUESTIONS.length - 1) {
    CURRENT_BLOCK_INDEX++;
    CURRENT_INDEX_IN_BLOCK = 0;
  }
  renderQuestion();
  saveState();
};

// ================== Flags ==================
flagBtn.onclick = () => {
  if (!FLAGS[CURRENT_BLOCK_INDEX]) FLAGS[CURRENT_BLOCK_INDEX] = {};
  FLAGS[CURRENT_BLOCK_INDEX][CURRENT_INDEX_IN_BLOCK] =
    !FLAGS[CURRENT_BLOCK_INDEX][CURRENT_INDEX_IN_BLOCK];
  updatePills();
  saveState();
};

// ================== Review ==================
reviewBtn.onclick = () => {
  populateReviewGrid();
  reviewModal.style.display = "flex";
};
closeReviewBtn.onclick = () => (reviewModal.style.display = "none");
clearFlagsBtn.onclick = () => {
  FLAGS[CURRENT_BLOCK_INDEX] = {};
  populateReviewGrid();
  renderQuestion();
  saveState();
};
toggleFlaggedBtn.onclick = () => {
  reviewGrid.querySelectorAll(".review-chip").forEach((chip) => {
    if (!chip.classList.contains("flagged")) chip.classList.toggle("hidden");
  });
};

function populateReviewGrid() {
  reviewGrid.innerHTML = "";
  const block = QUESTIONS[CURRENT_BLOCK_INDEX];
  block.forEach((q, idx) => {
    const chip = document.createElement("div");
    chip.textContent = `Q${idx + 1}`;
    chip.classList.add("review-chip");
    if (!(ANSWERS[CURRENT_BLOCK_INDEX]?.[idx] >= 0)) chip.classList.add("unanswered");
    if (FLAGS[CURRENT_BLOCK_INDEX]?.[idx]) chip.classList.add("flagged");
    chip.onclick = () => {
      CURRENT_INDEX_IN_BLOCK = idx;
      renderQuestion();
      reviewModal.style.display = "none";
    };
    reviewGrid.appendChild(chip);
  });
}

// ================== Section Review ==================
endBlockBtn.onclick = () => {
  populateSectionReview();
  sectionReviewModal.style.display = "flex";
};
sectionReviewBackBtn.onclick = () => (sectionReviewModal.style.display = "none");
sectionReviewEndBtn.onclick = () => {
  finalizeBlock();
  sectionReviewModal.style.display = "none";
  if (CURRENT_BLOCK_INDEX < QUESTIONS.length - 1) {
    CURRENT_BLOCK_INDEX++;
    CURRENT_INDEX_IN_BLOCK = 0;
    blockTimeLeft = BLOCK_SECONDS;
    renderQuestion();
    startTimer();
  } else finishExam();
};
function populateSectionReview() {
  sectionReviewGrid.innerHTML = "";
  const block = QUESTIONS[CURRENT_BLOCK_INDEX];
  block.forEach((q, idx) => {
    const chip = document.createElement("div");
    chip.textContent = `Q${idx + 1}`;
    chip.classList.add("review-chip");
    if (!(ANSWERS[CURRENT_BLOCK_INDEX]?.[idx] >= 0)) chip.classList.add("unanswered");
    if (FLAGS[CURRENT_BLOCK_INDEX]?.[idx]) chip.classList.add("flagged");
    sectionReviewGrid.appendChild(chip);
  });
}

// ================== Exam Review ==================
function populateExamReview() {
  examReviewContent.innerHTML = "";
  QUESTIONS.forEach((block, blockIdx) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.style.marginBottom = "20px";

    const title = document.createElement("h4");
    title.textContent = `Section ${blockIdx + 1}`;
    sectionDiv.appendChild(title);

    const grid = document.createElement("div");
    grid.classList.add("review-grid");

    block.forEach((q, idx) => {
      const chip = document.createElement("div");
      chip.textContent = `Q${idx + 1}`;
      chip.classList.add("review-chip");

      if (!(ANSWERS[blockIdx]?.[idx] >= 0)) chip.classList.add("unanswered");
      if (FLAGS[blockIdx]?.[idx]) chip.classList.add("flagged");

      grid.appendChild(chip);
    });

    sectionDiv.appendChild(grid);
    examReviewContent.appendChild(sectionDiv);
  });
}

examReviewCloseBtn.onclick = () => {
  examReviewModal.style.display = "none";
};
examReviewFinishBtn.onclick = () => {
  examReviewModal.style.display = "none";
  exportResults();
};

// ================== Finalization ==================
function finalizeBlock() {
  // could save summary per section if needed
}
function finishExam() {
  clearInterval(timerInterval);
  populateExamReview();
  examReviewModal.style.display = "flex";

  [endBlockBtn, nextBtn, prevBtn, reviewBtn, pauseBtn].forEach(
    (btn) => (btn.disabled = true)
  );
  finishExamBtn.classList.remove("hidden");
}

function exportResults() {
  const wb = XLSX.utils.book_new();
  const qws = XLSX.utils.json_to_sheet(QUESTION_RESULTS);
  const sws = XLSX.utils.json_to_sheet(EXAM_SUMMARY);
  XLSX.utils.book_append_sheet(wb, qws, "Question Results");
  XLSX.utils.book_append_sheet(wb, sws, "Exam Summary");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  XLSX.writeFile(wb, `NBME_${BANK}_Results_${stamp}.xlsx`);
}

// ================== Pause/Resume ==================
pauseBtn.onclick = () => {
  clearInterval(timerInterval);
  pauseBtn.classList.add("hidden");
  resumeBtn.classList.remove("hidden");
};
resumeBtn.onclick = () => {
  startTimer();
  resumeBtn.classList.add("hidden");
  pauseBtn.classList.remove("hidden");
};

// ================== Load Bank ==================
async function loadQuestions(bank) {
  BANK = bank;
  const res = await fetch(`questionBanks/${bank}.json`);
  const data = await res.json();

  // 每组 50 题，分成 4 个 section
  QUESTIONS = [];
  const perBlock = 50;
  for (let i = 0; i < data.length; i += perBlock) {
    QUESTIONS.push(data.slice(i, i + perBlock));
  }

  loadState();
  renderQuestion();
  updateTimers();
  startTimer();
}
const params = new URLSearchParams(window.location.search);
const bank = params.get("bank");
if (!bank) {
  alert("No question bank selected. Returning to start.");
  window.location.href = "index.html";
} else loadQuestions(bank);

// ================== Image Zoom ==================
qImgEl.onclick = () => {
  if (!qImgEl.classList.contains("hidden") && qImgEl.src) {
    imgModalContent.src = qImgEl.src;
    imgModal.classList.remove("hidden");
  }
};
imgModal.onclick = (e) => {
  if (e.target === imgModal) {
    imgModal.classList.add("hidden");
    imgModalContent.src = "";
  }
};
