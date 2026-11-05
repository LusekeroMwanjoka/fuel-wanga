"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserOrNull } from "@/lib/auth";

const UpdateSchema = z.object({
  station_id: z.string().uuid(),
  petrol_status: z.enum(["has_fuel", "no_fuel"]),
  diesel_status: z.enum(["has_fuel", "no_fuel"]),
});

export async function updateStationStatus(input: unknown): Promise<{ error: string } | null> {
  // 1. Authenticate
  const user = await getUserOrNull();
  if (!user) return { error: "You must be signed in." };

  // 2. Validate input with zod
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { error: firstIssue };
  }

  const { station_id, petrol_status, diesel_status } = parsed.data;

  // 3. Use the user's cookie client – RLS checks is_station_staff(id)
  const supabase = await createClient();

  // Update fuel statuses and clear any previous delivery estimates.
  // RLS + trigger enforce the rest on the DB side.
  const { error: dbError, data: updatedRows } = await supabase
    .from("stations")
    .update({
      petrol_status,
      diesel_status,
      petrol_eta: null,
      diesel_eta: null,
    })
    .eq("id", station_id)
    .select("id");

  if (dbError) {
    const msg = dbError.message ?? "";
    if (msg.includes("not authorized")) {
      return { error: "You are not authorized to update this station." };
    }
    return { error: "Failed to update status. Please try again." };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { error: "Station not found or you are not authorized." };
  }

  revalidatePath("/");
  return null;
}
