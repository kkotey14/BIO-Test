(function () {
  const questions = Array.isArray(window.quizQuestions) ? window.quizQuestions : [];
  const parts = [
    {
      id: "part-1",
      title: "Part 1",
      chapterStart: 1,
      chapterEnd: 4,
    },
    {
      id: "part-2",
      title: "Part 2",
      chapterStart: 5,
      chapterEnd: 9,
    },
  ].map((part) => ({
    ...part,
    questions: questions.filter(
      (question) =>
        question.chapter >= part.chapterStart && question.chapter <= part.chapterEnd,
    ),
  }));

  const state = {
    index: 0,
    partIndex: 0,
    selected: null,
    timerId: null,
  };

  const quizCard = document.getElementById("quizCard");
  const progressText = document.getElementById("progressText");
  const scoreText = document.getElementById("scoreText");
  const progressFill = document.getElementById("progressFill");

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getCurrentPart() {
    return parts[state.partIndex];
  }

  function getCurrentQuestions() {
    return getCurrentPart()?.questions ?? [];
  }

  function getCurrentQuestion() {
    return getCurrentQuestions()[state.index];
  }

  function getQuestionStats(questionList) {
    const stats = {
      total: questionList.length,
      answered: 0,
      skipped: 0,
      correct: 0,
    };

    for (const question of questionList) {
      if (Object.hasOwn(question, "wasCorrect")) {
        stats.answered += 1;
        if (question.wasCorrect) {
          stats.correct += 1;
        }
      }

      if (question.wasSkipped) {
        stats.skipped += 1;
      }
    }

    return stats;
  }

  function getChapterStats(questionList) {
    const chapters = new Map();

    for (const question of questionList) {
      if (!chapters.has(question.chapter)) {
        chapters.set(question.chapter, {
          total: 0,
          correct: 0,
        });
      }

      const chapterStats = chapters.get(question.chapter);
      chapterStats.total += 1;

      if (question.wasCorrect) {
        chapterStats.correct += 1;
      }
    }

    return [...chapters.entries()];
  }

  function updateHeader() {
    const currentPart = getCurrentPart();
    const currentQuestions = getCurrentQuestions();
    const completed = Math.min(state.index, currentQuestions.length);
    const progress = currentQuestions.length
      ? Math.round((completed / currentQuestions.length) * 100)
      : 0;
    const partStats = getQuestionStats(currentQuestions);

    progressText.textContent =
      state.index < currentQuestions.length
        ? `${currentPart.title} • Question ${state.index + 1} of ${currentQuestions.length}`
        : `${currentPart.title} complete • ${currentQuestions.length} of ${currentQuestions.length}`;
    scoreText.textContent = `${partStats.correct} / ${partStats.answered}`;
    progressFill.style.width = `${progress}%`;
  }

  function getExplanation(question) {
    if (question.type === "true-false") {
      return question.answer === "A"
        ? "This statement is true according to the chapter answer key."
        : "This statement is false according to the chapter answer key.";
    }

    return `The correct answer is ${question.answer}: ${question.options[question.answer]}`;
  }

  function buildSummaryCards(questionList) {
    return getChapterStats(questionList)
      .map(
        ([chapter, data]) => `
          <article class="summary-card">
            <h3>Chapter ${chapter}</h3>
            <p>${data.correct} correct out of ${data.total}</p>
          </article>
        `,
      )
      .join("");
  }

  function renderPartCompletion() {
    updateHeader();

    const currentPart = getCurrentPart();
    const currentQuestions = getCurrentQuestions();
    const partStats = getQuestionStats(currentQuestions);
    const percentage = partStats.answered
      ? Math.round((partStats.correct / partStats.answered) * 100)
      : 0;
    const skippedSummary =
      partStats.skipped > 0
        ? `<p><strong>Skipped:</strong> ${partStats.skipped}</p>`
        : "";
    const nextPart = parts[state.partIndex + 1];
    const nextButton = nextPart
      ? `<button class="primary-button" id="continueButton" type="button">Continue to ${nextPart.title}</button>`
      : "";

    quizCard.innerHTML = `
      <section class="finish">
        <h2>${currentPart.title} complete</h2>
        <p>You finished ${currentPart.title.toLowerCase()} covering Chapters ${currentPart.chapterStart} to ${currentPart.chapterEnd}.</p>
        <p><strong>Part score:</strong> ${partStats.correct} / ${partStats.answered} answered (${percentage}%)</p>
        ${skippedSummary}
        <section class="summary-grid">
          ${buildSummaryCards(currentQuestions)}
        </section>
        <div class="button-row">
          ${nextButton}
          <button class="secondary-button" id="restartButton" type="button">Start again</button>
        </div>
      </section>
    `;

    if (nextPart) {
      document.getElementById("continueButton").addEventListener("click", startNextPart);
    }

    document.getElementById("restartButton").addEventListener("click", restartQuiz);
  }

  function renderFinalCompletion() {
    updateHeader();

    const overallStats = getQuestionStats(questions);
    const percentage = overallStats.answered
      ? Math.round((overallStats.correct / overallStats.answered) * 100)
      : 0;
    const skippedSummary =
      overallStats.skipped > 0
        ? `<p><strong>Skipped:</strong> ${overallStats.skipped}</p>`
        : "";
    const partCards = parts
      .map((part) => {
        const partStats = getQuestionStats(part.questions);
        return `
          <article class="summary-card">
            <h3>${part.title}</h3>
            <p>Chapters ${part.chapterStart} to ${part.chapterEnd}</p>
            <p>${partStats.correct} correct out of ${partStats.total}</p>
          </article>
        `;
      })
      .join("");

    quizCard.innerHTML = `
      <section class="finish">
        <h2>Quiz complete</h2>
        <p>You finished both parts across Chapters 1 to 9.</p>
        <p><strong>Final score:</strong> ${overallStats.correct} / ${overallStats.answered} answered (${percentage}%)</p>
        ${skippedSummary}
        <section class="summary-grid">
          ${partCards}
        </section>
        <section class="summary-grid">
          ${buildSummaryCards(questions)}
        </section>
        <button class="primary-button" id="restartButton" type="button">Start again</button>
      </section>
    `;

    document.getElementById("restartButton").addEventListener("click", restartQuiz);
  }

  function renderCompletion() {
    if (state.partIndex < parts.length - 1) {
      renderPartCompletion();
      return;
    }

    renderFinalCompletion();
  }

  function renderQuestion() {
    clearTimeout(state.timerId);
    updateHeader();

    const currentPart = getCurrentPart();
    const question = getCurrentQuestion();

    if (!question) {
      renderCompletion();
      return;
    }

    const partStats = getQuestionStats(currentPart.questions);
    const choices = Object.entries(question.options)
      .map(([key, label]) => {
        let className = "option-button";

        if (state.selected) {
          if (key === question.answer) {
            className += " correct";
          } else if (key === state.selected) {
            className += " incorrect";
          }
        }

        return `
          <button
            class="${className}"
            type="button"
            data-choice="${key}"
            ${state.selected ? "disabled" : ""}
          >
            <strong>${key}</strong>
            <span>${escapeHtml(label)}</span>
          </button>
        `;
      })
      .join("");

    const feedbackMarkup = state.selected
      ? `
          <section class="feedback ${state.selected === question.answer ? "correct" : "incorrect"}">
            <p class="feedback-title">
              ${state.selected === question.answer ? "Correct" : "Incorrect"}
            </p>
            <p class="feedback-copy">${escapeHtml(getExplanation(question))}</p>
            <p class="feedback-score">Part score: ${partStats.correct} / ${partStats.answered}</p>
          </section>
        `
      : "";

    quizCard.innerHTML = `
      <section>
        <div class="question-meta">
          <span>${currentPart.title}</span>
          <span>Chapter ${question.chapter}</span>
          <span>${question.label}</span>
          <span>${question.type === "true-false" ? "True/False" : "Multiple Choice"}</span>
        </div>
        <p class="question-text">${escapeHtml(question.prompt)}</p>
        <div class="options">${choices}</div>
        <div class="question-actions">
          <button class="skip-button" id="skipButton" type="button" ${state.selected ? "disabled" : ""}>
            Skip question
          </button>
        </div>
        ${feedbackMarkup}
      </section>
    `;

    quizCard.querySelectorAll("[data-choice]").forEach((button) => {
      button.addEventListener("click", () => submitAnswer(button.dataset.choice));
    });

    document.getElementById("skipButton").addEventListener("click", skipQuestion);
  }

  function submitAnswer(choice) {
    const question = getCurrentQuestion();

    if (!question || state.selected) {
      return;
    }

    state.selected = choice;
    delete question.wasSkipped;
    question.wasCorrect = choice === question.answer;

    renderQuestion();

    state.timerId = window.setTimeout(() => {
      goToNextQuestion();
    }, 2200);
  }

  function goToNextQuestion() {
    state.index += 1;
    state.selected = null;
    renderQuestion();
  }

  function skipQuestion() {
    const question = getCurrentQuestion();

    if (!question || state.selected) {
      return;
    }

    delete question.wasCorrect;
    question.wasSkipped = true;
    goToNextQuestion();
  }

  function startNextPart() {
    clearTimeout(state.timerId);
    state.partIndex += 1;
    state.index = 0;
    state.selected = null;
    state.timerId = null;
    renderQuestion();
  }

  function restartQuiz() {
    clearTimeout(state.timerId);

    for (const question of questions) {
      delete question.wasCorrect;
      delete question.wasSkipped;
    }

    state.index = 0;
    state.partIndex = 0;
    state.selected = null;
    state.timerId = null;

    renderQuestion();
  }

  if (!questions.length) {
    quizCard.innerHTML = `
      <p class="loading">No questions were loaded. Check <code>questions.js</code>.</p>
    `;
    return;
  }

  renderQuestion();
})();
