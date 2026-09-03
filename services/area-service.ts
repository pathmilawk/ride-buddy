import { createSupabaseServerClient } from "@/db/supabase/server";
import * as areaRepository from "@/db/repositories/area-repository";
import type { Area } from "@/lib/types";

/**
 * C7 AreaService - supply areas for selection controls.
 *
 * BR-1.12: every location input is a selection from this list. No free-text location entry
 * exists anywhere in the application, which is what makes area matching exact (BR-1.14).
 *
 * Unit 2 reuses this unchanged for ride origin and destination.
 */
export async function listAreas(): Promise<Area[]> {
  const supabase = await createSupabaseServerClient();
  return areaRepository.listAll(supabase);
}
