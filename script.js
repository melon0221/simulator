// 1. Global Variables
let currentQuestionIndex = 0;
let selectedAnswer = null;
let currentBlock = 1;
let questionBank = '';
let questions = [];
let results = [];
let totalTime = 315 * 60; // Total exam time in seconds (5 hours 15 minutes)
let blockTime = 75 * 60; // Time per block in seconds (1 hour 15 minutes)
let breakTime = 15 * 60; // Break time in seconds (15 minutes)
let timeLeft = blockTime;
let breakTimeLeft = 0;
let examInterval;

// Load Questions
async function loadQuestions(bank) {
    const response = await fetch(`./data/questionBank_${bank}.json`);
    const data = await response.json();
    questions = data.blocks.flatMap(block => block.questions);
    questionBank = bank;
    displayQuestion();
}

// Start Timer
function startTimer() {
    examInterval = setInterval(function() {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else if (breakTimeLeft > 0) {
            breakTimeLeft--;
            updateBreakDisplay();
        } else {
            if (currentBlock < 4) {
                currentBlock++;
                timeLeft = blockTime;
                breakTimeLeft = breakTime;
                alert("Break over! Start next block.");
            } else {
                clearInterval(examInterval);
                alert("Exam completed!");
                saveResults();
            }
        }
    }, 1000);
}

// Update Timer UI
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('time-remaining').textContent = `${minutes}:${seconds}`;
}

function updateBreakDisplay() {
    const minutes = Math.floor(breakTimeLeft / 60);
    const seconds = breakTimeLeft % 60;
    document.getElementById('time-remaining').textContent = `Break: ${minutes}:${seconds}`;
}

// Display Questions
function displayQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById('question-text').textContent = question.questionText;
    const optionsList = document.getElementById('answer-options');
    optionsList.innerHTML = '';

    question.options.forEach((option, index) => {
        const li = document.createElement('li');
        li.textContent = option;
        li.onclick = () => selectAnswer(index, li);
        optionsList.appendChild(li);
    });

    updateExamSection();
}

// Select Answer
function selectAnswer(index, liElement) {
    if (selectedAnswer !== null) {
        const prevItem = document.querySelectorAll('li')[selectedAnswer];
        prevItem.classList.remove('selected');
    }
    selectedAnswer = index;
    liElement.classList.add('selected');
}

// Update Exam Section (Display Current Question)
function updateExamSection() {
    document.getElementById('exam-section').textContent = `Exam Section ${currentBlock}: Item ${currentQuestionIndex + 1} of ${questions.length}`;
}

// Save Results
function storeResult(question, userAnswer) {
    const result = {
        date: new Date().toISOString(),
        questionName: `${questionBank}-B${currentBlock}-Q${currentQuestionIndex + 1}`,
        result: (userAnswer === question.correct) ? 'Correct' : 'Incorrect'
    };
    results.push(result);
}

// Save to Excel
function saveResults() {
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam Results");

    XLSX.writeFile(wb, `NBME_Exam_Results_${new Date().toISOString()}.xlsx`);
}

// Handle Next and Previous Buttons
document.getElementById('next-button').onclick = () => {
    if (selectedAnswer !== null) {
        storeResult(questions[currentQuestionIndex], selectedAnswer);
    }
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) {
        currentQuestionIndex = questions.length - 1;
    }
    displayQuestion();
};

document.getElementById('prev-button').onclick = () => {
    currentQuestionIndex--;
    if (currentQuestionIndex < 0) {
        currentQuestionIndex = 0;
    }
    displayQuestion();
};

// Load the selected question bank and start timer
const queryParams = new URLSearchParams(window.location.search);
const bank = queryParams.get('bank');
loadQuestions(bank);
startTimer();
