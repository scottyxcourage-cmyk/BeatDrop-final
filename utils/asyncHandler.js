const asyncHandler = (fn, statusCode = 500, fallbackMessage = 'Server error') =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(err.message || err);
      res.status(statusCode).json({ message: fallbackMessage });
    });

module.exports = asyncHandler;
