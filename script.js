let BANK = null;
let QUESTIONS = [];
let CURRENT_SECTION = 0;
let CURRENT_INDEX = 0;
let ANSWERS = {};
let FLAGS = {};
let timerInterval = null;
let sectionTime = 75 * 60;
let totalTime = 315 * 60;

// 自动保存相关变量
let autoSaveInterval = null;
let examAutoSave = null;

// DOM
const questionText = document.getElementById("question-text");
const questionImage = document.getElementById("question-image");
const answerOptions = document.getElementById("answer-options");
const examSection = document.getElementById("exam-section");
const statusPill = document.getElementById("status-pill");
const flagPill = document.getElementById("flag-pill");
const timeRemaining = document.getElementById("time-remaining");
const totalRemaining = document.getElementById("total-remaining");

// Modals
const reviewModal = document.getElementById("review-modal");
const sectionReviewModal = document.getElementById("section-review-modal");
const examReviewModal = document.getElementById("exam-review-modal");
const submitConfirmModal = document.getElementById("submit-confirm-modal");
const sectionEndConfirmModal = document.getElementById("section-end-confirm-modal");

// Buttons
const reviewBtn = document.getElementById("review-button");
const reviewCloseBtn = document.getElementById("close-review");
const endBlockBtn = document.getElementById("end-block-button");
const sectionReviewBackBtn = document.getElementById("section-review-back");
const examReviewCloseBtn = document.getElementById("exam-review-close");

// ========== 移动端检测和初始化 ==========
function isMobileDevice() {
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function initMobileOptimizations() {
  if (isMobileDevice()) {
    // 禁用双击缩放
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
      let now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
    
    // 优化触摸滚动
    const questionWrapper = document.querySelector('.question-wrapper');
    if (questionWrapper) {
      questionWrapper.style.webkitOverflowScrolling = 'touch';
    }
  }
}

// 优化选项点击体验
function optimizeAnswerOptions() {
  document.querySelectorAll('.answers li').forEach(li => {
    li.addEventListener('click', function(e) {
      if (e.target.tagName !== 'INPUT') {
        let input = this.querySelector('input[type="radio"]');
        if (input) {
          input.checked = true;
          input.onchange();
          
          // 添加视觉反馈
          if (isMobileDevice()) {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
              this.style.transform = '';
            }, 150);
          }
        }
      }
    });
  });
}

// 优化模态框在移动端的显示
function showModal(modal) {
  modal.classList.add('show');
  
  if (isMobileDevice()) {
    // 防止背景滚动
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }
}

function hideModal(modal) {
  modal.classList.remove('show');
  
  if (isMobileDevice()) {
    // 恢复背景滚动
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
}

// ========== 自动保存功能 ==========
function showAutoSaveIndicator(success = true) {
  // 创建或获取自动保存指示器
  let indicator = document.getElementById('auto-save-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'auto-save-indicator';
    indicator.className = 'auto-save-indicator';
    document.body.appendChild(indicator);
  }
  
  // 更新状态和文本
  indicator.className = 'auto-save-indicator show';
  if (success) {
    indicator.textContent = '已自动保存';
    indicator.classList.remove('error');
  } else {
    indicator.textContent = '保存失败';
    indicator.classList.add('error');
  }
  
  // 3秒后隐藏
  setTimeout(() => {
    indicator.classList.remove('show');
  }, 3000);
}

function autoSave() {
  try {
    const examData = {
      bank: BANK,
      section: CURRENT_SECTION,
      index: CURRENT_INDEX,
      answers: ANSWERS,
      flags: FLAGS,
      sectionTime: sectionTime,
      totalTime: totalTime,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    // 使用内存存储
    examAutoSave = examData;
    showAutoSaveIndicator(true);
    
    console.log('考试数据已自动保存', new Date().toLocaleTimeString());
    
  } catch (error) {
    console.error('自动保存失败:', error);
    showAutoSaveIndicator(false);
  }
}

function loadAutoSave() {
  if (examAutoSave && examAutoSave.bank === BANK) {
    const timeSinceLastSave = Date.now() - examAutoSave.timestamp;
    
    // 如果保存时间不超过2小时，则恢复数据
    if (timeSinceLastSave < 2 * 60 * 60 * 1000) {
      const shouldRestore = confirm(
        `发现之前的考试记录（${Math.floor(timeSinceLastSave / 60000)}分钟前保存）\n是否恢复继续考试？`
      );
      
      if (shouldRestore) {
        CURRENT_SECTION = examAutoSave.section;
        CURRENT_INDEX = examAutoSave.index;
        ANSWERS = examAutoSave.answers;
        FLAGS = examAutoSave.flags;
        sectionTime = examAutoSave.sectionTime;
        totalTime = examAutoSave.totalTime;
        
        console.log('已恢复之前的考试进度');
        showAutoSaveIndicator(true);
        
        return true;
      }
    }
  }
  return false;
}

function startAutoSave() {
  // 每30秒自动保存一次
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }
  
  autoSaveInterval = setInterval(autoSave, 30000);
  console.log('自动保存功能已启动');
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
  console.log('自动保存功能已停止');
}

// ========== Load exam ==========
async function loadExam() {
  const urlParams = new URLSearchParams(window.location.search);
  BANK = urlParams.get("bank") || "25";
  
  try {
    let res = await fetch(`questionBanks/${BANK}.json`);
    let data = await res.json();

    for (let i = 0; i < 4; i++) {
      QUESTIONS.push(data.slice(i * 50, (i + 1) * 50));
    }
    ANSWERS = QUESTIONS.map(() => ({}));
    FLAGS = QUESTIONS.map(() => ({}));

    // 尝试恢复之前的进度
    const restored = loadAutoSave();
    
    renderQuestion();
    startTimer();
    startAutoSave(); // 启动自动保存
    
    if (!restored) {
      // 首次加载时也保存一次
      setTimeout(autoSave, 5000);
    }
    
  } catch (error) {
    console.error('加载考试失败:', error);
    alert('加载考试失败，请检查网络连接或联系管理员');
  }
}

// ========== Timer ==========
function startTimer() {
  timerInterval = setInterval(() => {
    sectionTime--;
    totalTime--;
    updateTimerDisplay();
    if (sectionTime <= 0) endSection();
    if (totalTime <= 0) finishExam();
  }, 1000);
}

function updateTimerDisplay() {
  timeRemaining.textContent = formatTime(sectionTime);
  totalRemaining.textContent = "Total Exam Time Remaining: " + formatTime(totalTime);
}

function formatTime(sec) {
  let h = Math.floor(sec / 3600);
  let m = Math.floor((sec % 3600) / 60);
  let s = sec % 60;
  return `${h} hr ${m} min ${s.toString().padStart(2, "0")} sec`;
}

// ========== Render Question ==========
function renderQuestion() {
  let q = QUESTIONS[CURRENT_SECTION][CURRENT_INDEX];
  examSection.textContent = `Exam Section ${CURRENT_SECTION+1}: Item ${CURRENT_INDEX+1} of 50`;
  questionText.textContent = q.question;

  // 同步控制右侧图片容器
  const imageWrapper = document.querySelector(".question-image-wrapper");

  if (q.image) {
    questionImage.src = q.image.includes("/") ? q.image : `images/${BANK}/${q.image}`;
    questionImage.classList.remove("hidden");
    if (imageWrapper) imageWrapper.classList.remove("hidden");
  } else {
    questionImage.classList.add("hidden");
    if (imageWrapper) imageWrapper.classList.add("hidden"); // 关键：隐藏整列
  }

  answerOptions.innerHTML = "";
  q.options.forEach((opt, idx) => {
    let li = document.createElement("li");
    let input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = idx;
    if (ANSWERS[CURRENT_SECTION][CURRENT_INDEX] == idx) input.checked = true;
    input.onchange = () => {
      ANSWERS[CURRENT_SECTION][CURRENT_INDEX] = idx;
      updateStatus();
      // 答题后立即保存一次
      setTimeout(autoSave, 1000);
    };
    li.appendChild(input);
    li.append(" " + opt);
    answerOptions.appendChild(li);
  });

  // 移动端优化
  if (isMobileDevice()) {
    optimizeAnswerOptions();
  }

  updateStatus();
}

function updateStatus() {
  let ans = ANSWERS[CURRENT_SECTION][CURRENT_INDEX];
  let flag = FLAGS[CURRENT_SECTION][CURRENT_INDEX];
  if (ans == null) {
    statusPill.textContent = "Unanswered";
    statusPill.style.background = "#FFF3CD";
  } else {
    statusPill.textContent = "Answered";
    statusPill.style.background = "#F9FAFB";
  }
  flag ? flagPill.classList.remove("hidden") : flagPill.classList.add("hidden");
}

// ========== Navigation ==========
document.getElementById("next-button").onclick = () => {
  if (CURRENT_INDEX < 49) {
    CURRENT_INDEX++;
    renderQuestion();
  }
};
document.getElementById("prev-button").onclick = () => {
  if (CURRENT_INDEX > 0) {
    CURRENT_INDEX--;
    renderQuestion();
  }
};

// ========== Flag ==========
document.getElementById("flag-button").onclick = () => {
  FLAGS[CURRENT_SECTION][CURRENT_INDEX] = !FLAGS[CURRENT_SECTION][CURRENT_INDEX];
  updateStatus();
  // 标记后保存
  setTimeout(autoSave, 1000);
};

// ========== Review ==========
function populateReviewGrid() {
  let grid = document.getElementById("review-grid");
  grid.innerHTML = "";
  QUESTIONS[CURRENT_SECTION].forEach((q, idx) => {
    let chip = document.createElement("div");
    chip.className = "review-chip";
    let ans = ANSWERS[CURRENT_SECTION][idx];
    let flag = FLAGS[CURRENT_SECTION][idx];
    if (ans == null) chip.classList.add("unanswered");
    if (flag) chip.classList.add("flagged");
    chip.textContent = `Q${idx+1}`;
    chip.onclick = () => {
      CURRENT_INDEX = idx;
      renderQuestion();
      hideModal(reviewModal);
    };
    grid.appendChild(chip);
  });
}

reviewBtn.onclick = () => { 
  populateReviewGrid(); 
  showModal(reviewModal);
};
reviewCloseBtn.onclick = () => { 
  hideModal(reviewModal); 
};

// ========== Section Review ==========
function populateSectionReview() {
  let grid = document.getElementById("section-review-grid");
  grid.innerHTML = "";
  QUESTIONS[CURRENT_SECTION].forEach((q, idx) => {
    let chip = document.createElement("div");
    chip.className = "review-chip";
    let ans = ANSWERS[CURRENT_SECTION][idx];
    let flag = FLAGS[CURRENT_SECTION][idx];
    if (ans == null) chip.classList.add("unanswered");
    if (flag) chip.classList.add("flagged");
    chip.textContent = `Q${idx+1}`;
    grid.appendChild(chip);
  });
}

endBlockBtn.onclick = () => { 
  populateSectionReview(); 
  showModal(sectionReviewModal); 
};
sectionReviewBackBtn.onclick = () => { 
  hideModal(sectionReviewModal); 
};

// FIXED: Show confirmation before ending section
document.getElementById("section-review-end").onclick = () => { 
  hideModal(sectionReviewModal); // Close review modal first
  // Show confirmation modal
  const confirmModal = document.getElementById("section-end-confirm-modal");
  showModal(confirmModal);
};

// ========== Exam Review ==========
function populateExamReview() {
  let content = document.getElementById("exam-review-content");
  content.innerHTML = "";
  QUESTIONS.forEach((block, secIdx) => {
    let h = document.createElement("h4");
    h.textContent = `Section ${secIdx+1}`;
    content.appendChild(h);
    let grid = document.createElement("div");
    grid.className = "review-grid";
    block.forEach((q, idx) => {
      let chip = document.createElement("div");
      chip.className = "review-chip";
      let ans = ANSWERS[secIdx][idx];
      let flag = FLAGS[secIdx][idx];
      if (ans == null) chip.classList.add("unanswered");
      if (flag) chip.classList.add("flagged");
      chip.textContent = `Q${idx+1}`;
      grid.appendChild(chip);
    });
    content.appendChild(grid);
  });
}

function finishExam() {
  clearInterval(timerInterval);
  stopAutoSave(); // 停止自动保存
  populateExamReview();
  showModal(examReviewModal);
}

examReviewCloseBtn.onclick = () => { 
  hideModal(examReviewModal); 
};

// 提交确认逻辑
document.getElementById("exam-review-finish").onclick = () => {
  hideModal(examReviewModal);
  showModal(submitConfirmModal);
};

document.getElementById("cancel-submit").onclick = () => {
  hideModal(submitConfirmModal);
  showModal(examReviewModal);
};

document.getElementById("confirm-submit").onclick = () => {
  hideModal(submitConfirmModal);
  clearInterval(timerInterval);
  stopAutoSave(); // 确保停止自动保存
  
  // 清除自动保存数据
  examAutoSave = null;
  
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;">
      <h2>Exam Ended</h2>
      <p>Your responses have been submitted successfully.</p>
      <button id="export-results">Download Results</button>
    </div>
  `;
  document.getElementById("export-results").onclick = () => { exportResults(); };
};

// Section end confirmation logic
document.getElementById("cancel-section-end").onclick = () => {
  hideModal(sectionEndConfirmModal);
  showModal(sectionReviewModal); // Return to section review
};

document.getElementById("confirm-section-end").onclick = () => {
  hideModal(sectionEndConfirmModal);
  endSection(); // Proceed to next section
};

// ========== Section Flow ==========
function endSection() {
  // 结束当前section时保存一次
  autoSave();
  
  CURRENT_SECTION++;
  if (CURRENT_SECTION >= 4) {
    finishExam();
  } else {
    CURRENT_INDEX = 0;
    sectionTime = 75 * 60;
    renderQuestion();
  }
}

// ========== Export PDF Results ==========
function exportResults() {
  // Calculate statistics
  let totalQuestions = 200;
  let answeredCount = 0;
  let flaggedCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  
  ANSWERS.forEach((sectionAnswers, sectionIdx) => {
    Object.keys(sectionAnswers).forEach(qIdx => {
      if (sectionAnswers[qIdx] != null) {
        answeredCount++;
        if (sectionAnswers[qIdx] === QUESTIONS[sectionIdx][qIdx].correct) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    });
  });
  
  FLAGS.forEach((sectionFlags, sectionIdx) => {
    Object.keys(sectionFlags).forEach(qIdx => {
      if (sectionFlags[qIdx]) flaggedCount++;
    });
  });
  
  let unansweredCount = totalQuestions - answeredCount;
  let completionRate = ((answeredCount / totalQuestions) * 100).toFixed(1);
  let correctRate = ((correctCount / totalQuestions) * 100).toFixed(1);
  let totalScore = correctCount; // 总分就是正确答案数
  
  // Generate current date
  let now = new Date();
  let examDate = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Create PDF content as HTML
  let pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 1in; }
        body { 
          font-family: 'Times New Roman', serif; 
          line-height: 1.4; 
          margin: 0; 
          font-size: 12pt;
        }
        .header { 
          text-align: center; 
          margin-bottom: 40px;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }
        .title { 
          font-size: 18pt; 
          font-weight: bold; 
          margin-bottom: 10px;
        }
        .subtitle { 
          font-size: 14pt; 
          margin-bottom: 20px;
        }
        .score-section {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          border: 3px solid #000;
          background-color: #f8f9fa;
        }
        .total-score {
          font-size: 24pt;
          font-weight: bold;
          margin: 15px 0;
          color: #2a4365;
        }
        .score-label {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .score-details {
          font-size: 12pt;
          margin: 5px 0;
        }
        .exam-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .info-section {
          border: 1px solid #333;
          padding: 15px;
        }
        .info-title {
          font-weight: bold;
          font-size: 11pt;
          margin-bottom: 10px;
          text-decoration: underline;
        }
        .info-row {
          margin: 5px 0;
          font-size: 10pt;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .summary-table th, .summary-table td {
          border: 1px solid #333;
          padding: 8px;
          text-align: center;
          font-size: 10pt;
        }
        .summary-table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .section-detail {
          margin: 20px 0;
        }
        .section-header {
          font-weight: bold;
          font-size: 11pt;
          margin: 15px 0 10px 0;
          text-decoration: underline;
        }
        .question-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 5px;
          margin: 10px 0;
        }
        .question-cell {
          border: 1px solid #666;
          padding: 3px;
          text-align: center;
          font-size: 8pt;
          min-height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .answered { background-color: #fff3cd; }
        .unanswered { background-color: #f8f9fa; }
        .flagged { background-color: #f8d7da; }
        .footer {
          margin-top: 40px;
          font-size: 9pt;
          text-align: center;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 15px;
        }
        .disclaimer {
          margin-top: 30px;
          font-size: 9pt;
          color: #666;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">NATIONAL BOARD OF MEDICAL EXAMINERS</div>
        <div class="subtitle">Comprehensive Basic Science Examination - Form ${BANK}</div>
        <div class="subtitle">EXAMINATION REPORT</div>
      </div>
      
      <div class="score-section">
        <div class="score-label">TOTAL SCORE</div>
        <div class="total-score">${totalScore} / 200</div>
        <div class="score-details">Correct Rate: ${correctRate}%</div>
        <div class="score-details">Questions Answered: ${answeredCount} / ${totalQuestions} (${completionRate}%)</div>
      </div>
      
      <div class="exam-info">
        <div class="info-section">
          <div class="info-title">EXAMINATION INFORMATION</div>
          <div class="info-row">Form: ${BANK}</div>
          <div class="info-row">Date: ${examDate}</div>
          <div class="info-row">Total Questions: ${totalQuestions}</div>
          <div class="info-row">Duration: 5 hours</div>
        </div>
        <div class="info-section">
          <div class="info-title">PERFORMANCE SUMMARY</div>
          <div class="info-row">Questions Answered: ${answeredCount}</div>
          <div class="info-row">Questions Unanswered: ${unansweredCount}</div>
          <div class="info-row">Questions Flagged: ${flaggedCount}</div>
          <div class="info-row">Correct Answers: ${correctCount}</div>
          <div class="info-row">Incorrect Answers: ${incorrectCount}</div>
          <div class="info-row">Correct Rate: ${correctRate}%</div>
        </div>
      </div>
      
      <table class="summary-table">
        <thead>
          <tr>
            <th>Section</th>
            <th>Total Questions</th>
            <th>Answered</th>
            <th>Correct</th>
            <th>Incorrect</th>
            <th>Unanswered</th>
            <th>Flagged</th>
            <th>Correct Rate</th>
          </tr>
        </thead>
        <tbody>`;
  
  // Add section statistics
  for (let s = 0; s < 4; s++) {
    let sectionAnswered = 0;
    let sectionCorrect = 0;
    let sectionIncorrect = 0;
    let sectionFlagged = Object.keys(FLAGS[s]).filter(qIdx => FLAGS[s][qIdx]).length;
    
    Object.keys(ANSWERS[s]).forEach(qIdx => {
      if (ANSWERS[s][qIdx] != null) {
        sectionAnswered++;
        if (ANSWERS[s][qIdx] === QUESTIONS[s][qIdx].correct) {
          sectionCorrect++;
        } else {
          sectionIncorrect++;
        }
      }
    });
    
    let sectionUnanswered = 50 - sectionAnswered;
    let sectionCorrectRate = ((sectionCorrect / 50) * 100).toFixed(1);
    
    pdfContent += `
          <tr>
            <td>Section ${s + 1}</td>
            <td>50</td>
            <td>${sectionAnswered}</td>
            <td>${sectionCorrect}</td>
            <td>${sectionIncorrect}</td>
            <td>${sectionUnanswered}</td>
            <td>${sectionFlagged}</td>
            <td>${sectionCorrectRate}%</td>
          </tr>`;
  }
  
  pdfContent += `
        </tbody>
      </table>
      
      <div class="section-detail">
        <div class="section-header">DETAILED RESPONSE PATTERN</div>`;
  
  // Add detailed question grids for each section
  for (let s = 0; s < 4; s++) {
    pdfContent += `
        <div class="section-header">Section ${s + 1} Questions (1-50)</div>
        <div class="question-grid">`;
    
    for (let q = 0; q < 50; q++) {
      let userAnswer = ANSWERS[s][q];
      let correctAnswer = QUESTIONS[s][q].correct;
      let flagged = FLAGS[s][q];
      let className = 'question-cell';
      
      if (flagged) {
        className += ' flagged';
      } else if (userAnswer != null) {
        className += ' answered';
      } else {
        className += ' unanswered';
      }
      
      let symbol = '';
      if (userAnswer == null) {
        symbol = 'U';
      } else if (userAnswer === correctAnswer) {
        symbol = '✓'; // 打勾表示正确
      } else {
        symbol = '✗'; // 打叉表示错误
      }
      
      pdfContent += `<div class="${className}">${q + 1}<br/>${symbol}</div>`;
    }
    
    pdfContent += `</div>`;
  }
  
  pdfContent += `
      </div>
      
      <div class="disclaimer">
        <p><strong>Legend:</strong> ✓ = Correct Answer, ✗ = Incorrect Answer, U = Unanswered</p>
        <p><strong>Color Code:</strong> Yellow = Answered, Gray = Unanswered, Red = Flagged</p>
        <p><strong>Note:</strong> This is a practice examination report showing your performance and response patterns.</p>
      </div>
      
      <div class="footer">
        <p>NBME Comprehensive Basic Science Examination Simulator</p>
        <p>Generated on ${now.toLocaleString('en-US')}</p>
      </div>
    </body>
    </html>`;
  
  // Create and download PDF
  let printWindow = window.open('', '_blank');
  printWindow.document.write(pdfContent);
  printWindow.document.close();
  
  // Wait for content to load then trigger print
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

// ========== Image Zoom ==========
const imageModal = document.getElementById("image-modal");
const imageModalContent = document.getElementById("image-modal-content");

questionImage.onclick = () => {
  if (!questionImage.classList.contains("hidden")) {
    imageModalContent.src = questionImage.src;
    showModal(imageModal);
  }
};

imageModal.onclick = (e) => {
  if (e.target === imageModal) {
    hideModal(imageModal);
  }
};

// ========== 处理屏幕方向变化 ==========
window.addEventListener('orientationchange', function() {
  setTimeout(() => {
    // 重新计算布局
    if (window.DeviceOrientationEvent) {
      window.scrollTo(0, 0);
    }
  }, 100);
});

// ========== 防止意外关闭 ==========
window.addEventListener('beforeunload', function(e) {
  if (timerInterval) {
    e.preventDefault();
    e.returnValue = '考试正在进行中，确定要离开吗？';
    return e.returnValue;
  }
});

// ========== 初始化 ==========
initMobileOptimizations();
loadExam();
