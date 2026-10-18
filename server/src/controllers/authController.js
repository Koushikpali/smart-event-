import * as auth from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;
  res.json(await auth.login(email, password));
});
