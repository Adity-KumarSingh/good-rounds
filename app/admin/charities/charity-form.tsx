"use client";

import { useActionState, useState } from "react";
import { addCharityEvent, saveCharity } from "@/app/actions/admin-charities";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import type { Charity } from "@/lib/types";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function CharityForm({ charity }: { charity?: Charity }) {
  const [state, action] = useActionState(saveCharity, null);
  const [slug, setSlug] = useState(charity?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!charity);

  return (
    <form action={action} className="space-y-4">
      {charity && <input type="hidden" name="id" value={charity.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            defaultValue={charity?.name}
            required
            className="input"
            onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))}
          />
        </Field>
        <Field label="Slug (URL)" htmlFor="slug">
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            className="input font-mono"
          />
        </Field>
      </div>
      <Field label="Tagline" htmlFor="tagline">
        <input id="tagline" name="tagline" defaultValue={charity?.tagline} maxLength={160} className="input" />
      </Field>
      <Field label="Description" htmlFor="description">
        <textarea id="description" name="description" defaultValue={charity?.description} rows={6} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category" htmlFor="category">
          <input id="category" name="category" defaultValue={charity?.category ?? "Community"} required className="input" />
        </Field>
        <Field label="Location" htmlFor="location">
          <input id="location" name="location" defaultValue={charity?.location} className="input" />
        </Field>
        <Field label="Website" htmlFor="website">
          <input id="website" name="website" type="url" defaultValue={charity?.website ?? ""} placeholder="https://" className="input" />
        </Field>
      </div>
      <Field label="Image" htmlFor="image" hint="PNG, JPG or WEBP, max 5 MB. Leave empty to keep the current image.">
        <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" className="input file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-cream" />
      </Field>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={charity?.active ?? true} className="h-4 w-4 accent-ember" /> Visible in directory
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={charity?.featured} className="h-4 w-4 accent-ember" /> Featured on homepage
        </label>
        {charity?.image_url && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="remove_image" className="h-4 w-4 accent-ember" /> Remove image
          </label>
        )}
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">{charity ? "Save changes" : "Create charity"}</SubmitButton>
    </form>
  );
}

export function EventForm({ charityId }: { charityId: string }) {
  const [state, action] = useActionState(addCharityEvent, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="charity_id" value={charityId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="title" placeholder="Event title (e.g. Charity Golf Day)" required className="input" />
        <input name="event_date" type="date" required className="input" aria-label="Event date" />
      </div>
      <input name="location" placeholder="Location" className="input" />
      <textarea name="description" placeholder="Short description" rows={2} className="input" />
      <FormMessage state={state} />
      <SubmitButton className="btn-secondary" pendingText="Adding…">
        Add event
      </SubmitButton>
    </form>
  );
}
