/**
 * Quiz Frontend Application
 * 
 * Clean Code Principles:
 * - Single Responsibility: Each function has one clear purpose
 * - DRY (Don't Repeat Yourself): Reusable utility functions
 * - Separation of Concerns: UI, API, state management separated
 * - Error Handling: Comprehensive error handling throughout
 * - Readability: Clear naming, comments, and structure
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const API_URL = ".";
const QUIZ_ENDPOINTS = {
  QUESTIONS: "/api/quiz/questions",
  SUBMIT: "/api/quiz/submit",
  PROFILE: "/api/quiz/profile",
};

const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple_choice",
  SCALE: "scale",
  YES_NO: "yes_no",
};

const TRIP_PACES = {
  SLOW: "slow",
  BALANCED: "balanced",
  PACKED: "packed",
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  questions: [],
  responses: {},
  currentQuestionIndex: 0,
  isSubmitting: false,
};

// ============================================================================
// API SERVICE LAYER (Separation of Concerns)
// ============================================================================

/**
 * Fetches quiz questions from API
 * @returns {Promise<Array>} Array of quiz questions
 * @throws {Error} If API call fails
 */
async function fetchQuestions() {
  const response = await fetch(`${API_URL}${QUIZ_ENDPOINTS.QUESTIONS}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to load questions (${response.status})`
    );
  }

  const data = await response.json();

  if (!data.questions || !Array.isArray(data.questions)) {
    throw new Error("Invalid response format from server");
  }

  return data.questions.sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Fetches user's personality profile from API
 * @returns {Promise<Object|null>} Profile data or null if not found
 * @throws {Error} If API call fails
 */
async function fetchUserProfile() {
  try {
    const response = await fetch(`${API_URL}${QUIZ_ENDPOINTS.PROFILE}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      // If 404 or no profile, return null instead of throwing
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch profile (${response.status})`
      );
    }

    const data = await response.json();
    // Return null if no profile exists (API returns { profile: null })
    return data.profile || null;
  } catch (error) {
    // If it's a network error or the profile doesn't exist, return null
    console.warn("Could not fetch user profile:", error);
    return null;
  }
}

/**
 * Submits quiz responses to API
 * @param {Array} responses - Formatted responses array
 * @returns {Promise<Object>} Profile data from server
 * @throws {Error} If API call fails
 */
async function submitQuizResponses(responses) {
  const response = await fetch(`${API_URL}${QUIZ_ENDPOINTS.SUBMIT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ responses }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to submit quiz (${response.status})`);
  }

  const data = await response.json();
  return data.profile;
}

// ============================================================================
// VALIDATION LAYER
// ============================================================================

/**
 * Validates that all questions are answered
 * @returns {Array} Array of unanswered question IDs
 */
function getUnansweredQuestions() {
  return state.questions.filter(
    (q) => !state.responses[q.id] || state.responses[q.id].trim() === ""
  );
}

/**
 * Checks if quiz is ready to submit
 * @returns {boolean} True if all questions are answered
 */
function isQuizComplete() {
  return getUnansweredQuestions().length === 0;
}

// ============================================================================
// UI RENDERING LAYER (Single Responsibility)
// ============================================================================

/**
 * Renders the current question
 */
function renderQuestion() {
  if (state.questions.length === 0) return;

  const question = state.questions[state.currentQuestionIndex];
  const container = document.getElementById("questionsContainer");
  container.innerHTML = "";

  const questionDiv = document.createElement("div");
  questionDiv.className = "question-container active";
  questionDiv.id = `question-${question.id}`;

  const title = document.createElement("h2");
  title.className = "question-title";
  title.textContent = question.questionText;
  questionDiv.appendChild(title);

  const optionsContainer = document.createElement("div");
  optionsContainer.className = "question-options";

  renderQuestionOptions(question, optionsContainer);

  questionDiv.appendChild(optionsContainer);
  container.appendChild(questionDiv);

  updateNavigationButtons();
}

/**
 * Renders question options based on question type
 * @param {Object} question - Question object
 * @param {HTMLElement} container - Container element
 */
function renderQuestionOptions(question, container) {
  switch (question.questionType) {
    case QUESTION_TYPES.MULTIPLE_CHOICE:
      renderMultipleChoice(question, container);
      break;
    case QUESTION_TYPES.SCALE:
      renderScale(question, container);
      break;
    case QUESTION_TYPES.YES_NO:
      renderYesNo(question, container);
      break;
    default:
      console.error(`Unknown question type: ${question.questionType}`);
  }
}

/**
 * Renders multiple choice question options
 * @param {Object} question - Question object
 * @param {HTMLElement} container - Container element
 */
function renderMultipleChoice(question, container) {
  const options = question.options || [];

  options.forEach((option) => {
    const button = createOptionButton(option, () => {
      state.responses[question.id] = option;
      updateNavigationButtons();
    });

    if (state.responses[question.id] === option) {
      button.classList.add("selected");
    }

    container.appendChild(button);
  });
}

/**
 * Renders scale question (1-5)
 * @param {Object} question - Question object
 * @param {HTMLElement} container - Container element
 */
function renderScale(question, container) {
  container.className = "scale-container";
  
  // Create wrapper for scale with labels
  const scaleWrapper = document.createElement("div");
  scaleWrapper.className = "scale-wrapper";

  // Add low label
  const lowLabel = document.createElement("span");
  lowLabel.className = "scale-label scale-label-low";
  lowLabel.textContent = "Lower";
  scaleWrapper.appendChild(lowLabel);

  // Create scale buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "scale-buttons-container";

  for (let i = 1; i <= 5; i++) {
    const button = createScaleButton(i, () => {
      state.responses[question.id] = i.toString();
      updateNavigationButtons();
    });

    if (state.responses[question.id] === i.toString()) {
      button.classList.add("selected");
    }

    buttonsContainer.appendChild(button);
  }

  scaleWrapper.appendChild(buttonsContainer);

  // Add high label
  const highLabel = document.createElement("span");
  highLabel.className = "scale-label scale-label-high";
  highLabel.textContent = "Higher";
  scaleWrapper.appendChild(highLabel);

  container.appendChild(scaleWrapper);
}

/**
 * Renders yes/no question options
 * @param {Object} question - Question object
 * @param {HTMLElement} container - Container element
 */
function renderYesNo(question, container) {
  container.className = "yes-no-container";

  const yesButton = createYesNoButton("Yes", () => {
    state.responses[question.id] = "yes";
    updateNavigationButtons();
  });

  const noButton = createYesNoButton("No", () => {
    state.responses[question.id] = "no";
    updateNavigationButtons();
  });

  if (state.responses[question.id] === "yes") {
    yesButton.classList.add("selected");
  } else if (state.responses[question.id] === "no") {
    noButton.classList.add("selected");
  }

  container.appendChild(yesButton);
  container.appendChild(noButton);
}

/**
 * Creates a reusable option button
 * @param {string} text - Button text
 * @param {Function} onClick - Click handler
 * @returns {HTMLElement} Button element
 */
function createOptionButton(text, onClick) {
  const button = document.createElement("button");
  button.className = "option-button";
  button.textContent = text;
  button.type = "button";
  button.addEventListener("click", () => {
    document
      .querySelectorAll(".option-button")
      .forEach((btn) => btn.classList.remove("selected"));
    button.classList.add("selected");
    onClick();
  });
  return button;
}

/**
 * Creates a scale button
 * @param {number} value - Scale value (1-5)
 * @param {Function} onClick - Click handler
 * @returns {HTMLElement} Button element
 */
function createScaleButton(value, onClick) {
  const button = document.createElement("button");
  button.className = "scale-button";
  button.textContent = value;
  button.type = "button";
  button.addEventListener("click", () => {
    document
      .querySelectorAll(".scale-button")
      .forEach((btn) => btn.classList.remove("selected"));
    button.classList.add("selected");
    onClick();
  });
  return button;
}

/**
 * Creates a yes/no button
 * @param {string} text - Button text ("Yes" or "No")
 * @param {Function} onClick - Click handler
 * @returns {HTMLElement} Button element
 */
function createYesNoButton(text, onClick) {
  const button = document.createElement("button");
  button.className = "yes-no-button";
  button.textContent = text;
  button.type = "button";
  button.addEventListener("click", () => {
    document
      .querySelectorAll(".yes-no-button")
      .forEach((btn) => btn.classList.remove("selected"));
    button.classList.add("selected");
    onClick();
  });
  return button;
}

/**
 * Updates progress bar and text
 */
function updateProgress() {
  const progress = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;
  document.getElementById("progressFill").style.width = `${progress}%`;
  document.getElementById(
    "progressText"
  ).textContent = `Question ${state.currentQuestionIndex + 1} of ${state.questions.length}`;
}

/**
 * Updates navigation buttons state
 */
function updateNavigationButtons() {
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");
  const submitButton = document.getElementById("submitButton");

  const currentQuestion = state.questions[state.currentQuestionIndex];
  const isAnswered = currentQuestion && state.responses[currentQuestion.id] !== undefined;

  prevButton.disabled = state.currentQuestionIndex === 0;

  if (state.currentQuestionIndex === state.questions.length - 1) {
    nextButton.style.display = "none";
    submitButton.style.display = "block";
    submitButton.disabled = !isAnswered || state.isSubmitting;
  } else {
    nextButton.style.display = "block";
    submitButton.style.display = "none";
    nextButton.disabled = !isAnswered;
  }
}

/**
 * Shows quiz results
 * @param {Object} profile - User's personality profile
 */
function showResults(profile) {
  hideLoading();
  document.getElementById("quizContainer").style.display = "none";
  document.getElementById("resultsContainer").classList.add("active");

  renderPersonaInfo(profile);
  renderInsights(profile);
  renderScores(profile);
}

/**
 * Renders persona information
 * @param {Object} profile - User's personality profile
 */
function renderPersonaInfo(profile) {
  // Use personaDescription from profile if available, otherwise try persona.description
  const description = profile.personaDescription || 
                     (profile.persona && profile.persona.description) || 
                     "You enjoy a bit of everything in your travels.";
  
  if (profile.persona) {
    document.getElementById("personaName").textContent = profile.persona.name;
    document.getElementById("personaArchetype").textContent =
      profile.persona.archetype.replace(/_/g, " ").toUpperCase();
    document.getElementById("personaDescription").textContent = description;

    const traitsContainer = document.getElementById("personaTraits");
    traitsContainer.innerHTML = "";
    const traits = Array.isArray(profile.persona.traits)
      ? profile.persona.traits
      : JSON.parse(profile.persona.traits || "[]");

    traits.forEach((trait) => {
      const badge = document.createElement("span");
      badge.className = "trait-badge";
      badge.textContent = trait;
      traitsContainer.appendChild(badge);
    });
  } else {
    // Fallback when no persona is assigned
    document.getElementById("personaName").textContent = "Balanced Traveler";
    document.getElementById("personaArchetype").textContent = "BALANCED";
    document.getElementById("personaDescription").textContent = description;
  }
}

/**
 * Renders AI-generated insights
 * @param {Object} profile - User's personality profile
 */
function renderInsights(profile) {
  const insightsText = document.getElementById("insightsText");
  if (profile.openaiInsights) {
    insightsText.textContent = profile.openaiInsights;
  } else {
    insightsText.textContent =
      "Your travel personality has been analyzed. Explore your dashboard to see personalized recommendations.";
  }
}

/**
 * Renders personality scores
 * @param {Object} profile - User's personality profile
 */
function renderScores(profile) {
  const scoresList = document.getElementById("scoresList");
  scoresList.innerHTML = "";

  const scoreCategories = [
    { key: "adventurerScore", label: "Adventurer" },
    { key: "foodieScore", label: "Foodie" },
    { key: "cultureScore", label: "Culture" },
    { key: "nightOwlScore", label: "Night Owl" },
    { key: "natureScore", label: "Nature" },
    { key: "shopaholicScore", label: "Shopping" },
    { key: "budgetScore", label: "Budget Conscious" },
  ];

  scoreCategories.forEach((category) => {
    const scoreItem = createScoreItem(category, profile[category.key] || 0);
    scoresList.appendChild(scoreItem);
  });
}

/**
 * Creates a score item element
 * @param {Object} category - Category info
 * @param {number} score - Score value
 * @returns {HTMLElement} Score item element
 */
function createScoreItem(category, score) {
  const scoreItem = document.createElement("div");
  scoreItem.className = "score-item";

  const label = document.createElement("div");
  label.className = "score-label";
  label.textContent = category.label;

  const barContainer = document.createElement("div");
  barContainer.className = "score-bar-container";

  const bar = document.createElement("div");
  bar.className = "score-bar";
  bar.style.width = `${score}%`;
  barContainer.appendChild(bar);

  const value = document.createElement("div");
  value.className = "score-value";
  value.textContent = `${score}/100`;

  scoreItem.appendChild(label);
  scoreItem.appendChild(barContainer);
  scoreItem.appendChild(value);

  return scoreItem;
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

/**
 * Shows loading state
 */
function showLoading() {
  document.getElementById("quizContainer").style.display = "none";
  document.getElementById("loadingContainer").style.display = "block";
  document.getElementById("resultsContainer").classList.remove("active");
}

/**
 * Hides loading state
 */
function hideLoading() {
  document.getElementById("loadingContainer").style.display = "none";
}

/**
 * Shows error message
 * @param {string} message - Error message
 */
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";

  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

// ============================================================================
// NAVIGATION HANDLERS
// ============================================================================

/**
 * Navigates to next question
 */
function nextQuestion() {
  if (state.currentQuestionIndex < state.questions.length - 1) {
    state.currentQuestionIndex++;
    renderQuestion();
    updateProgress();
  }
}

/**
 * Navigates to previous question
 */
function previousQuestion() {
  if (state.currentQuestionIndex > 0) {
    state.currentQuestionIndex--;
    renderQuestion();
    updateProgress();
  }
}

/**
 * Resets quiz state for retake
 */
function resetQuiz() {
  state.responses = {};
  state.currentQuestionIndex = 0;
  state.isSubmitting = false;

  document.getElementById("quizContainer").style.display = "block";
  document.getElementById("resultsContainer").classList.remove("active");
  hideLoading();

  renderQuestion();
  updateProgress();
}

// ============================================================================
// BUSINESS LOGIC LAYER
// ============================================================================

/**
 * Loads quiz questions from API
 */
async function loadQuestions() {
  try {
    state.questions = await fetchQuestions();

    if (state.questions.length === 0) {
      showError("No questions available. Please try again later.");
      return;
    }

    renderQuestion();
    updateProgress();
  } catch (error) {
    console.error("Error loading questions:", error);
    showError(
      error.message || "Failed to load quiz questions. Please refresh the page."
    );
  }
}

/**
 * Submits quiz responses
 */
async function submitQuiz() {
  if (state.isSubmitting) return;

  const unansweredQuestions = getUnansweredQuestions();
  if (unansweredQuestions.length > 0) {
    showError("Please answer all questions before submitting.");
    return;
  }

  state.isSubmitting = true;
  showLoading();

  try {
    const formattedResponses = state.questions.map((q) => ({
      questionId: q.id,
      answer: state.responses[q.id],
    }));

    const profile = await submitQuizResponses(formattedResponses);
    showResults(profile);
  } catch (error) {
    console.error("Error submitting quiz:", error);
    showError(error.message || "Failed to submit quiz. Please try again.");
    hideLoading();
  } finally {
    state.isSubmitting = false;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes event listeners
 */
function initializeEventListeners() {
  document
    .getElementById("prevButton")
    .addEventListener("click", previousQuestion);
  document.getElementById("nextButton").addEventListener("click", nextQuestion);
  document
    .getElementById("submitButton")
    .addEventListener("click", submitQuiz);
  document
    .getElementById("retakeButton")
    .addEventListener("click", resetQuiz);
}

/**
 * Checks if user has existing quiz results and displays them
 */
async function checkExistingResults() {
  try {
    const profile = await fetchUserProfile();
    console.log("Profile check result:", profile);
    
    // Check if profile exists and has completed quiz data
    // A profile is considered complete if it has:
    // - A personaId or persona (matched persona)
    // - OR any personality scores (adventurerScore, foodieScore, etc.)
    // - OR lastQuizCompletedAt timestamp
    if (profile) {
      const hasPersona = profile.personaId || profile.persona;
      const hasScores = profile.adventurerScore !== null || 
                       profile.foodieScore !== null || 
                       profile.cultureScore !== null;
      const hasCompletionDate = profile.lastQuizCompletedAt;
      
      if (hasPersona || hasScores || hasCompletionDate) {
        console.log("User has existing profile, showing results");
        // User has taken the quiz - show results with option to retake
        showResults(profile);
        // Hide quiz container, show results
        document.getElementById("quizContainer").style.display = "none";
        document.getElementById("resultsContainer").classList.add("active");
        hideError();
        return true;
      }
    }
    
    console.log("No existing profile found, showing quiz form");
    return false;
  } catch (error) {
    console.error("Error checking existing results:", error);
    return false;
  }
}

/**
 * Initializes the quiz application
 */
async function initialize() {
  initializeEventListeners();
  
  // Check if user has existing results first
  const hasResults = await checkExistingResults();
  
  // Only load questions if user hasn't taken the quiz yet
  if (!hasResults) {
    await loadQuestions();
  }
}

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", initialize);
