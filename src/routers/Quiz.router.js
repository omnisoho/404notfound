const express = require("express");
const { verifyToken } = require("../middleware/auth.middleware");
const {
  getAllQuestions,
  getAllPersonas,
  getPersonaById,
  getUserProfile,
  saveResponses,
  matchPersonaWithOpenAI,
  createOrUpdateProfile,
} = require("../models/Quiz.model");
const { ValidationError } = require("../utils/errorHandler");
const router = express.Router();

/**
 * GET /api/quiz/questions
 * Get all quiz questions
 * Requires authentication
 */
router.get("/questions", verifyToken, async (req, res, next) => {
  try {
    const questions = await getAllQuestions();

    res.json({
      success: true,
      questions,
      count: questions.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/quiz/personas
 * Get all personas
 * Requires authentication
 */
router.get("/personas", verifyToken, async (req, res, next) => {
  try {
    const personas = await getAllPersonas();

    res.json({
      success: true,
      personas,
      count: personas.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/quiz/profile
 * Get user's personality profile
 * Requires authentication
 */
router.get("/profile", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const profile = await getUserProfile(userId);

    if (!profile) {
      return res.json({
        success: true,
        profile: null,
        message: "No personality profile found. Complete the quiz to create one.",
      });
    }

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/quiz/submit
 * Submit quiz responses, analyze with OpenAI, and save profile
 * Requires authentication
 */
router.post("/submit", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { responses } = req.body;

    // Validate input
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({
        error: "Responses array is required",
        code: "MISSING_RESPONSES",
      });
    }

    // Validate each response
    for (const response of responses) {
      if (!response.questionId || response.answer === undefined) {
        return res.status(400).json({
          error: "Each response must have questionId and answer",
          code: "INVALID_RESPONSE_FORMAT",
        });
      }
    }

    // Get all questions and personas
    const [questions, personas] = await Promise.all([
      getAllQuestions(),
      getAllPersonas(),
    ]);

    if (questions.length === 0) {
      return res.status(500).json({
        error: "No quiz questions found in database",
        code: "NO_QUESTIONS",
      });
    }

    if (personas.length === 0) {
      return res.status(500).json({
        error: "No personas found in database",
        code: "NO_PERSONAS",
      });
    }

    // Save responses to database
    await saveResponses(userId, responses);

    // Use OpenAI to match persona and calculate scores
    let profileData;
    try {
      profileData = await matchPersonaWithOpenAI(responses, questions, personas);
    } catch (openaiError) {
      console.error("OpenAI error:", openaiError);
      // Return error but don't fail completely - responses are already saved
      return res.status(500).json({
        error: "Failed to analyze quiz responses with OpenAI",
        code: "OPENAI_ERROR",
        message: openaiError.message,
      });
    }

    // Create or update personality profile
    const profile = await createOrUpdateProfile(userId, profileData);

    res.status(201).json({
      success: true,
      profile,
      message: "Quiz completed successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/quiz/personas/:id
 * Get a specific persona by ID
 * Requires authentication
 */
router.get("/personas/:id", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const persona = await getPersonaById(id);

    res.json({
      success: true,
      persona,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

