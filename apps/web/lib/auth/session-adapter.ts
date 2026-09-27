import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { BetterAuthOptions, DBAdapter } from "better-auth";
import { createAdapterFactory } from "better-auth/adapters";
import { eq } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import * as schema from "@/drizzle/schema";

const sessionInsert = createInsertSchema(schema.session);

async function rejectNonCreate(): Promise<never> {
  throw new Error("The session writer only supports creation");
}

export function sessionAdapter(database: PgDatabase<NodePgQueryResultHKT, typeof schema>) {
  return (options: BetterAuthOptions): DBAdapter => {
    const adapter = drizzleAdapter(database, {
      provider: "pg",
      schema,
      schemaName: "betterauth",
    })(options);

    // Only session creation needs custom SQL. The factory still applies defaults,
    // field transformations, ID handling, and output selection around that SQL.
    const sessionWriter = createAdapterFactory({
      config: {
        ...adapter.options?.adapterConfig,
        adapterId: "session-upsert",
      },
      adapter: () => ({
        // These methods are required by the factory's interface. The returned
        // public adapter routes every non-create operation to Drizzle directly.
        findOne: rejectNonCreate,
        findMany: rejectNonCreate,
        update: rejectNonCreate,
        updateMany: rejectNonCreate,
        delete: rejectNonCreate,
        deleteMany: rejectNonCreate,
        consumeOne: rejectNonCreate,
        incrementOne: rejectNonCreate,
        count: rejectNonCreate,
        create: async <T extends Record<string, unknown>>({ data }: { data: T; model: string }) => {
          const values = sessionInsert.parse(data);

          // ADR-20, ADR-40: replace a retired token pair atomically, retaining
          // the previous row if the replacement fails.
          const [row] = await database
            .insert(schema.session)
            .values(values)
            .onConflictDoUpdate({
              target: schema.session.id,
              set: values,
              setWhere: eq(schema.session.userId, values.userId),
            })
            .returning();

          if (!row) throw new Error("Session ownership changed");

          return { ...data, ...row };
        },
      }),
    })(options);

    // Better Auth registers schema checks by adapter object identity.
    // Keep that instance when overriding the session writer and transactions.
    const create = adapter.create;

    adapter.create = (args) =>
      args.model === "session" ? sessionWriter.create(args) : create(args);
    adapter.transaction = (callback) =>
      database.transaction((transaction) => callback(sessionAdapter(transaction)(options)));

    return adapter;
  };
}
