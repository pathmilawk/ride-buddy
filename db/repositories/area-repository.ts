import type { SupabaseClient } from "@supabase/supabase-js";
import type { Area, AreaKind } from "@/lib/types";

/**
 * C2 AreaRepository - data access for the seeded areas reference table.
 *
 * Read-only by design (BR-1.15). No application flow creates, renames or deletes an area;
 * rows come from supabase/seed.sql. There is correspondingly no insert, update or delete
 * policy on the table, so those operations would be refused even if code attempted them.
 *
 * Contains no business rules and applies no projection - that is not this layer's job.
 */

interface AreaRow {
  id: string;
  name: string;
  kind: AreaKind;
}

const COLUMNS = "id, name, kind";

function toArea(row: AreaRow): Area {
  return { id: row.id, name: row.name, kind: row.kind };
}

/** All areas, offices first then alphabetical, for selection controls (FR-8). */
export async function listAll(db: SupabaseClient): Promise<Area[]> {
  const { data, error } = await db
    .from("areas")
    .select(COLUMNS)
    .order("kind", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new Error(`areaRepository.listAll failed: ${error.message}`);
  return (data as AreaRow[]).map(toArea);
}

/** Resolve one area, or null when it does not exist. */
export async function findById(db: SupabaseClient, id: string): Promise<Area | null> {
  const { data, error } = await db.from("areas").select(COLUMNS).eq("id", id).maybeSingle();

  if (error) throw new Error(`areaRepository.findById failed: ${error.message}`);
  return data ? toArea(data as AreaRow) : null;
}
