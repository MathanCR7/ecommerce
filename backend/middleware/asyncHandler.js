// backend/middleware/asyncHandler.js

/**
 * A utility function to wrap asynchronous route handlers.
 * Catches errors in async functions and passes them to the Express error handling middleware.
 * @param {Function} fn - The asynchronous function (route handler) to wrap.
 * @returns {Function} A new function that executes the original function and catches errors.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next); // Resolve the promise, catch any rejection, and pass error to next()
};

export default asyncHandler;
