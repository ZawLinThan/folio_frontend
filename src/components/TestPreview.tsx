import { TestPreviewSkeleton } from "../skeletons";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { studyQueries } from "../hooks/useStudyQueries";
import QueryState from "./QueryState";

/** Show generation status until the persisted question content is ready. */
const TestPreview = ({ id }: { id: string }) => {
  const metadata = useQuery({
    ...studyQueries.test(id),
    refetchInterval: (query) =>
      query.state.data?.status === "queued" ||
      query.state.data?.status === "processing"
        ? 2000
        : false,
  });
  const content = useQuery({
    ...studyQueries.testContent(id),
    enabled: metadata.data?.status === "ready",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);

  if (metadata.isPending || metadata.error) {
    return (
      <QueryState
        pending={metadata.isPending}
        skeleton={<TestPreviewSkeleton />}
        error={metadata.error}
        retry={() => {
          void metadata.refetch();
        }}
      />
    );
  }

  if (
    metadata.data?.status === "queued" ||
    metadata.data?.status === "processing"
  ) {
    return (
      <section className="panel test-preview" role="status">
        {metadata.data.status === "queued"
          ? "Test queued…"
          : "Generating your test…"}
      </section>
    );
  }

  if (metadata.data?.status === "failed") {
    return (
      <section className="panel test-preview" role="alert">
        {metadata.data.errorMessage || "Test generation failed."}
      </section>
    );
  }

  if (content.isPending || content.error) {
    return (
      <QueryState
        pending={content.isPending}
        skeleton={<TestPreviewSkeleton />}
        error={content.error}
        retry={() => void content.refetch()}
      />
    );
  }

  if (!content.data || !metadata.data) {
    return null;
  }

  return (
    <section className="panel test-preview">
      <div className="section-heading">
        <h2>{metadata.data.title ?? "Untitled test"}</h2>
        <span className="status">
          {content.data.questions.length} questions
        </span>
      </div>
      <p className="notice">{content.data.instructions}</p>
      {content.data.questions.map((question, index) => (
        <section className="test-question" key={question.id}>
          <span className="eyebrow">QUESTION {index + 1}</span>
          <h3>{question.prompt}</h3>
          {question.options.length ? (
            <fieldset disabled={showKey}>
              <legend className="sr-only">
                Answer for question {index + 1}
              </legend>
              {question.options.map((option, optionIndex) => (
                <label className="test-option" key={`${optionIndex}-${option}`}>
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: option,
                      }))
                    }
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          ) : (
            <label>
              Your answer
              <textarea
                disabled={showKey}
                value={answers[question.id] ?? ""}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: event.target.value,
                  }))
                }
              />
            </label>
          )}
          {showKey && (
            <div className="notice">
              <strong>Sample answer</strong>
              <p>{question.answer}</p>
            </div>
          )}
        </section>
      ))}
      <div className="inline-actions">
        <button className="button primary" onClick={() => setShowKey(!showKey)}>
          {showKey ? "Hide answer key" : "Reveal sample answer key"}
        </button>
        <button
          className="button"
          onClick={() => {
            setAnswers({});
            setShowKey(false);
          }}
        >
          Start again
        </button>
      </div>
    </section>
  );
};

export default TestPreview;
