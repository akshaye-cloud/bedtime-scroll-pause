import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { z } from "zod";
import { Shell, PrimaryButton } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/pause";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Pause — Feedback" },
      { name: "description", content: "Rate Pause and tell us how it helped your bedtime routine." },
      { property: "og:title", content: "Pause — Bedtime Scrolling Assistant" },
      { property: "og:description", content: "Record and follow your intended bedtime stopping time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Feedback,
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1, "Please choose a star rating.").max(5),
  comment: z
    .string()
    .trim()
    .min(1, "Please write a few words before submitting.")
    .max(2000, "Please keep it under 2000 characters."),
});

type FeedbackRow = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
};

function Feedback() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<{ rating?: string | undefined; comment?: string | undefined }>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [records, setRecords] = useState<FeedbackRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from("feedback")
      .select("id, rating, comment, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError("Could not load your feedback records. Please try again.");
      setRecords([]);
      return;
    }
    setRecords(data ?? []);
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = feedbackSchema.safeParse({ rating, comment });
    if (!parsed.success) {
      const next: { rating?: string; comment?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "rating" | "comment";
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSaving(false);
      setErrors({ comment: "You are signed out. Please sign in again." });
      return;
    }
    const { error } = await supabase.from("feedback").insert({
      user_id: data.user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
    setSaving(false);
    if (error) {
      setErrors({ comment: "Could not save your feedback. Please try again." });
      return;
    }
    setDone(true);
    void loadRecords();
  };

  return (
    <Shell>
      <h1 className="font-display text-4xl leading-tight">How is Pause working for you?</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Rate your experience and tell us what helped or what got in the way.
      </p>

      {done ? (
        <div className="panel mt-8 text-center" role="status">
          <p className="font-display text-2xl">Thank you!</p>
          <p className="mt-2 text-muted-foreground">Your feedback was saved.</p>
          <button
            className="link-btn mt-4"
            onClick={() => {
              setDone(false);
              setRating(0);
              setComment("");
            }}
          >
            Send another response
          </button>
        </div>
      ) : (
        <form className="panel mt-8" onSubmit={submit} noValidate>
          <fieldset>
            <legend className="text-base font-semibold text-foreground">Your rating</legend>
            <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= (hover || rating);
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className="p-1"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => {
                      setRating(n);
                      setErrors((e) => ({ ...e, rating: undefined }));
                    }}
                  >
                    <Star
                      size={36}
                      className={active ? "fill-primary text-primary" : "text-muted-foreground"}
                    />
                  </button>
                );
              })}
            </div>
            {errors.rating && (
              <p role="alert" className="mt-2 text-destructive">
                {errors.rating}
              </p>
            )}
          </fieldset>

          <div className="mt-6">
            <label htmlFor="comment" className="text-base font-semibold text-foreground">
              Your feedback
            </label>
            <textarea
              id="comment"
              className="field-input mt-2 min-h-36 w-full resize-y"
              placeholder="What did you like? What should we improve?"
              value={comment}
              maxLength={2000}
              onChange={(e) => {
                setComment(e.target.value);
                setErrors((er) => ({ ...er, comment: undefined }));
              }}
            />
            {errors.comment && (
              <p role="alert" className="mt-2 text-destructive">
                {errors.comment}
              </p>
            )}
          </div>

          <PrimaryButton type="submit" className="mt-6 w-full" disabled={saving}>
            {saving ? "Sending…" : "Submit feedback"}
          </PrimaryButton>
        </form>
      )}
    </Shell>
  );
}
