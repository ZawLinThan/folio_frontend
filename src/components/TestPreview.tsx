import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { useRef, useState } from "react";

import { studyQueries } from "../hooks/useStudyQueries";
import { TestPreviewSkeleton } from "../skeletons";
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
  const [questionIndex, setQuestionIndex] = useState(0);
  const questionHeading = useRef<HTMLHeadingElement>(null);

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

  const { questions, instructions } = content.data;
  const currentIndex = Math.min(questionIndex, questions.length - 1);
  const question = questions[currentIndex];
  const answeredCount = questions.filter(({ id }) =>
    answers[id]?.trim(),
  ).length;

  if (!question) {
    return (
      <section className="panel test-preview">
        <h2>{metadata.data.title ?? "Untitled test"}</h2>
        <p>This test has no questions.</p>
      </section>
    );
  }

  const navigateToQuestion = (index: number) => {
    if (index === currentIndex) {
      return;
    }

    setQuestionIndex(index);
    questionHeading.current?.focus();
  };

  const saveAnswer = (answer: string) => {
    setAnswers((current) => ({ ...current, [question.id]: answer }));
  };

  const title = metadata.data.title ?? "Untitled test";
  const selectedAnswer = answers[question.id] ?? "";
  const isMultipleChoice = question.options.length > 0;
  const answerKey = question.answer.trim().toLowerCase();
  const correctOptionIndex = question.options.findIndex(
    (option) => option.trim().toLowerCase() === answerKey,
  );

  return (
    <section className="test-preview" aria-labelledby="test-preview-title">
      <header className="test-reader-header">
        <div>
          <h2 id="test-preview-title">{title}</h2>
          {instructions && <p>{instructions}</p>}
        </div>
        <button
          type="button"
          className="button test-key-toggle"
          aria-pressed={showKey}
          onClick={() => setShowKey((visible) => !visible)}
        >
          {showKey ? (
            <EyeOff size={16} aria-hidden="true" />
          ) : (
            <Eye size={16} aria-hidden="true" />
          )}
          Answer key
        </button>
      </header>

      <div className="test-reader">
        <aside className="test-reader-nav" aria-label="Test progress">
          <div className="test-reader-progress">
            <h3>Questions</h3>
            <p role="status">
              {answeredCount} of {questions.length} answered
            </p>
            <progress
              aria-label="Questions answered"
              value={answeredCount}
              max={questions.length}
            />
          </div>
          <nav className="test-reader-jump" aria-label="Jump to a question">
            {questions.map((item, index) => {
              const answered = Boolean(answers[item.id]?.trim());
              const current = index === currentIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  className="test-jump-button"
                  data-answered={answered}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Question ${index + 1}${answered ? ", answered" : ", unanswered"}`}
                  onClick={() => navigateToQuestion(index)}
                >
                  {index + 1}
                  {answered && <Check size={11} aria-hidden="true" />}
                </button>
              );
            })}
          </nav>
        </aside>

        <article
          className="panel test-question"
          aria-labelledby="test-question-heading"
        >
          <div className="test-question-meta">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span>
              {isMultipleChoice ? "Multiple choice" : "Written response"}
            </span>
          </div>
          <h3 id="test-question-heading" ref={questionHeading} tabIndex={-1}>
            {question.prompt}
          </h3>

          {isMultipleChoice ? (
            <fieldset disabled={showKey}>
              <legend className="sr-only">Choose an answer</legend>
              {question.options.map((option, index) => {
                const selected = selectedAnswer === option;
                const correct = showKey && index === correctOptionIndex;
                const incorrect =
                  showKey && correctOptionIndex >= 0 && selected && !correct;

                return (
                  <label
                    className="test-option"
                    data-selected={selected}
                    data-review={
                      correct ? "correct" : incorrect ? "incorrect" : undefined
                    }
                    key={`${index}-${option}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={selected}
                      onChange={() => saveAnswer(option)}
                    />
                    <span className="test-option-letter" aria-hidden="true">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="test-option-body">
                      <span className="test-option-copy">{option}</span>
                      {correct && (
                        <span className="test-option-result">
                          <Check size={14} aria-hidden="true" />
                          {selected
                            ? "Your answer · Correct"
                            : "Correct answer"}
                        </span>
                      )}
                      {incorrect && (
                        <span className="test-option-result">
                          <X size={14} aria-hidden="true" /> Your answer ·
                          Incorrect
                        </span>
                      )}
                    </span>
                    {selected && !showKey && (
                      <Check
                        className="test-option-selection"
                        size={18}
                        aria-hidden="true"
                      />
                    )}
                  </label>
                );
              })}
            </fieldset>
          ) : (
            <label className="test-written-answer">
              Your answer
              <textarea
                readOnly={showKey}
                value={selectedAnswer}
                onChange={(event) => saveAnswer(event.target.value)}
              />
            </label>
          )}

          {showKey && correctOptionIndex < 0 && (
            <div className="test-answer-key">
              <h4>{isMultipleChoice ? "Correct answer" : "Sample answer"}</h4>
              <p>{question.answer}</p>
            </div>
          )}

          <div className="test-question-footer">
            <button
              type="button"
              className="button"
              disabled={currentIndex === 0}
              onClick={() => navigateToQuestion(currentIndex - 1)}
            >
              <ChevronLeft size={16} aria-hidden="true" /> Previous
            </button>
            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                className="button primary"
                onClick={() => navigateToQuestion(currentIndex + 1)}
              >
                Next <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="button"
                disabled={!answeredCount && !showKey}
                onClick={() => {
                  setAnswers({});
                  setShowKey(false);
                  setQuestionIndex(0);
                  questionHeading.current?.focus();
                }}
              >
                Start again
              </button>
            )}
          </div>
        </article>
      </div>
    </section>
  );
};

export default TestPreview;
