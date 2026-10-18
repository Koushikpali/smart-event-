import * as tickets from '../services/ticketService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const get = asyncHandler(async (req, res) => res.json({ data: await tickets.getTicket(req.valid.params.code) }));
export const verify = asyncHandler(async (req, res) => res.json({ valid: true, data: await tickets.verifyTicket(req.valid.params.code) }));
