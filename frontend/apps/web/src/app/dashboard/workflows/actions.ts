"use server";

import { revalidatePath } from "next/cache";
import { deployWorkflow } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function deployWorkflowAction(formData: FormData) {
  const templateKey = String(formData.get("templateKey") ?? "");
  const name = String(formData.get("name") ?? "");
  if (!templateKey) return;

  const session = await requireSession();
  if (!session) return;

  await deployWorkflow(getAutomationContextFromSession(session), { templateKey, name: name || undefined });
  revalidatePath("/dashboard/workflows");
  revalidatePath("/dashboard/activity");
  revalidatePath("/dashboard/roi");
}
