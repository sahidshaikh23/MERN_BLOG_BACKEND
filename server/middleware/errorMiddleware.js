// Unsupported (404) status

const notFound = (req, res, next) => {
    const error = new Error(`Not found - ${req.originalUrl}`);
    res.status(404); // Setting the response status to 404 (Not Found)
    next(error); // Passing the error to the next middleware
  };

  // Middleware to handle Errors

  const errorHandler = (error, req, res, next) => {
    if (res.headerSent) {
      return next(error);
    }

    res.status(error.code || 500).json({
      message: error.message || "An unknow error occured",
    });
  };

  module.exports = {
    errorHandler,
    notFound,
  };
