import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  FileText,
  Layers,
  Library,
  MessageSquareText,
} from "lucide-react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import "../landing.css";

const features = [
  {
    title: "Give your notes a home.",
    description:
      "File lecture slides, readings, and notes into courses and notebooks so you can find them again.",
    icon: Library,
  },
  {
    title: "Follow the answer back.",
    description:
      "Ask questions about your notes and use source links to check where an answer came from.",
    icon: MessageSquareText,
  },
  {
    title: "Practice from your notes.",
    description:
      "Turn course material into flashcards and practice tests, then review what you still need to learn.",
    icon: Layers,
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <a className="skip-link" href="#landing-content">
        Skip to content
      </a>
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Brand />
          <nav aria-label="Account">
            <Link className="landing-login" to="/login">
              Sign in
            </Link>
            <Link className="button primary" to="/signup">
              Sign up <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="landing-content" tabIndex={-1}>
        <section
          className="landing-container landing-hero"
          aria-labelledby="landing-title"
        >
          <div className="landing-intro">
            <p className="landing-kicker">
              <span /> THE DIGITAL STUDY DESK
            </p>
            <h1 id="landing-title">
              A desk for
              <br /> <em>your notes.</em>
            </h1>
            <p className="landing-lead">
              Bring your course materials together. Ask questions, trace answers
              to the source, and practice what you’ve learned.
            </p>
            <div className="landing-actions">
              <Link className="button primary" to="/signup">
                Create an account <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a className="landing-more" href="#how-it-works">
                How it works <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
          <figure className="landing-preview">
            <div className="desk-board">
              <div className="desk-index">
                <span>
                  <BookOpen size={15} aria-hidden="true" /> FIELD NOTES
                </span>
                <span>01 / EXAMPLE</span>
              </div>
              <div className="desk-source">
                <div className="desk-source-header">
                  <span className="desk-icon">
                    <FileText size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <span>PSY 204 · WEEK 03</span>
                    <strong>Memory & learning</strong>
                  </div>
                  <span className="desk-filetype">PDF</span>
                </div>
                <div className="desk-lines" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="desk-answer">
                <span className="desk-answer-label">
                  <MessageSquareText size={15} aria-hidden="true" /> STUDY
                  ASSISTANT
                </span>
                <p className="desk-question">
                  Why does retrieval practice help?
                </p>
                <p className="desk-response">
                  Trying to recall an idea strengthens your memory of it and
                  shows you what to revisit.
                </p>
                <span className="source-badge">
                  <FileText size={13} aria-hidden="true" /> Week 03 notes · p. 4
                </span>
              </div>
            </div>
            <figcaption>
              <span>FIG. 01</span> An example answer grounded in course notes.
            </figcaption>
          </figure>
        </section>

        <section
          className="landing-container landing-workflow"
          id="how-it-works"
          aria-labelledby="workflow-title"
        >
          <p className="landing-kicker">
            <span /> THE WORKFLOW
          </p>
          <h2 id="workflow-title">From reading to remembering.</h2>
          <ol className="landing-features">
            {features.map(({ title, description, icon: Icon }, index) => (
              <li key={title}>
                <div className="landing-feature-index">
                  <Icon size={20} aria-hidden="true" />
                  <span>0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="landing-container landing-cta"
          aria-labelledby="landing-cta-title"
        >
          <div>
            <h2 id="landing-cta-title">Make room for learning.</h2>
            <p>Start with a course and a set of notes.</p>
          </div>
          <Link className="button primary" to="/signup">
            Create an account <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <Brand />
          <p>A workspace for learning from your own material.</p>
          <Link to="/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
