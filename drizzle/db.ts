import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Uses Supabase's Postgres URL from .env
const queryClient = postgres(process.env.DATABASE_URL_POSTGRES!);
export const db = drizzle(queryClient);
