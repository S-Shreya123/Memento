// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Email + password sign-in. The FIRST sign-up verifies the address with a
    // one-time code (sent by the `emailOtp` provider below); every later
    // sign-in is password-only — no code is emailed again.
    Password({
      verify: emailOtp,
      validatePasswordRequirements(password: string) {
        if (!password || password.length < 8) {
          throw new Error("Invalid password — please use at least 8 characters.");
        }
      },
    }),
    // Kept registered so accounts created before passwords existed can still
    // complete a code verification; new sign-ins go through the password flow.
    emailOtp,
    Anonymous,
  ],
  // A remembered household stays signed in for one month.
  session: { totalDurationMs: 1000 * 60 * 60 * 24 * 30 },
});
