import type { VercelRequest, VercelResponse } from "@vercel/node";
import entry from "../../src/server/t3aHandlers/entry.js";
import commit from "../../src/server/t3aHandlers/commit.js";
import interrupt from "../../src/server/t3aHandlers/interrupt.js";
import suspend from "../../src/server/t3aHandlers/suspend.js";
import seal from "../../src/server/t3aHandlers/seal.js";

/**
 * One Vercel function for every /api/t3a/<route> (entry, commit, interrupt, suspend, seal). The Hobby plan allows twelve functions in a deployment; the routes
 * keep their addresses and their separate handlers (src/server/t3aHandlers), and share this one entry point.
 */
const HANDLERS: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = { entry, commit, interrupt, suspend, seal };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = req.query?.route;
  const route = Array.isArray(q) ? q[0] : q;
  const h = route && Object.prototype.hasOwnProperty.call(HANDLERS, route) ? HANDLERS[route] : null;
  if (!h) return res.status(404).json({ error: "not_found" });
  return h(req, res);
}
