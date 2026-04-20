(function () {
  const questions = Array.isArray(window.quizQuestions) ? window.quizQuestions : [];

  const state = {
    index: 0,
    score: 0,
    answered: 0,
    skipped: 0,
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

  function getCurrentQuestion() {
    return questions[state.index];
  }

  function updateHeader() {
    const completed = Math.min(state.index, questions.length);
    const progress = questions.length
      ? Math.round((completed / questions.length) * 100)
      : 0;

    progressText.textContent =
      state.index < questions.length
        ? `Question ${state.index + 1} of ${questions.length}`
        : `Completed ${questions.length} of ${questions.length}`;
    scoreText.textContent = `${state.score} / ${state.answered}`;
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

  function getChapterStats() {
    const chapters = new Map();

    for (const question of questions) {
      if (!chapters.has(question.chapter)) {
        chapters.set(question.chapter, {
          total: 0,
          correct: 0,
        });
      }

      chapters.get(question.chapter).total += 1;
    }

    for (let i = 0; i < state.index; i += 1) {
      const question = questions[i];
      if (question.wasCorrect) {
        chapters.get(question.chapter).correct += 1;
      }
    }

    return [...chapters.entries()];
  }

  function renderCompletion() {
    updateHeader();

    const summaryCards = getChapterStats()
      .map(
        ([chapter, data]) => `
          <article class="summary-card">
            <h3>Chapter ${chapter}</h3>
            <p>${data.correct} correct out of ${data.total}</p>
          </article>
        `
      )
      .join("");

    const percentage = state.answered
      ? Math.round((state.score / state.answered) * 100)
      : 0;
    const skippedSummary =
      state.skipped > 0
        ? `<p><strong>Skipped:</strong> ${state.skipped}</p>`
        : "";

    quizCard.innerHTML = `
      <section class="finish">
        <h2>Quiz complete</h2>
        <p>You finished all ${questions.length} questions from pages 260 to 332.</p>
        <p><strong>Final score:</strong> ${state.score} / ${state.answered} answered (${percentage}%)</p>
        ${skippedSummary}
        <section class="summary-grid">
          ${summaryCards}
        </section>
        <button class="primary-button" id="restartButton" type="button">Start again</button>
      </section>
    `;

    document.getElementById("restartButton").addEventListener("click", restartQuiz);
  }

  function renderQuestion() {
    clearTimeout(state.timerId);
    updateHeader();

    const question = getCurrentQuestion();

    if (!question) {
      renderCompletion();
      return;
    }

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
            <p class="feedback-score">Score: ${state.score} / ${state.answered}</p>
          </section>
        `
      : "";

    const imageMarkup = question.image
      ? `
          <figure class="figure-wrap">
            <img src="${escapeHtml(question.image)}" alt="${escapeHtml(question.imageAlt)}" />
            <figcaption class="figure-caption">${escapeHtml(question.imageAlt)}</figcaption>
          </figure>
        `
      : "";

    quizCard.innerHTML = `
      <section>
        <div class="question-meta">
          <span>Chapter ${question.chapter}</span>
          <span>${question.label}</span>
          <span>${question.type === "true-false" ? "True/False" : "Multiple Choice"}</span>
        </div>
        <p class="question-text">${escapeHtml(question.prompt)}</p>
        ${imageMarkup}
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
    state.answered += 1;

    const wasCorrect = choice === question.answer;
    question.wasCorrect = wasCorrect;

    if (wasCorrect) {
      state.score += 1;
    }

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

    question.wasSkipped = true;
    state.skipped += 1;
    goToNextQuestion();
  }

  function restartQuiz() {
    clearTimeout(state.timerId);

    for (const question of questions) {
      delete question.wasCorrect;
      delete question.wasSkipped;
    }

    state.index = 0;
    state.score = 0;
    state.answered = 0;
    state.skipped = 0;
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
