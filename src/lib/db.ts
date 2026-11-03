import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

export const db = connectionString ? neon(connectionString) : null;

export function databaseUnavailableMessage() {
  return "Database not configured. Add DATABASE_URL in your deployment environment and run the SQL migration at database/migrations/0001_initial.sql.";
}
