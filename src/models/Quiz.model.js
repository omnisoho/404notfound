/**
 * Quiz Model - Repository Pattern
 * 
 * Follows SOLID Principles:
 * - Single Responsibility: Each function handles one specific data operation
 * - Open/Closed: Easy to extend with new quiz features without modifying existing code
 * - Liskov Substitution: All functions return consistent data structures
 * - Interface Segregation: Specific functions for specific use cases
 * - Dependency Inversion: Depends on abstractions (errorHandler, OpenAI service)
 */

const prisma = require("./prismaClient");
const {
  ValidationError,
  NotFoundError,
  withErrorHandling,
} = require("../utils/errorHandler");
const { matchPersonaWithOpenAI: matchPersonaWithOpenAIService } = require("../services/openai/quizService");

// ============================================================================
// VALIDATION FUNCTIONS (Single Responsibility)
// ============================================================================

/**
 * Validates quiz response structure
 * @param {Array} responses - Responses to validate
 * @throws {ValidationError} If validation fails
 */
function validateResponses(responses) {
  if (!responses || !Array.isArray(responses) || responses.length === 0) {
    throw ValidationError.invalidInput("Responses array is required");
  }

  for (const response of responses) {
    if (!response.questionId || response.answer === undefined) {
      throw ValidationError.invalidInput(
        "Each response must have questionId and answer"
      );
    }
  }
}

/**
 * Validates personality scores
 * @param {Object} scores - Scores object to validate
 * @throws {ValidationError} If validation fails
 */
function validateScores(scores) {
  const requiredScores = [
    "adventurerScore",
    "foodieScore",
    "cultureScore",
    "nightOwlScore",
    "natureScore",
    "shopaholicScore",
    "budgetScore",
  ];

  for (const scoreKey of requiredScores) {
    if (
      scores[scoreKey] === undefined ||
      typeof scores[scoreKey] !== "number"
    ) {
      throw ValidationError.invalidInput(`Missing or invalid ${scoreKey}`);
    }
  }
}

/**
 * Validates trip pace value
 * @param {string} tripPace - Trip pace to validate
 * @throws {ValidationError} If validation fails
 */
function validateTripPace(tripPace) {
  const validTripPaces = ["slow", "balanced", "packed"];
  if (!tripPace || !validTripPaces.includes(tripPace)) {
    throw ValidationError.invalidInput(
      `preferredTripPace must be one of: ${validTripPaces.join(", ")}`
    );
  }
}

// ============================================================================
// DATA ACCESS LAYER (Repository Pattern)
// ============================================================================

/**
 * Gets all quiz questions ordered by orderIndex
 * @returns {Promise<Array>} Array of quiz questions
 * @throws {AppError} If query fails
 */
module.exports.getAllQuestions = withErrorHandling(
  async function getAllQuestions() {
    // Safety check: ensure Prisma client is initialized
    if (!prisma || !prisma.quizQuestion) {
      throw new Error(
        "Prisma client not properly initialized. Please restart the server."
      );
    }

    const questions = await prisma.quizQuestion.findMany({
      orderBy: {
        orderIndex: "asc",
      },
    });

    return questions;
  },
  { operation: "get all questions", entity: "quiz" }
);

/**
 * Gets all personas
 * @returns {Promise<Array>} Array of personas
 * @throws {AppError} If query fails
 */
module.exports.getAllPersonas = withErrorHandling(
  async function getAllPersonas() {
    // Safety check: ensure Prisma client is initialized
    if (!prisma || !prisma.persona) {
      throw new Error(
        "Prisma client not properly initialized. Please restart the server."
      );
    }

    const personas = await prisma.persona.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return personas;
  },
  { operation: "get all personas", entity: "quiz" }
);

/**
 * Gets a persona by ID
 * @param {string} personaId - Persona ID
 * @returns {Promise<Object>} Persona object
 * @throws {AppError} If persona not found
 */
module.exports.getPersonaById = withErrorHandling(
  async function getPersonaById(personaId) {
    if (!personaId) {
      throw ValidationError.missingRequiredField("personaId");
    }

    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      throw NotFoundError.resource("persona");
    }

    return persona;
  },
  { operation: "get persona by id", entity: "quiz" }
);

/**
 * Gets user's personality profile
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Personality profile or null if not found
 * @throws {AppError} If query fails
 */
module.exports.getUserProfile = withErrorHandling(
  async function getUserProfile(userId) {
    if (!userId) {
      throw ValidationError.missingRequiredField("userId");
    }

    const profile = await prisma.personalityProfile.findUnique({
      where: { userId },
      include: {
        persona: true,
      },
    });

    return profile;
  },
  { operation: "get user profile", entity: "quiz" }
);

/**
 * Saves user quiz responses to database
 * @param {string} userId - User ID
 * @param {Array} responses - Array of {questionId, answer} objects
 * @returns {Promise<Array>} Array of saved quiz responses
 * @throws {AppError} If validation fails or save fails
 */
module.exports.saveResponses = withErrorHandling(
  async function saveResponses(userId, responses) {
    if (!userId) {
      throw ValidationError.missingRequiredField("userId");
    }

    validateResponses(responses);

    // Safety check: ensure Prisma client is initialized
    if (!prisma || !prisma.quizResponse) {
      throw new Error(
        "Prisma client not properly initialized. Please restart the server."
      );
    }

    // Use transaction to save all responses atomically
    const savedResponses = await prisma.$transaction(
      responses.map((response) =>
        prisma.quizResponse.upsert({
          where: {
            userId_questionId: {
              userId,
              questionId: response.questionId,
            },
          },
          update: {
            answer: response.answer,
          },
          create: {
            userId,
            questionId: response.questionId,
            answer: response.answer,
          },
        })
      )
    );

    return savedResponses;
  },
  { operation: "save responses", entity: "quiz" }
);

/**
 * Uses OpenAI API to analyze quiz responses and match user to persona
 * Delegates to OpenAI service (Dependency Inversion Principle)
 * @param {Array} responses - Array of {questionId, answer} objects
 * @param {Array} questions - Array of quiz questions with full details
 * @param {Array} personas - Array of all personas
 * @returns {Promise<Object>} Object containing persona match, scores, trip pace, and insights
 * @throws {AppError} If OpenAI API fails or parsing fails
 */
module.exports.matchPersonaWithOpenAI = withErrorHandling(
  async function matchPersonaWithOpenAI(responses, questions, personas) {
    return await matchPersonaWithOpenAIService(responses, questions, personas);
  },
  { operation: "match persona with OpenAI", entity: "quiz" }
);

/**
 * Creates or updates user's personality profile
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data containing scores, personaId, etc.
 * @returns {Promise<Object>} Created or updated personality profile
 * @throws {AppError} If validation fails or save fails
 */
module.exports.createOrUpdateProfile = withErrorHandling(
  async function createOrUpdateProfile(userId, profileData) {
    if (!userId) {
      throw ValidationError.missingRequiredField("userId");
    }

    if (!profileData || !profileData.scores) {
      throw ValidationError.invalidInput("Profile data with scores is required");
    }

    const {
      scores,
      personaId,
      personaDescription,
      personaMatchConfidence,
      preferredTripPace,
      openaiInsights,
    } = profileData;

    // Validate all inputs
    validateScores(scores);
    validateTripPace(preferredTripPace);

    // Safety check: ensure Prisma client is initialized
    if (!prisma || !prisma.personalityProfile) {
      throw new Error(
        "Prisma client not properly initialized. Please restart the server."
      );
    }

    // Prepare profile data
    const profileUpdateData = {
      adventurerScore: scores.adventurerScore,
      foodieScore: scores.foodieScore,
      cultureScore: scores.cultureScore,
      nightOwlScore: scores.nightOwlScore,
      natureScore: scores.natureScore,
      shopaholicScore: scores.shopaholicScore,
      budgetScore: scores.budgetScore,
      preferredTripPace,
      personaId: personaId || null,
      personaDescription: personaDescription || null,
      personaMatchConfidence: personaMatchConfidence || null,
      openaiInsights: openaiInsights || null,
      lastQuizCompletedAt: new Date(),
      quizVersion: "1.0",
    };

    // Create or update profile
    const profile = await prisma.personalityProfile.upsert({
      where: { userId },
      update: profileUpdateData,
      create: {
        userId,
        ...profileUpdateData,
      },
      include: {
        persona: true,
      },
    });

    return profile;
  },
  { operation: "create or update profile", entity: "quiz" }
);
