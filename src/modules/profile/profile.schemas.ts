import { z } from "zod";

import { profileMarkets } from "./profile.types";

export const initializeProfileSchema = z.object({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(1).max(100),
  defaultMarket: z.enum(profileMarkets),
}).strict();
