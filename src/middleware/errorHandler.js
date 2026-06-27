function errorHandler(err, req, res, _next) {
  console.error('Server Error:', err.message);

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({
    status,
    error: message
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    status: 404,
    error: 'Endpoint not found'
  });
}

module.exports = { errorHandler, notFoundHandler };
