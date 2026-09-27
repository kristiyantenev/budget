import "server-only";
import { z } from "zod";
import type { createSessionRefresher } from "@/lib/auth/refresh-session";

const meResponse = z.object({ subject: z.string().min(1) });

type StoredSession = Pick<
  Awaited<ReturnType<ReturnType<typeof createSessionRefresher>>>,
  "subject" | "accessToken"
>;

export type BudgetingApiConfig = {
  baseURL: string;
  refresh: (sessionToken: string) => Promise<StoredSession>;
};

export type BudgetingApi = {
  whoAmI(sessionToken: string): Promise<WhoAmI>;
};

export type WhoAmI =
  | { status: "ok"; matches: boolean }
  | { status: "unauthorized" }
  | { status: "forbidden" };

export class BudgetApiUnavailable extends Error {
  constructor() {
    super("The B1 Budget API is temporarily unavailable");
  }
}

// ADR-40: the only code that spells the API base URL and attaches the stored access token.
// Server components and Server Actions reach it through the data access layer, never directly.
export function createBudgetingApi({ baseURL, refresh }: BudgetingApiConfig): BudgetingApi {
  async function get(sessionToken: string, path: string) {
    // ADR-40: refresh inside the thirty-second window, under the session row lock, before the call.
    const stored = await refresh(sessionToken);

    try {
      const response = await fetch(new URL(path, baseURL), {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${stored.accessToken}`,
        },
      });

      return { stored, response };
    } catch {
      // Network errors can echo request details. Do not propagate them.
      throw new BudgetApiUnavailable();
    }
  }

  return {
    async whoAmI(sessionToken: string): Promise<WhoAmI> {
      const { stored, response } = await get(sessionToken, "/me");

      // ADR-31: a 401 and a 403 stay distinct. Refresh-and-retry on 401 is not built yet,
      // and neither outcome touches the session.
      if (response.status === 401) return { status: "unauthorized" };

      if (response.status === 403) return { status: "forbidden" };

      if (!response.ok) throw new BudgetApiUnavailable();

      const me = meResponse.safeParse(await response.json().catch(() => null));

      if (!me.success) throw new BudgetApiUnavailable();

      return { status: "ok", matches: me.data.subject === stored.subject };
    },
  };
}
