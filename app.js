/* ==========================================================================
   NARIT Quiz Application - Core Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- State Variables ---
  let roundQuestions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let userAnswers = []; // Array of { question, selectedOptionIndex, isCorrect }

  // Persistent Deck, Level and Achievement State
  let usedIds = JSON.parse(localStorage.getItem('narit_used_ids') || '[]');
  let roundsPlayed = parseInt(localStorage.getItem('narit_rounds_played') || '0', 10);
  let currentLevel = parseInt(localStorage.getItem('narit_current_level') || '1', 10);
  let correctIds = JSON.parse(localStorage.getItem('narit_correct_ids') || '[]');
  let justShuffled = false;

  // --- DOM Elements ---
  const welcomeScreen = document.getElementById('welcome-screen');
  const quizScreen = document.getElementById('quiz-screen');
  const resultsScreen = document.getElementById('results-screen');

  const startBtn = document.getElementById('start-btn');
  const nextBtn = document.getElementById('next-btn');
  const restartBtn = document.getElementById('restart-btn');
  const viewReviewBtn = document.getElementById('view-review-btn');
  const nextLevelBtn = document.getElementById('next-level-btn');

  const questionCounter = document.getElementById('question-counter');
  const scoreCounter = document.getElementById('score-counter');
  const progressBarFill = document.getElementById('progress-bar-fill');

  const questionText = document.getElementById('question-text');
  const optionsContainer = document.getElementById('options-container');

  const explanationCard = document.getElementById('explanation-card');
  const explanationText = document.getElementById('explanation-text');
  const explanationStatusIcon = document.getElementById('explanation-status-icon');
  const explanationStatusTitle = document.getElementById('explanation-status-title');

  const circleFill = document.getElementById('circle-fill');
  const finalScoreText = document.getElementById('final-score-text');
  const resultMessageTitle = document.getElementById('result-message-title');
  const resultMessageDesc = document.getElementById('result-message-desc');

  const reviewSection = document.getElementById('review-section');
  const reviewListContainer = document.getElementById('review-list-container');

  // --- Deck Progress DOM Elements ---
  const welcomeRoundsPlayed = document.getElementById('welcome-rounds-played');
  const welcomeDeckUsed = document.getElementById('welcome-deck-used');
  const welcomeRoundsRemaining = document.getElementById('welcome-rounds-remaining');
  const welcomeDeckBarFill = document.getElementById('welcome-deck-bar-fill');
  const welcomeDeckShuffleBadge = document.getElementById('welcome-deck-shuffle-badge');
  const welcomeLevelTitle = document.getElementById('welcome-level-title');

  const resultsRoundsPlayed = document.getElementById('results-rounds-played');
  const resultsDeckUsed = document.getElementById('results-deck-used');
  const resultsRoundsRemaining = document.getElementById('results-rounds-remaining');
  const resultsDeckBarFill = document.getElementById('results-deck-bar-fill');
  const resultsDeckShuffleBadge = document.getElementById('results-deck-shuffle-badge');

  // --- Completion Widget DOM Elements ---
  const welcomeCompletionCount = document.getElementById('welcome-completion-count');
  const welcomeCompletionPercent = document.getElementById('welcome-completion-percent');
  const welcomeCompletionBarFill = document.getElementById('welcome-completion-bar-fill');

  const resultsCompletionCount = document.getElementById('results-completion-count');
  const resultsCompletionPercent = document.getElementById('results-completion-percent');
  const resultsCompletionBarFill = document.getElementById('results-completion-bar-fill');

  // --- Event Listeners ---
  startBtn.addEventListener('click', startQuiz);
  nextBtn.addEventListener('click', handleNext);
  restartBtn.addEventListener('click', startQuiz);
  viewReviewBtn.addEventListener('click', scrollToReview);
  if (nextLevelBtn) nextLevelBtn.addEventListener('click', startNextLevel);

  const logoHomeBtn = document.getElementById('logo-home-btn');
  if (logoHomeBtn) {
    logoHomeBtn.addEventListener('click', () => {
      if (quizScreen.classList.contains('active')) {
        if (confirm('คุณต้องการยกเลิกแบบทดสอบในรอบนี้และกลับไปหน้าแรกใช่หรือไม่?')) {
          window.location.href = window.location.pathname;
        }
      } else {
        window.location.href = window.location.pathname;
      }
    });
  }

  function exitQuizToHome() {
    quizScreen.classList.remove('active');
    resultsScreen.classList.remove('active');
    welcomeScreen.classList.add('active');
    updateDeckProgressUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const resetProgressBtn = document.getElementById('reset-progress-btn');
  if (resetProgressBtn) {
    resetProgressBtn.addEventListener('click', () => {
      if (confirm('คุณต้องการรีเซ็ตเลเวลและสถิติคำถามทั้งหมดเพื่อเริ่มใหม่ใช่หรือไม่? (ระดับความสำเร็จการตอบถูกจะถูกรีเซ็ตด้วย)')) {
        localStorage.removeItem('narit_used_ids');
        localStorage.removeItem('narit_rounds_played');
        localStorage.removeItem('narit_current_level');
        localStorage.removeItem('narit_correct_ids');
        usedIds = [];
        correctIds = [];
        roundsPlayed = 0;
        currentLevel = 1;
        justShuffled = false;
        updateDeckProgressUI();
        alert('รีเซ็ตข้อมูลการเล่นเรียบร้อยแล้วครับ!');
      }
    });
  }

  // --- Helpers ---
  
  // Shuffle array utility
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Update Deck Progress widget values in the UI
  function updateDeckProgressUI() {
    const totalCount = questions.length; // 50
    const usedCount = usedIds.length;
    const remainingCount = totalCount - usedCount;
    
    // Remaining rounds calculation (note: if 0, it means it resets next round, so rounds remaining = 5)
    const effectiveRemaining = remainingCount === 0 ? totalCount : remainingCount;
    const roundsRemaining = Math.ceil(effectiveRemaining / 10);
    const percentage = (usedCount / totalCount) * 100;

    // Completion percentage calculation (overall achievement responding correctly to unique questions)
    const correctCount = correctIds.length;
    const completionPercentage = Math.round((correctCount / totalCount) * 100);

    // Welcome Screen
    if (welcomeLevelTitle) welcomeLevelTitle.textContent = `เลเวล ${currentLevel}`;
    if (startBtn) startBtn.textContent = `เริ่มทำแบบทดสอบ (เลเวล ${currentLevel})`;
    
    if (welcomeRoundsPlayed) welcomeRoundsPlayed.textContent = roundsPlayed;
    if (welcomeDeckUsed) welcomeDeckUsed.textContent = `${usedCount}/${totalCount}`;
    if (welcomeRoundsRemaining) welcomeRoundsRemaining.textContent = roundsRemaining;
    if (welcomeDeckBarFill) welcomeDeckBarFill.style.width = `${percentage}%`;
    
    if (welcomeDeckShuffleBadge) {
      if (justShuffled) {
        welcomeDeckShuffleBadge.classList.remove('hidden');
      } else {
        welcomeDeckShuffleBadge.classList.add('hidden');
      }
    }

    // Welcome screen completion progress
    if (welcomeCompletionCount) welcomeCompletionCount.textContent = `${correctCount}/${totalCount}`;
    if (welcomeCompletionPercent) welcomeCompletionPercent.textContent = `${completionPercentage}%`;
    if (welcomeCompletionBarFill) welcomeCompletionBarFill.style.width = `${completionPercentage}%`;

    // Results Screen
    if (resultsRoundsPlayed) resultsRoundsPlayed.textContent = roundsPlayed;
    if (resultsDeckUsed) resultsDeckUsed.textContent = `${usedCount}/${totalCount}`;
    if (resultsRoundsRemaining) resultsRoundsRemaining.textContent = roundsRemaining;
    if (resultsDeckBarFill) resultsDeckBarFill.style.width = `${percentage}%`;
    
    if (resultsDeckShuffleBadge) {
      if (justShuffled) {
        resultsDeckShuffleBadge.classList.remove('hidden');
      } else {
        resultsDeckShuffleBadge.classList.add('hidden');
      }
    }

    // Results screen completion progress
    if (resultsCompletionCount) resultsCompletionCount.textContent = `${correctCount}/${totalCount}`;
    if (resultsCompletionPercent) resultsCompletionPercent.textContent = `${completionPercentage}%`;
    if (resultsCompletionBarFill) resultsCompletionBarFill.style.width = `${completionPercentage}%`;
  }

  // --- Quiz Functions ---

  function startQuiz() {
    // Reset State
    score = 0;
    currentQuestionIndex = 0;
    userAnswers = [];
    justShuffled = false;

    // Hide other screens, show quiz screen
    welcomeScreen.classList.remove('active');
    resultsScreen.classList.remove('active');
    reviewSection.classList.add('hidden');
    explanationCard.classList.add('hidden');
    if (nextLevelBtn) nextLevelBtn.classList.add('hidden');
    
    // --- Card Deck Drawing Logic ---
    const pool = [...questions];
    let available = pool.filter(q => !usedIds.includes(q.id));
    
    if (available.length >= 10) {
      // 1. Normal draw: we have enough unused questions
      let shuffled = shuffleArray(available);
      roundQuestions = shuffled.slice(0, 10);
      
      // Add to used questions
      roundQuestions.forEach(q => usedIds.push(q.id));
    } else {
      // 2. Out of cards: draw what's left, then refill and draw remainder
      roundQuestions = [...available];
      
      // Reset used IDs (Refill deck)
      usedIds = [];
      justShuffled = true;
      
      // Avoid duplicates in the same round
      const alreadyDrawnIds = roundQuestions.map(q => q.id);
      const freshAvailable = pool.filter(q => !alreadyDrawnIds.includes(q.id));
      const shuffledFresh = shuffleArray(freshAvailable);
      
      const remainderCount = 10 - roundQuestions.length;
      const remainder = shuffledFresh.slice(0, remainderCount);
      
      roundQuestions = [...roundQuestions, ...remainder];
      
      // Mark remainder as used in the new cycle
      remainder.forEach(q => usedIds.push(q.id));
    }
    
    // Save state to localStorage
    localStorage.setItem('narit_used_ids', JSON.stringify(usedIds));
    
    // Show Screen
    quizScreen.classList.add('active');
    
    // Update Indicators
    updateProgress();
    updateDeckProgressUI();
    
    // Load first question
    loadQuestion();
  }

  function loadQuestion() {
    // Reset navigation and explanation state
    nextBtn.classList.add('hidden');
    nextBtn.disabled = true;
    explanationCard.classList.add('hidden');
    
    // Clear old options
    optionsContainer.innerHTML = '';
    
    // Get current question data
    const q = roundQuestions[currentQuestionIndex];
    questionText.textContent = q.question;
    
    // Create option buttons
    const labels = ['ก', 'ข', 'ค', 'ง'];
    q.options.forEach((opt, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.innerHTML = `
        <span class="option-badge">${labels[index]}</span>
        <span class="option-text">${opt}</span>
      `;
      
      btn.addEventListener('click', () => selectOption(index));
      optionsContainer.appendChild(btn);
    });

    // Scroll to quiz card for focus
    quizScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectOption(selectedIndex) {
    const q = roundQuestions[currentQuestionIndex];
    const optionButtons = optionsContainer.querySelectorAll('.option-btn');
    const isCorrect = (selectedIndex === q.correctIndex);
    
    // Disable all option buttons
    optionButtons.forEach((btn, idx) => {
      btn.classList.add('disabled');
      // Remove click handlers
      btn.replaceWith(btn.cloneNode(true));
    });
    
    // Get newly cloned elements to apply styling
    const updatedButtons = optionsContainer.querySelectorAll('.option-btn');
    
    // Handle Answer Verification Visuals
    if (isCorrect) {
      score++;
      updatedButtons[selectedIndex].classList.add('correct');
      
      // Update counters
      scoreCounter.textContent = `คะแนน: ${score}`;

      // Record correct question ID if not already recorded
      if (!correctIds.includes(q.id)) {
        correctIds.push(q.id);
        localStorage.setItem('narit_correct_ids', JSON.stringify(correctIds));
      }
      
      // Customize Explanation Card for Correct Answer
      explanationCard.className = 'explanation-card'; // Reset classes, make it visible
      explanationCard.style.backgroundColor = '#d1fae5'; // Pastel green
      explanationCard.style.borderColor = '#a7f3d0';
      explanationCard.style.color = '#065f46';
      explanationStatusIcon.textContent = '✅';
      explanationStatusTitle.textContent = 'ถูกต้องแล้ว!';
    } else {
      updatedButtons[selectedIndex].classList.add('incorrect');
      updatedButtons[q.correctIndex].classList.add('correct');
      
      // Customize Explanation Card for Incorrect Answer
      explanationCard.className = 'explanation-card'; // Reset classes, make it visible
      explanationCard.style.backgroundColor = '#fef3c7'; // Pastel yellow/peach warning tone
      explanationCard.style.borderColor = '#fde68a';
      explanationCard.style.color = '#78350f';
      explanationStatusIcon.textContent = '❌';
      explanationStatusTitle.textContent = 'คำตอบที่ถูกต้องคือข้อ ' + ['ก', 'ข', 'ค', 'ง'][q.correctIndex];
    }
    
    // Add explanation text from legal excerpts
    explanationText.textContent = q.excerpt;
    explanationCard.classList.remove('hidden');

    // Fade out other non-selected, non-correct option buttons
    updatedButtons.forEach((btn, idx) => {
      if (idx !== selectedIndex && idx !== q.correctIndex) {
        btn.classList.add('fade-out');
      }
    });

    // Record answer state
    userAnswers.push({
      question: q,
      selectedOptionIndex: selectedIndex,
      isCorrect: isCorrect
    });
    
    // Enable Next Question Button
    nextBtn.classList.remove('hidden');
    nextBtn.disabled = false;

    // Smoothly scroll back to the top of the quiz card to display feedback and next button
    setTimeout(() => {
      quizScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function handleNext() {
    currentQuestionIndex++;
    if (currentQuestionIndex < 10) {
      updateProgress();
      loadQuestion();
    } else {
      endQuiz();
    }
  }

  function updateProgress() {
    questionCounter.textContent = `เลเวล ${currentLevel} - ข้อที่ ${currentQuestionIndex + 1} จาก 10`;
    scoreCounter.textContent = `คะแนน: ${score}`;
    
    const percentage = ((currentQuestionIndex + 1) / 10) * 100;
    progressBarFill.style.width = `${percentage}%`;
  }

  function endQuiz() {
    // Increment rounds played
    roundsPlayed++;
    localStorage.setItem('narit_rounds_played', roundsPlayed);

    // Hide quiz screen, show results
    quizScreen.classList.remove('active');
    resultsScreen.classList.add('active');
    
    // Set score overlay text
    finalScoreText.textContent = `${score}/10`;
    
    // Draw SVG Circle Dash Progress
    // Circumference = 2 * PI * r = 2 * 3.14159 * 40 = 251.2
    const circumference = 251.2;
    const strokeDashoffset = circumference - (score / 10) * circumference;
    
    // Reset and trigger smooth animation
    circleFill.style.strokeDashoffset = circumference;
    setTimeout(() => {
      circleFill.style.strokeDashoffset = strokeDashoffset;
    }, 100);
    
    // Configure Message based on Performance
    if (score === 10) {
      resultMessageTitle.textContent = `ยินดีด้วย! ผ่านเลเวล ${currentLevel} แล้ว 🎉`;
      resultMessageDesc.textContent = `คุณทำคะแนนได้เต็ม 10/10 ในที่สุด! ปลดล็อกเลเวลถัดไป (เลเวล ${currentLevel + 1}) สำเร็จแล้ว`;
      
      // Configure Buttons for Success
      if (nextLevelBtn) {
        nextLevelBtn.textContent = `ไปต่อเลเวล ${currentLevel + 1}`;
        nextLevelBtn.classList.remove('hidden');
      }
      if (restartBtn) {
        restartBtn.textContent = `ทำเลเวล ${currentLevel} ซ้ำ`;
      }
    } else {
      resultMessageTitle.textContent = 'ไม่ผ่านเลเวล! ❌';
      resultMessageDesc.textContent = `คุณได้คะแนน ${score}/10 ในโหมดเลเวลนี้ คุณต้องตอบถูกครบทุกข้อ (10/10 คะแนน) เพื่อผ่านด่าน ลองกดลองใหม่อีกครั้งเพื่อสุ่มคำถามชุดใหม่มาตอบกันครับ`;
      
      // Configure Buttons for Failure
      if (nextLevelBtn) {
        nextLevelBtn.classList.add('hidden');
      }
      if (restartBtn) {
        restartBtn.textContent = 'ลองใหม่อีกครั้ง';
      }
    }

    // Handle Review Section Configuration
    const wrongAnswers = userAnswers.filter(ans => !ans.isCorrect);
    
    if (wrongAnswers.length > 0) {
      viewReviewBtn.classList.remove('hidden');
      buildReviewList(wrongAnswers);
    } else {
      viewReviewBtn.classList.add('hidden');
      reviewSection.classList.add('hidden');
    }

    // Update the deck progress UI at the end of the round
    updateDeckProgressUI();

    // Scroll to results summary
    resultsScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildReviewList(wrongAnswers) {
    reviewListContainer.innerHTML = '';
    
    wrongAnswers.forEach((ans, idx) => {
      const q = ans.question;
      const labels = ['ก', 'ข', 'ค', 'ง'];
      
      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div class="review-card-header">
          <span class="review-question-num">ข้อผิดพลาดที่ ${idx + 1}</span>
          <h4 class="review-question-text">${q.question}</h4>
        </div>
        
        <div class="review-options-summary">
          <div class="review-ans-item">
            <span class="review-badge user-wrong">คำตอบของคุณ:</span>
            <span class="review-ans-text"><strong>${labels[ans.selectedOptionIndex]}.</strong> ${q.options[ans.selectedOptionIndex]}</span>
          </div>
          <div class="review-ans-item" style="margin-top: 6px;">
            <span class="review-badge correct-ans">คำตอบที่ถูก:</span>
            <span class="review-ans-text"><strong>${labels[q.correctIndex]}.</strong> ${q.options[q.correctIndex]}</span>
          </div>
        </div>
        
        <div class="explanation-card" style="margin-top: 0; background-color: var(--color-blue-bg); border-color: var(--color-blue-border); color: var(--color-blue-text);">
          <div class="explanation-header">
            <span>📖</span>
            <h5 style="font-size: 0.85rem; font-weight: 600;">บทบัญญัติตามกฎหมาย:</h5>
          </div>
          <p style="font-size: 0.85rem; line-height: 1.5;">${q.excerpt}</p>
        </div>
      `;
      reviewListContainer.appendChild(card);
    });
  }

  function scrollToReview() {
    reviewSection.classList.remove('hidden');
    reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startNextLevel() {
    currentLevel++;
    localStorage.setItem('narit_current_level', currentLevel);
    startQuiz();
  }

  // Initial UI updates on page load
  updateDeckProgressUI();
});
