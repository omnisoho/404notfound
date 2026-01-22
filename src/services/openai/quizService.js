/**
 * OpenAI Service for Quiz Persona Matching
 * 
 * Single Responsibility: Handles all OpenAI API interactions for quiz persona matching
 * Dependency Inversion: Depends on OpenAI abstraction, not concrete implementation
 */

const { ValidationError, InternalError } = require("../../utils/errorHandler");

/**
 * Initialize OpenAI client
 * @returns {Object|null} OpenAI client instance or null if not configured
 */
function initializeOpenAIClient() {
  try {
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require("openai");
      return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return null;
  } catch (error) {
    console.warn("OpenAI package not installed or API key not configured");
    return null;
  }
}

const openai = initializeOpenAIClient();

/**
 * Builds the prompt for OpenAI persona matching
 * @param {Array} responses - User quiz responses
 * @param {Map} questionMap - Map of questionId to question object
 * @param {Array} personas - All available personas
 * @returns {string} Formatted prompt for OpenAI
 */
function buildPersonaMatchingPrompt(responses, questionMap, personas) {
  const personasSection = personas
    .map(
      (p) => `- ${p.name} (archetype: ${p.archetype})
  Description: ${p.description}
  Traits: ${Array.isArray(p.traits) ? p.traits.join(", ") : JSON.stringify(p.traits)}`
    )
    .join("\n");

  const responsesSection = responses
    .map((r) => {
      const question = questionMap.get(r.questionId);
      if (!question) return null;
      return `Q: ${question.questionText} (Category: ${question.category}, Type: ${question.questionType})
A: ${r.answer}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return `Analyze the following travel personality quiz responses and match the user to the most appropriate persona.

AVAILABLE PERSONAS:
${personasSection}

USER QUIZ RESPONSES:
${responsesSection}

Based on the user's responses, provide a JSON object with the following structure:
{
  "personaArchetype": "one of the persona archetypes (explorer, relaxer, culture_seeker, foodie, budget_traveler, night_owl, shopaholic, balanced)",
  "personaMatchConfidence": 0.0-1.0 (confidence score for the match),
  "adventurerScore": 0-100 (score for adventure-seeking personality),
  "foodieScore": 0-100 (score for food-focused personality),
  "cultureScore": 0-100 (score for culture-seeking personality),
  "nightOwlScore": 0-100 (score for nightlife preference),
  "natureScore": 0-100 (score for nature appreciation),
  "shopaholicScore": 0-100 (score for shopping interest),
  "budgetScore": 0-100 (score for budget consciousness, higher = more budget-conscious),
  "preferredTripPace": "slow" | "balanced" | "packed",
  "insights": "A personalized 2-3 sentence description of the user's travel personality and preferences"
}

Return ONLY the JSON object, no additional text.`;
}

/**
 * Validates OpenAI response structure
 * @param {Object} result - Parsed OpenAI response
 * @returns {Object} Validated and normalized result
 */
function validateAndNormalizeOpenAIResponse(result) {
  const personaArchetype = result.personaArchetype || "balanced";
  const personaMatchConfidence = Math.max(
    0,
    Math.min(1, parseFloat(result.personaMatchConfidence) || 0.5)
  );
  const openaiInsights = result.insights || "";

  // Normalize scores to 0-100 range
  const normalizeScore = (score) => Math.max(0, Math.min(100, parseInt(score) || 50));

  const scores = {
    adventurerScore: normalizeScore(result.adventurerScore),
    foodieScore: normalizeScore(result.foodieScore),
    cultureScore: normalizeScore(result.cultureScore),
    nightOwlScore: normalizeScore(result.nightOwlScore),
    natureScore: normalizeScore(result.natureScore),
    shopaholicScore: normalizeScore(result.shopaholicScore),
    budgetScore: normalizeScore(result.budgetScore),
  };

  const validTripPaces = ["slow", "balanced", "packed"];
  const preferredTripPace = validTripPaces.includes(result.preferredTripPace)
    ? result.preferredTripPace
    : "balanced";

  return {
    personaArchetype,
    personaMatchConfidence,
    scores,
    preferredTripPace,
    openaiInsights,
  };
}

/**
 * Matches user to persona using OpenAI API
 * @param {Array} responses - User quiz responses
 * @param {Array} questions - All quiz questions
 * @param {Array} personas - All available personas
 * @returns {Promise<Object>} Persona match result with scores and insights
 * @throws {AppError} If OpenAI API fails or validation fails
 */
async function matchPersonaWithOpenAI(responses, questions, personas) {
  // Validation
  if (!responses || !Array.isArray(responses) || responses.length === 0) {
    throw ValidationError.invalidInput("Responses array is required");
  }

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    throw ValidationError.invalidInput("Questions array is required");
  }

  if (!personas || !Array.isArray(personas) || personas.length === 0) {
    throw ValidationError.invalidInput("Personas array is required");
  }

  if (!openai) {
    throw new Error(
      "OpenAI API is not configured. Please set OPENAI_API_KEY environment variable."
    );
  }

  // Create question map for efficient lookup
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Build prompt
  const prompt = buildPersonaMatchingPrompt(responses, questionMap, personas);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a travel personality analysis expert. Analyze user quiz responses and match them to the most appropriate travel persona. Return a valid JSON object with the required fields.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content;
    const result = JSON.parse(responseText);

    // Validate and normalize response
    const normalized = validateAndNormalizeOpenAIResponse(result);

    // Find matching persona
    const matchedPersona = personas.find(
      (p) => p.archetype === normalized.personaArchetype
    );

    if (!matchedPersona) {
      // Fallback to balanced traveler
      const balancedPersona = personas.find((p) => p.archetype === "balanced");
      return {
        personaId: balancedPersona?.id || null,
        personaDescription: balancedPersona?.description || null,
        personaMatchConfidence: 0.5,
        scores: normalized.scores,
        preferredTripPace: normalized.preferredTripPace,
        openaiInsights:
          "Unable to match persona, defaulting to balanced traveler.",
      };
    }

    return {
      personaId: matchedPersona.id,
      personaDescription: matchedPersona.description,
      personaMatchConfidence: normalized.personaMatchConfidence,
      scores: normalized.scores,
      preferredTripPace: normalized.preferredTripPace,
      openaiInsights: normalized.openaiInsights,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    if (error instanceof SyntaxError) {
      throw InternalError.unexpected("Failed to parse OpenAI response");
    }
    throw InternalError.unexpected(
      `Failed to analyze quiz responses with OpenAI: ${error.message}`
    );
  }
}

module.exports = {
  matchPersonaWithOpenAI,
};

