const axios = require("axios");
const express = require("express");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const path = require("path");

const travelDashboardRouter = require("./routers/travelDashboard.router");
const packingListRouter = require("./routers/packingList.router");
const tripRouter = require("./routers/trip.router");
const weatherRouter = require("./routers/weather.router");
const authRouter = require("./routers/Auth.router");
const userSettingsRouter = require("./routers/UserSettings.router");
const stepsRouter = require("./routers/steps.router");
const mainDashboardRouter = require("./routers/mainDashboard.router");
const flightRouter = require("./routers/Flight.router");
const packingItemTemplateRouter = require("./routers/packingItemTemplate.router");
const quizRouter = require("./routers/Quiz.router");
const adminRouter = require("./routers/Admin.router");
const invitationRouter = require("./routers/invitation.router");
const passwordResetRouter = require("./routers/PasswordReset.router");
const {
  requireAuth,
  redirectIfAuth,
  handleRootRedirect,
  requireAdmin,
} = require("./middleware/auth.middleware");
const activityRouter = require("./routers/activity.router");
const routeRouter = require("./routers/route.router");
const activityMapRouter = require("./routers/activityMap.router");
const activityGeocodeRouter = require("./routers/activityGeocode.router");
const budgetPlannerRouter = require("./routers/budgetPlanner.router");

const app = express();
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(express.static(path.join(__dirname, "public")));
app.use("/travel_dashboard", travelDashboardRouter);
app.use("/api/packingList", packingListRouter);
app.use("/packingItemTemplate", packingItemTemplateRouter);
app.use("/trip", tripRouter);
app.use("/weather", weatherRouter);
app.use("/api/activities", activityRouter);
app.use("/api/routes", routeRouter);
app.use("/api/activities", activityMapRouter);
app.use("/api/activities", activityGeocodeRouter);
app.use("/api/routes", routeRouter);

// Handle favicon requests gracefully (before static middleware)
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

// Handle Chrome DevTools requests gracefully
app.get("/.well-known/*", (req, res) => {
  res.status(204).end();
});

// Route for root path - Redirect based on auth status
// IMPORTANT: This must come BEFORE express.static to prevent static serving of index.html
app.get("/", handleRootRedirect, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "index.html"));
});

// Route for map page - Protected route
app.get("/map", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "map.html"));
});

// API routes
app.use("/travel_dashboard", travelDashboardRouter);
app.use("/travel_dashboard", stepsRouter);
app.use("/api/packingList", packingListRouter);
app.use("/trip", tripRouter);
//app.use("/packingItemTemplate", packingItemTemplateRouter);
app.use("/api/user", userSettingsRouter);
app.use("/weather", weatherRouter);
app.use("/api/main_dashboard", mainDashboardRouter);
app.use("/api/flights", flightRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/admin", adminRouter);
app.use("/api", budgetPlannerRouter);

app.use("/api/invite", invitationRouter);

// Route for /auth to serve auth.html
// Uses redirectIfAuth middleware to redirect already-authenticated users to /home
// IMPORTANT: This must come BEFORE app.use("/auth", authRouter) to take precedence
app.get("/auth", redirectIfAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "auth.html"));
});

// Route for /forgot-password to serve forgot-password.html
app.get("/forgot-password", redirectIfAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "forgot-password.html"));
});

// Route for /reset-password/:token to serve reset-password.html
app.get("/reset-password/:token", redirectIfAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "reset-password.html"));
});

// Auth API routes (handles /auth/register, /auth/login)
app.use("/auth", authRouter);

// Password reset API routes (handles /auth/forgot-password, /auth/reset-password, /auth/verify-reset-token)
app.use("/auth", passwordResetRouter);

// Route for /home to serve home.html (dashboard) - Protected route
// Uses requireAuth middleware to ensure only authenticated users can access
app.get("/home", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "home.html"));
});

// Route for /settings to serve settings.html - Protected route
// Uses requireAuth middleware to ensure only authenticated users can access
app.get("/settings", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "settings.html"));
});

// Route for /profile to serve profile.html - Protected route (own profile)
app.get("/profile", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "profile.html"));
});

// Route for /profile/:userId to serve profile.html - Public/Protected (depending on privacy)
app.get("/profile/:userId", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "profile.html"));
});

// Route for /dashboard to serve mainDashboard.html - Protected route
// Users can select trips to view and create new trips
app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "mainDashboard.html"));
});

// Legacy route redirect for backward compatibility
app.get("/main_dashboard", requireAuth, (req, res) => {
  res.redirect("/dashboard");
});

// Route for /quiz to serve quiz.html - Protected route
// Personality quiz page
app.get("/quiz", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "quiz.html"));
});

// Route for /admin to serve admin.html - Protected route (admin only)
// Admin dashboard for user management and analytics
// Uses requireAuth first, then checks admin role in the handler
app.get("/admin", requireAuth, (req, res) => {
  // Check if user has admin role
  if (req.user.userRole !== "admin") {
    return res.redirect("/home");
  }
  res.sendFile(path.join(__dirname, "public", "pages", "admin.html"));
});

// Route for /analytics - Protected route (admin only)
app.get("/analytics", requireAuth, (req, res) => {
  // Check if user has admin role
  if (req.user.userRole !== "admin") {
    return res.redirect("/home");
  }
  res.sendFile(path.join(__dirname, "public", "pages", "analytics.html"));
});

// Serve static files (CSS, JS, images, etc.)
// IMPORTANT: This comes AFTER specific routes to prevent serving index.html at /
app.use(express.static(path.join(__dirname, "public")));

// Handle Chrome DevTools and source map requests silently
app.get("/.well-known/*", (req, res) => {
  res.status(204).end();
});

app.get("*.map", (req, res) => {
  res.status(204).end();
});

// 404
app.use((req, res, next) => {
  next(createError(404, `Unknown resource ${req.method} ${req.originalUrl}`));
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  console.error(error);
  res
    .status(error.status || 500)
    .json({ error: error.message || "Unknown Server Error!" });
});

module.exports = app;
