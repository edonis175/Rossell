export function notFoundHandler(req, res) {
  return res.status(404).json({
    message: `No API route matches ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error && error.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed.",
      errors: Object.keys(error.errors || {}).map((field) => ({
        field,
        message: error.errors[field].message,
      })),
    });
  }

  if (error && error.code === 11000) {
    return res.status(409).json({ message: "That record already exists." });
  }

  console.error("[api]", error);
  const status = error && error.status >= 400 && error.status < 600 ? error.status : 500;
  return res.status(status).json({
    message: status === 500 ? "Unexpected server error." : error.message,
    ...(process.env.NODE_ENV === "development" ? { detail: error.message } : {}),
  });
}
