import { useMemo, useState } from "react";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import { featureOptions } from "../../data/clientFeedbackDummyData.js";
import { showSuccess } from "../../lib/toast.js";

export default function ClientCreateFeedback() {
  const [mood, setMood] = useState("happy");
  const [rating, setRating] = useState(4);
  const [selectedFeatures, setSelectedFeatures] = useState([
    "The advanced search functionality",
  ]);
  const [feedbackText, setFeedbackText] = useState("");
  const [attachments, setAttachments] = useState([]);

  const moodOptions = useMemo(
    () => [
      { value: "happy", icon: "☺", label: "Happy" },
      { value: "neutral", icon: "😐", label: "Neutral" },
      { value: "sad", icon: "☹", label: "Sad" },
    ],
    [],
  );

  function toggleFeature(feature) {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((item) => item !== feature)
        : [...prev, feature],
    );
  }

  function handleFileChange(event) {
    const files = Array.from(event.target.files ?? []);
    setAttachments(files);
  }

  function handleSubmit(event) {
    event.preventDefault();
    showSuccess("Feedback submitted successfully.");
    setFeedbackText("");
  }

  return (
    <PortalLayout mode="client">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-1/2 rounded-xl bg-surface-card p-8 shadow-md"
      >
        <h1 className="text-heading6 font-semibold text-content">Feedback</h1>

        <section className="mt-8 space-y-3">
          <h2 className="text-bodysmall font-semibold text-content">
            How would you describe your mood after using our product for the
            first time?
          </h2>
          <div className="flex gap-3">
            {moodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMood(option.value)}
                className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-[28px] transition ${
                  mood === option.value ? "bg-[#BBF7D0]" : "bg-surface-page"
                }`}
                aria-label={option.label}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-bodysmall font-semibold text-content">
            How would you rate the quality of our product?
          </h2>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRating(item)}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-bodysmall font-semibold ${
                  rating === item
                    ? "bg-[#D9B8FF] text-content"
                    : "bg-surface-page text-content"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-bodysmall font-semibold text-content">
            Your feedback
          </h2>
          <textarea
            value={feedbackText}
            onChange={(event) => setFeedbackText(event.target.value)}
            placeholder="Anything you'd like to add? Your input is valuable to us"
            rows={7}
            className="w-full rounded-md border border-border-input px-4 py-3 text-bodysmall text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand-gray/30"
          />
        </section>

        <section className="mt-6 space-y-2">
          <label className="text-bodysmall font-semibold text-content">
            Attachment
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-captionsmall text-content file:mr-3 file:rounded-md file:border-0 file:bg-surface-page file:px-3 file:py-2 file:text-captionsmall file:font-medium"
          />
          {attachments.length > 0 ? (
            <p className="text-captionsmall text-content-muted">
              {attachments[0].name}
            </p>
          ) : null}
        </section>

        <button
          type="submit"
          className="mt-8 w-full rounded-md bg-content py-3 text-bodysmall font-semibold text-white"
        >
          Send Feedback
        </button>
      </form>
    </PortalLayout>
  );
}
