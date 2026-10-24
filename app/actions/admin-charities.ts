"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuid } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

const charitySchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and dashes."),
  tagline: z.string().trim().max(160).default(""),
  description: z.string().trim().max(5000).default(""),
  category: z.string().trim().min(1).max(40).default("Community"),
  location: z.string().trim().max(120).default(""),
  website: z.union([z.literal(""), z.string().trim().url("Website must be a full URL.")]).default(""),
  featured: z.literal("on").optional(),
  active: z.literal("on").optional(),
});

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function refreshCharityPages(slug?: string) {
  revalidatePath("/admin/charities");
  revalidatePath("/charities");
  revalidatePath("/");
  if (slug) revalidatePath(`/charities/${slug}`);
}

export async function saveCharity(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = charitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { featured, active, website, ...rest } = parsed.data;
  const db = createAdminClient();

  const record: Record<string, unknown> = { ...rest, website: website || null, featured: !!featured, active: !!active };

  // Optional image upload to the public charity-media bucket.
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const ext = IMAGE_TYPES[image.type];
    if (!ext) return { error: "Images must be PNG, JPG or WEBP." };
    if (image.size > 5 * 1024 * 1024) return { error: "Image is too large (max 5 MB)." };
    const path = `${rest.slug}/${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage
      .from("charity-media")
      .upload(path, Buffer.from(await image.arrayBuffer()), { contentType: image.type });
    if (upErr) return { error: `Image upload failed: ${upErr.message}` };
    record.image_url = db.storage.from("charity-media").getPublicUrl(path).data.publicUrl;
  } else if (formData.get("remove_image") === "on") {
    record.image_url = null;
  }

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    const { error } = await db.from("charities").update(record).eq("id", id);
    if (error) return { error: error.code === "23505" ? "That slug is already used." : error.message };
    refreshCharityPages(rest.slug);
    return { ok: true, message: "Charity saved." };
  }

  const { data, error } = await db.from("charities").insert(record).select("id").single();
  if (error) return { error: error.code === "23505" ? "That slug is already used." : error.message };
  refreshCharityPages(rest.slug);
  redirect(`/admin/charities/${data.id}`);
}

/**
 * Deleting a charity unlinks it from supporters (profiles.charity_id → null),
 * who are then asked to choose a new one. Past payments keep their totals.
 */
export async function deleteCharity(id: string): Promise<ActionState> {
  await requireAdmin();
  const { error } = await createAdminClient().from("charities").delete().eq("id", id);
  if (error) return { error: error.message };
  refreshCharityPages();
  redirect("/admin/charities");
}

const eventSchema = z.object({
  charity_id: z.string().uuid(),
  title: z.string().trim().min(2, "Event title is required.").max(120),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  location: z.string().trim().max(120).default(""),
  description: z.string().trim().max(1000).default(""),
});

export async function addCharityEvent(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await createAdminClient().from("charity_events").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath(`/admin/charities/${parsed.data.charity_id}`);
  refreshCharityPages();
  return { ok: true, message: "Event added." };
}

export async function deleteCharityEvent(id: string, charityId: string): Promise<ActionState> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return { error: "Unknown event." };
  const { error } = await createAdminClient().from("charity_events").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/charities/${charityId}`);
  refreshCharityPages();
  return { ok: true };
}
