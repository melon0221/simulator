let BANK = null;
let QUESTIONS = [];
let CURRENT_SECTION = 0;
let CURRENT_INDEX = 0;
let ANSWERS = {};
let FLAGS = {};
let timerInterval = null;
let sectionTime = 75 * 60; // 75 minutes per section
let totalTime = 300 * 60; // 300 minutes total (5 hours)

// Pause related variables
let isPaused = false;
let pauseStartTime = 0;

// Auto-save related variables
let autoSaveInterval = null;
let examAutoSave = null;

// Mobile optimization variables
let isMobile = false;
let touchStartY = 0;
let isScrolling = false;

// DOM elements
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
const pauseBtn = document.getElementById("pause-button");

// ========== SCROLL RESET FUNCTIONALITY ==========
function scrollToTop() {
  // Detect if we're on mobile or desktop
  const isMobileDevice = isMobile || window.innerWidth <= 767 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobileDevice) {
    // Mobile: Use immediate scroll with multiple fallback methods
    try {
      // Method 1: Standard window scroll
      window.scrollTo(0, 0);
      
      // Method 2: Question wrapper scroll
      const questionWrapper = document.querySelector('.question-wrapper');
      if (questionWrapper) {
        questionWrapper.scrollTop = 0;
      }
      
      // Method 3: Container scroll
      const container = document.querySelector('.container');
      if (container) {
        container.scrollTop = 0;
      }
      
      // Method 4: Document elements (iOS Safari fallback)
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Method 5: Force layout recalculation for stubborn browsers
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      
      // Method 6: iOS specific handling
      if (window.pageYOffset !== undefined) {
        window.pageYOffset = 0;
      }
      
    } catch (error) {
      console.warn('Mobile scroll reset failed:', error);
    }
  } else {
    // Desktop: Use smooth scroll with fallbacks
    try {
      // Primary method: smooth scroll
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
      
      // Also reset question wrapper for desktop
      const questionWrapper = document.querySelector('.question-wrapper');
      if (questionWrapper && questionWrapper.scrollTop > 0) {
        questionWrapper.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
      
    } catch (error) {
      // Fallback for older browsers
      console.warn('Smooth scroll not supported, using immediate scroll');
      window.scrollTo(0, 0);
      
      const questionWrapper = document.querySelector('.question-wrapper');
      if (questionWrapper) {
        questionWrapper.scrollTop = 0;
      }
    }
  }
}

// Enhanced function to ensure scroll reset works across all scenarios
function forceScrollReset() {
  // Multiple attempts to ensure scroll reset
  scrollToTop();
  
  // Additional reset after a brief delay for slow-rendering content
  setTimeout(() => {
    scrollToTop();
  }, 100);
  
  // Final attempt for stubborn cases
  setTimeout(() => {
    window.scrollTo(0, 0);
    const questionWrapper = document.querySelector('.question-wrapper');
    if (questionWrapper) {
      questionWrapper.scrollTop = 0;
    }
  }, 200);
}

// ========== TIMER INITIALIZATION FUNCTION ==========
function initializeTimers() {
  // Set section timer to 75 minutes (always reset for new section)
  sectionTime = 75 * 60;
  
  // Set total timer based on current section
  // Section 0 (1st): 300 minutes (5 hours)
  // Section 1 (2nd): 225 minutes (3.75 hours) 
  // Section 2 (3rd): 150 minutes (2.5 hours)
  // Section 3 (4th): 75 minutes (1.25 hours)
  totalTime = (4 - CURRENT_SECTION) * 75 * 60;
  
  console.log(`Timer initialized for Section ${CURRENT_SECTION + 1}:`);
  console.log(`- Section time: ${Math.floor(sectionTime / 60)} minutes`);
  console.log(`- Total time remaining: ${Math.floor(totalTime / 60)} minutes`);
}

// ========== MOBILE DETECTION AND INITIALIZATION ==========
function detectMobile() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  
  isMobile = (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
    screenWidth <= 767
  );
  
  return isMobile;
}

function initMobileOptimizations() {
  detectMobile();
  
  if (isMobile) {
    // Add mobile class to body
    document.body.classList.add('mobile-device');
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
    
    // Prevent pinch zoom
    document.addEventListener('gesturestart', function(e) {
      e.preventDefault();
    });
    
    document.addEventListener('gesturechange', function(e) {
      e.preventDefault();
    });
    
    document.addEventListener('gestureend', function(e) {
      e.preventDefault();
    });
    
    // Optimize touch scrolling
    const questionWrapper = document.querySelector('.question-wrapper');
    if (questionWrapper) {
      questionWrapper.style.webkitOverflowScrolling = 'touch';
      
      // Add touch scroll optimization
      questionWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
      questionWrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
    }
    
    // Optimize viewport for mobile
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    
    console.log('Mobile optimizations initialized');
  }
}

function handleTouchStart(e) {
  touchStartY = e.touches[0].clientY;
  isScrolling = false;
}

function handleTouchMove(e) {
  if (!touchStartY) return;
  
  const touchY = e.touches[0].clientY;
  const diffY = touchStartY - touchY;
  
  if (Math.abs(diffY) > 5) {
    isScrolling = true;
  }
}

// FIXED: Improved answer option optimization for mobile
function optimizeAnswerOptions() {
  const answerItems = document.querySelectorAll('.answers li');
  
  answerItems.forEach((li, index) => {
    // Remove any existing event listeners to avoid duplicates
    const newLi = li.cloneNode(true);
    li.parentNode.replaceChild(newLi, li);
    
    // Get the input element
    const input = newLi.querySelector('input[type="radio"]');
    
    if (input) {
      // FIXED: Re-attach the original onchange handler with proper context
      input.addEventListener('change', function() {
        console.log('Radio button changed:', index, 'to value:', this.value);
        ANSWERS[CURRENT_SECTION][CURRENT_INDEX] = parseInt(this.value);
        updateStatus();
        setTimeout(autoSave, 1000);
      });
      
      // Add enhanced touch events for mobile
      if (isMobile) {
        let touchStarted = false;
        
        newLi.addEventListener('touchstart', function(e) {
          touchStarted = true;
          if (!isScrolling) {
            this.style.transform = 'scale(0.98)';
            this.style.transition = 'transform 0.1s ease';
          }
        }, { passive: true });
        
        // FIXED: Improved mobile touch selection
        newLi.addEventListener('touchend', function(e) {
          this.style.transform = '';
          
          if (touchStarted && !isScrolling) {
            e.preventDefault();
            e.stopPropagation();
            
            const radioInput = this.querySelector('input[type="radio"]');
            if (radioInput && !radioInput.checked) {
              // Clear all radio buttons in this group
              const allInputs = document.querySelectorAll('.answers input[type="radio"]');
              allInputs.forEach(inp => inp.checked = false);
              
              // Select this radio button
              radioInput.checked = true;
              
              // FIXED: Manually update the answer data and trigger events
              const selectedValue = parseInt(radioInput.value);
              console.log('Mobile touch: selecting answer', selectedValue, 'for section', CURRENT_SECTION, 'index', CURRENT_INDEX);
              
              ANSWERS[CURRENT_SECTION][CURRENT_INDEX] = selectedValue;
              updateStatus();
              setTimeout(autoSave, 1000);
              
              // Add visual feedback
              this.style.backgroundColor = '#e3f2fd';
              setTimeout(() => {
                this.style.backgroundColor = '';
              }, 300);
            }
          }
          touchStarted = false;
        }, { passive: false });
        
        newLi.addEventListener('touchcancel', function(e) {
          this.style.transform = '';
          touchStarted = false;
        });
      }
    }
    
    // Desktop click handler (non-mobile or fallback)
    newLi.addEventListener('click', function(e) {
      if (!isMobile && e.target.tagName !== 'INPUT') {
        const radioInput = this.querySelector('input[type="radio"]');
        if (radioInput && !radioInput.checked) {
          // Clear all radio buttons
          const allInputs = document.querySelectorAll('.answers input[type="radio"]');
          allInputs.forEach(inp => inp.checked = false);
          
          // Select this radio button
          radioInput.checked = true;
          
          // Update answer data
          const selectedValue = parseInt(radioInput.value);
          ANSWERS[CURRENT_SECTION][CURRENT_INDEX] = selectedValue;
          updateStatus();
          setTimeout(autoSave, 1000);
        }
      }
    });
  });
}

// Enhanced modal handling for mobile
function showModal(modal) {
  modal.classList.add('show');
  
  if (isMobile) {
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${window.scrollY}px`;
    
    // Add touch event to close modal when tapping outside
    modal.addEventListener('touchstart', handleModalTouch);
  }
}

function hideModal(modal) {
  modal.classList.remove('show');
  
  if (isMobile) {
    // Restore background scrolling
    const scrollY = document.body.style.top;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    // Remove touch event listener
    modal.removeEventListener('touchstart', handleModalTouch);
  }
}

function handleModalTouch(e) {
  if (e.target === e.currentTarget) {
    hideModal(e.currentTarget);
  }
}

// ========== PAUSE FUNCTIONALITY ==========
function pauseExam() {
  if (isPaused) {
    resumeExam();
  } else {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    isPaused = true;
    pauseStartTime = Date.now();
    pauseBtn.textContent = 'Resume';
    pauseBtn.classList.add('paused');
    
    showPauseOverlay();
    autoSave();
    
    console.log('Exam paused at:', new Date().toLocaleTimeString());
    console.log('Current times - Section:', sectionTime, 'Total:', totalTime);
  }
}

// Fixed resumeExam function - make it global and handle timer properly
window.resumeExam = function() {
  console.log('Resume function called');
  console.log('Current state - isPaused:', isPaused, 'sectionTime:', sectionTime, 'totalTime:', totalTime);
  
  // Validate timer variables before proceeding
  if (typeof sectionTime === 'undefined' || sectionTime === null || isNaN(sectionTime)) {
    console.error('sectionTime is invalid:', sectionTime);
    alert('Timer error - please refresh the page');
    return;
  }
  
  if (typeof totalTime === 'undefined' || totalTime === null || isNaN(totalTime)) {
    console.error('totalTime is invalid:', totalTime);
    alert('Timer error - please refresh the page');
    return;
  }
  
  isPaused = false;
  pauseBtn.textContent = 'Pause';
  pauseBtn.classList.remove('paused');
  
  hidePauseOverlay();
  startTimer();
  
  console.log('Exam resumed at:', new Date().toLocaleTimeString());
}

function showPauseOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'pause-overlay';
  overlay.className = 'pause-overlay';
  overlay.innerHTML = `
    <div class="pause-content">
      <div class="pause-icon">⏸️</div>
      <h3>Exam Paused</h3>
      <p>Click "Resume" button to continue the exam</p>
      <p class="pause-time">Pause duration: <span id="pause-timer">00:00</span></p>
      <button class="resume-button" type="button">Resume</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add event listener to the resume button
  const resumeButton = overlay.querySelector('.resume-button');
  if (resumeButton) {
    resumeButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Resume button clicked');
      window.resumeExam();
    });
    
    // Add mobile touch support
    if (isMobile) {
      resumeButton.addEventListener('touchend', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Resume button touched');
        window.resumeExam();
      });
    }
  }
  
  startPauseTimer();
  
  // Add mobile touch support for overlay
  if (isMobile) {
    overlay.addEventListener('touchstart', function(e) {
      if (e.target === e.currentTarget || e.target.classList.contains('pause-content')) {
        e.preventDefault();
      }
    });
  }
}

function hidePauseOverlay() {
  const overlay = document.getElementById('pause-overlay');
  if (overlay) {
    overlay.remove();
  }
  stopPauseTimer();
}

let pauseTimerInterval = null;

function startPauseTimer() {
  pauseTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - pauseStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timerElement = document.getElementById('pause-timer');
    if (timerElement) {
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

function stopPauseTimer() {
  if (pauseTimerInterval) {
    clearInterval(pauseTimerInterval);
    pauseTimerInterval = null;
  }
}

// ========== AUTO-SAVE FUNCTIONALITY ==========
function showAutoSaveIndicator(success = true) {
  let indicator = document.getElementById('auto-save-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'auto-save-indicator';
    indicator.className = 'auto-save-indicator';
    document.body.appendChild(indicator);
  }
  
  indicator.className = 'auto-save-indicator show';
  if (success) {
    indicator.textContent = 'Auto-saved';
    indicator.classList.remove('error');
  } else {
    indicator.textContent = 'Save failed';
    indicator.classList.add('error');
  }
  
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
      isPaused: isPaused,
      timestamp: Date.now(),
      version: '1.2'
    };
    
    examAutoSave = examData;
    showAutoSaveIndicator(true);
    
    console.log('Exam data auto-saved', new Date().toLocaleTimeString());
    
  } catch (error) {
    console.error('Auto-save failed:', error);
    showAutoSaveIndicator(false);
  }
}

function loadAutoSave() {
  if (examAutoSave && examAutoSave.bank === BANK) {
    const timeSinceLastSave = Date.now() - examAutoSave.timestamp;
    
    if (timeSinceLastSave < 2 * 60 * 60 * 1000) {
      const shouldRestore = confirm(
        `Previous exam session found (saved ${Math.floor(timeSinceLastSave / 60000)} minutes ago)\nWould you like to resume the exam?`
      );
      
      if (shouldRestore) {
        CURRENT_SECTION = examAutoSave.section;
        CURRENT_INDEX = examAutoSave.index;
        ANSWERS = examAutoSave.answers;
        FLAGS = examAutoSave.flags;
        sectionTime = examAutoSave.sectionTime;
        totalTime = examAutoSave.totalTime;
        
        console.log('Previous exam progress restored');
        showAutoSaveIndicator(true);
        
        return true;
      }
    }
  }
  return false;
}

function startAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }
  
  autoSaveInterval = setInterval(autoSave, 30000);
  console.log('Auto-save feature started');
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
  console.log('Auto-save feature stopped');
}

// ========== LOAD EXAM ==========
async function loadExam() {
  console.log('loadExam function called');
  
  const urlParams = new URLSearchParams(window.location.search);
  BANK = urlParams.get("bank") || "25";
  
  console.log('Loading bank:', BANK);
  
  try {
    // Clear previous data
    QUESTIONS = [];
    ANSWERS = {};
    FLAGS = {};
    
    let res = await fetch(`questionBanks/${BANK}.json`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    let data = await res.json();
    
    console.log('Question data loaded:', data.length, 'questions');

    // Split questions into 4 sections of 50 each
    for (let i = 0; i < 4; i++) {
      QUESTIONS.push(data.slice(i * 50, (i + 1) * 50));
    }
    
    // Initialize answer and flag arrays
    ANSWERS = QUESTIONS.map(() => ({}));
    FLAGS = QUESTIONS.map(() => ({}));

    console.log('Questions organized into sections:', QUESTIONS.length);

    // Try to load auto-save data
    const restored = loadAutoSave();
    
    // Initialize current position
    if (!restored) {
      // Starting fresh - reset to section 0
      CURRENT_SECTION = 0;
      CURRENT_INDEX = 0;
      console.log('Starting fresh exam');
    } else {
      console.log('Restored previous session');
    }
    
    // Initialize mobile optimizations
    initMobileOptimizations();
    
    // Initialize timers properly for current section
    initializeTimers();
    
    // Render first question
    renderQuestion();
    
    // Start timer
    startTimer();
    
    // Start auto-save
    startAutoSave();
    
    // Initial auto-save for new sessions
    if (!restored) {
      setTimeout(autoSave, 5000);
    }
    
    console.log('Exam initialization completed successfully');
    
  } catch (error) {
    console.error('Failed to load exam:', error);
    alert(`Failed to load exam: ${error.message}\n\nPlease check:\n1. Your internet connection\n2. The question bank file exists\n3. Try refreshing the page`);
  }
}

// Make loadExam globally accessible - CRITICAL
window.loadExam = loadExam;

// ========== TIMER ==========
function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  console.log('Starting timer with sectionTime:', sectionTime, 'totalTime:', totalTime);
  
  timerInterval = setInterval(() => {
    if (!isPaused && sectionTime > 0 && totalTime > 0) {
      sectionTime--;
      totalTime--;
      updateTimerDisplay();
      
      if (sectionTime <= 0) {
        console.log('Section time ended');
        endSection();
      }
      if (totalTime <= 0) {
        console.log('Total time ended');
        finishExam();
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  if (timeRemaining && sectionTime >= 0) {
    timeRemaining.textContent = formatTime(sectionTime);
  }
  
  if (totalRemaining && totalTime >= 0) {
    totalRemaining.textContent = "Total Exam Time Remaining: " + formatTime(totalTime);
  }
  
  if (sectionTime <= 300) { // 5 minute warning
    timeRemaining.classList.add('time-warning');
  } else {
    timeRemaining.classList.remove('time-warning');
  }
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return "0 hr 0 min 00 sec";
  
  let h = Math.floor(sec / 3600);
  let m = Math.floor((sec % 3600) / 60);
  let s = sec % 60;
  return `${h} hr ${m} min ${s.toString().padStart(2, "0")} sec`;
}

// ========== RENDER QUESTION WITH SCROLL RESET ==========
function renderQuestion() {
  console.log('renderQuestion called - Section:', CURRENT_SECTION, 'Index:', CURRENT_INDEX);
  
  // Safety check
  if (!QUESTIONS || !QUESTIONS[CURRENT_SECTION] || !QUESTIONS[CURRENT_SECTION][CURRENT_INDEX]) {
    console.error('Question data not available:', {
      QUESTIONS: !!QUESTIONS,
      section: CURRENT_SECTION,
      sectionExists: !!(QUESTIONS && QUESTIONS[CURRENT_SECTION]),
      questionExists: !!(QUESTIONS && QUESTIONS[CURRENT_SECTION] && QUESTIONS[CURRENT_SECTION][CURRENT_INDEX])
    });
    return;
  }
  
  let q = QUESTIONS[CURRENT_SECTION][CURRENT_INDEX];
  
  // Update section info
  if (examSection) {
    examSection.textContent = `Exam Section ${CURRENT_SECTION+1}: Item ${CURRENT_INDEX+1} of 50`;
  }
  
  // Update question text
  if (questionText) {
    questionText.textContent = q.question;
  }

  // Handle image display
  const imageWrapper = document.querySelector(".question-image-wrapper");
  const questionTop = document.querySelector(".question-top");

  if (q.image && questionImage) {
    questionImage.src = q.image.includes("/") ? q.image : `images/${BANK}/${q.image}`;
    questionImage.classList.remove("hidden");
    if (imageWrapper) imageWrapper.classList.remove("hidden");
    if (questionTop) questionTop.classList.remove("no-image");
    
    // MODIFIED: Only add click event for image modal on non-mobile devices
    if (!isMobile) {
      questionImage.onclick = () => {
        const modal = document.getElementById("image-modal");
        const modalImg = document.getElementById("image-modal-content");
        if (modal && modalImg) {
          modalImg.src = questionImage.src;
          modal.classList.remove("hidden");
          modal.classList.add("show");
        }
      };
      
      // Add cursor pointer style for desktop
      questionImage.style.cursor = 'pointer';
    } else {
      // Remove click handler and cursor pointer for mobile
      questionImage.onclick = null;
      questionImage.style.cursor = 'default';
      
      // Add mobile-specific styling
      questionImage.style.pointerEvents = 'none';
      questionImage.style.userSelect = 'none';
      questionImage.style.webkitUserSelect = 'none';
      questionImage.style.webkitTouchCallout = 'none';
    }
  } else {
    if (questionImage) {
      questionImage.classList.add("hidden");
    }
    if (imageWrapper) imageWrapper.classList.add("hidden");
    if (questionTop) questionTop.classList.add("no-image");
  }

  // Render answer options
  if (answerOptions && q.options) {
    answerOptions.innerHTML = "";
    q.options.forEach((opt, idx) => {
      let li = document.createElement("li");
      let input = document.createElement("input");
      input.type = "radio";
      input.name = "answer";
      input.value = idx;
      
      // Check if this answer was previously selected
      if (ANSWERS[CURRENT_SECTION][CURRENT_INDEX] == idx) {
        input.checked = true;
      }
      
      // FIXED: Set up the onchange handler with proper event listener
      input.addEventListener('change', function() {
        console.log('Answer changed to:', idx);
        ANSWERS[CURRENT_SECTION][CURRENT_INDEX] = idx;
        updateStatus();
        setTimeout(autoSave, 1000);
      });
      
      li.appendChild(input);
      li.append(" " + opt);
      answerOptions.appendChild(li);
    });

    // Apply mobile optimizations to new answer options
    setTimeout(() => {
      optimizeAnswerOptions();
    }, 50);
  }

  updateStatus();
  
  // CRITICAL: Reset scroll position after rendering - with multiple attempts
  setTimeout(() => {
    forceScrollReset();
  }, 50);
  
  // Additional scroll reset for slower devices
  setTimeout(() => {
    scrollToTop();
  }, 150);
  
  console.log('renderQuestion completed');
}

// FIXED: Enhanced updateStatus function with better logging
function updateStatus() {
  let ans = ANSWERS[CURRENT_SECTION][CURRENT_INDEX];
  let flag = FLAGS[CURRENT_SECTION][CURRENT_INDEX];
  
  console.log('Updating status - Answer:', ans, 'Flag:', flag, 'Section:', CURRENT_SECTION, 'Index:', CURRENT_INDEX);
  
  if (ans == null || ans === undefined) {
    statusPill.textContent = "Unanswered";
    statusPill.style.background = "#FFF3CD";
    console.log('Status updated to: Unanswered');
  } else {
    statusPill.textContent = "Answered";
    statusPill.style.background = "#F9FAFB";
    console.log('Status updated to: Answered');
  }
  
  if (flag) {
    flagPill.classList.remove("hidden");
  } else {
    flagPill.classList.add("hidden");
  }
}

// ========== NAVIGATION WITH SCROLL RESET ==========
document.getElementById("next-button").onclick = () => {
  if (CURRENT_INDEX < 49) {
    CURRENT_INDEX++;
    renderQuestion(); // This will now include scroll reset
  }
};

document.getElementById("prev-button").onclick = () => {
  if (CURRENT_INDEX > 0) {
    CURRENT_INDEX--;
    renderQuestion(); // This will now include scroll reset
  }
};

// ========== FLAG ==========
document.getElementById("flag-button").onclick = () => {
  FLAGS[CURRENT_SECTION][CURRENT_INDEX] = !FLAGS[CURRENT_SECTION][CURRENT_INDEX];
  updateStatus();
  setTimeout(autoSave, 1000);
};

// ========== PAUSE BUTTON EVENT ==========
pauseBtn.onclick = pauseExam;

// ========== REVIEW WITH SCROLL RESET ==========
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
    
    // Add mobile touch feedback
    if (isMobile) {
      chip.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.95)';
      });
      chip.addEventListener('touchend', function() {
        this.style.transform = '';
      });
    }
    
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

document.getElementById("section-review-end").onclick = () => { 
  hideModal(sectionReviewModal);
  const confirmModal = document.getElementById("section-end-confirm-modal");
  showModal(confirmModal);
};

// ========== EXAM REVIEW ==========
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
  stopAutoSave();
  populateExamReview();
  showModal(examReviewModal);
}

examReviewCloseBtn.onclick = () => { 
  hideModal(examReviewModal); 
};

// Submit confirmation logic
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
  stopAutoSave();
  
  examAutoSave = null;
  
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;">
      <h2>Exam Ended</h2>
      <p>Your responses have been submitted successfully.</p>
      <button id="export-results" style="padding:12px 24px;font-size:16px;background:#2b6cb0;color:white;border:none;border-radius:6px;cursor:pointer;margin-top:20px;">Download Results</button>
    </div>
  `;
  document.getElementById("export-results").onclick = () => { exportResults(); };
};

// Section end confirmation logic
document.getElementById("cancel-section-end").onclick = () => {
  hideModal(sectionEndConfirmModal);
  showModal(sectionReviewModal);
};

document.getElementById("confirm-section-end").onclick = () => {
  hideModal(sectionEndConfirmModal);
  endSection();
};

// ========== SECTION FLOW WITH SCROLL RESET ==========
function endSection() {
  autoSave();
  
  CURRENT_SECTION++;
  if (CURRENT_SECTION >= 4) {
    finishExam();
  } else {
    CURRENT_INDEX = 0;
    // FIXED: Use initializeTimers() to properly set both timers
    initializeTimers();
    renderQuestion(); // This will include scroll reset
    
    // Restart the timer for the new section
    startTimer();
    
    console.log(`Started Section ${CURRENT_SECTION + 1} with ${Math.floor(sectionTime / 60)} minutes section time and ${Math.floor(totalTime / 60)} minutes total time remaining`);
  }
}

// ========== EXPORT PDF RESULTS ==========
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
  let totalScore = correctCount;
  
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
        .correct { background-color: #d4edda; }
        .incorrect { background-color: #f8d7da; }
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
        
        @media (max-width: 768px) {
          .exam-info {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          .question-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
          }
          .question-cell {
            min-height: 30px;
            font-size: 9pt;
          }
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
      
      let symbol = '';
      let cellClass = 'question-cell';
      
      if (flagged) {
        symbol = 'Flag';
        cellClass += ' flagged';
      } else if (userAnswer == null) {
        symbol = '';  // Empty for unanswered
        cellClass += ' unanswered';
      } else if (userAnswer === correctAnswer) {
        symbol = '';  // Empty for correct answers
        cellClass += ' correct';
      } else {
        symbol = '';  // Empty for incorrect answers  
        cellClass += ' incorrect';
      }
      
      pdfContent += `<div class="${cellClass}">${q + 1}${symbol ? '<br/>' + symbol : ''}</div>`;
    }
    
    pdfContent += `</div>`;
  }
  
  pdfContent += `
      </div>
      
      <div class="disclaimer">
        <p><strong>Note:</strong></p>
        <p>  • Flag = Marked Question </p>
        <p><strong>Color Note:</strong></p>
        <p>  • Green = Answered/Correct</p>
        <p>  • Gray = Unanswered</p>
        <p>  • Red = Incorrect/No points</p>
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

// Make key functions globally accessible
window.resumeExam = window.resumeExam || function() {
  console.log('Global resumeExam called');
  isPaused = false;
  pauseBtn.textContent = 'Pause';
  pauseBtn.classList.remove('paused');
  hidePauseOverlay();
  startTimer();
};

// Expose necessary variables and functions to window object for debugging
window.examState = {
  get sectionTime() { return sectionTime; },
  get totalTime() { return totalTime; },
  get isPaused() { return isPaused; },
  get CURRENT_SECTION() { return CURRENT_SECTION; },
  get CURRENT_INDEX() { return CURRENT_INDEX; },
  get ANSWERS() { return ANSWERS; },
  get FLAGS() { return FLAGS; }
};classList.add("flagged");
    chip.textContent = `Q${idx+1}`;
    chip.onclick = () => {
      CURRENT_INDEX = idx;
      renderQuestion(); // This will now include scroll reset
      hideModal(reviewModal);
    };
    
    // Add touch support for mobile
    if (isMobile) {
      chip.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.95)';
      });
      chip.addEventListener('touchend', function() {
        this.style.transform = '';
      });
    }
    
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

// ========== SECTION REVIEW ==========
function populateSectionReview() {
  let grid = document.getElementById("section-review-grid");
  grid.innerHTML = "";
  QUESTIONS[CURRENT_SECTION].forEach((q, idx) => {
    let chip = document.createElement("div");
    chip.className = "review-chip";
    let ans = ANSWERS[CURRENT_SECTION][idx];
    let flag = FLAGS[CURRENT_SECTION][idx];
    if (ans == null) chip.classList.add("unanswered");
    if (flag) chip.
