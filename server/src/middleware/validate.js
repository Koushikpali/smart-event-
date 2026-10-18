/** validate(schema, 'body' | 'query' | 'params') -> parsed data on req.valid[source] */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(result.error);
  req.valid = { ...(req.valid || {}), [source]: result.data };
  next();
};
