"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deployPack } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function deployPackAction(formData: FormData) {
  const packKey = String(formData.get("packKey") ?? "");
  if (!packKey) return;

  const session = await requireSession();
  if (!session) redirect("/login");

  await deployPack(getAutomationContextFromSession(session), packKey);
  revalidatePath("/dashboard/packs");
  revalidatePath(`/dashboard/industry/${packKey}`);
  revalidatePath("/dashboard/activity");
  revalidatePath("/dashboard/roi");
  redirect(`/dashboard/industry/${packKey}`);
}
