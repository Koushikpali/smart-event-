// Lets async controllers throw; Express then routes the error to errorHandler.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
