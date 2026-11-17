import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  Send,
  FileText,
  Plus,
  PanelLeftOpen,
  PanelLeftClose,
  BookOpen,
  ArrowUpRight,
  Layers3,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ChatPageSkeleton,
  ConversationHistorySkeleton,
  SkeletonRegion,
} from "../skeletons";
import { useStudyData } from "../hooks/useStudyQueries";
import {
  createChatSession,
  sendChatMessage,
  getChatSessions,
  getChatSession,
  renameChatSession,
  deleteChatSession,
  type ChatSessionSummary,
  type ChatSource,
} from "../lib/chatApi";
import { readyDocumentsInScope } from "../lib/chatScope";
import { questionSchema } from "../zodSchema/studySchema";
import PageHeading from "../components/PageHeading";
import Modal from "../components/Modal";
import QueryState from "../components/QueryState";
import { getNameInitials } from "../lib/utils";
import { useDisplayName } from "../hooks/useProfile";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: ChatSource[];
};
type Session = { id: string; scope: string };
const historyKey = ["study", "chat-sessions"] as const;
const getHistoryTitle = (item: ChatSessionSummary) =>
  item.title ||
  item.messages.find((message) => message.role === "user")?.content ||
  "New conversation";

const ChatPage = () => {
  const data = useStudyData();
  const displayName = useDisplayName();
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: historyKey,
    queryFn: getChatSessions,
  });
  const [params] = useSearchParams();
  const [selectedCourse, setCourse] = useState(params.get("course") || "");
  const [notebook, setNotebook] = useState(params.get("notebook") || "");
  const [file, setFile] = useState(params.get("file") || "");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [restoredIds, setRestoredIds] = useState<string[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activity, setActivity] = useState<
    "sending" | "opening" | "editing" | null
  >(null);
  const [historyError, setHistoryError] = useState("");
  const [titleEdit, setTitleEdit] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const busy = activity !== null;
  const lock = useRef(false);
  const messageSequence = useRef(0);
  const transcript = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const course = selectedCourse || data.courses[0]?.id || "";
  const scopedNotebooks = data.notebooks.filter(
    (item) => item.courseId === course,
  );
  const scopedFiles = data.documents.filter(
    (item) =>
      item.courseId === course && (!notebook || item.notebookId === notebook),
  );
  const sources =
    restoredIds === null
      ? readyDocumentsInScope(data.documents, course, notebook, file)
      : data.documents.filter(
          (item) => restoredIds.includes(item.id) && item.status === "ready",
        );
  const scope = sources
    .map((item) => item.id)
    .sort()
    .join(",");
  const scopeChanged =
    restoredIds === null && session !== null && session.scope !== scope;

  useEffect(() => {
    const element = transcript.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, activity, data.isPending, data.error]);

  const clearConversation = () => {
    setSession(null);
    setRestoredIds(null);
    setMessages([]);
    setError("");
  };

  const reset = () => {
    if (!lock.current) {
      clearConversation();
    }
  };

  const updateHistory = async (
    change: { id: string; title: string } | { id: string },
  ) => {
    if (lock.current) {
      return;
    }

    setHistoryError("");
    const { id } = change;
    const title = "title" in change ? change.title.trim() : null;

    if (title !== null && (!title || title.length > 255)) {
      setHistoryError("Enter a title between 1 and 255 characters.");
      return;
    }

    lock.current = true;
    setActivity("editing");

    try {
      let updatedTitle: string | null = null;

      if (title !== null) {
        updatedTitle = (await renameChatSession(id, title)).title;
        setTitleEdit(null);
      } else {
        await deleteChatSession(id);
        setDeleteTarget(null);

        if (session?.id === id) {
          clearConversation();
          setQuestion("");
        }
      }

      await queryClient.cancelQueries({ queryKey: historyKey });
      queryClient.setQueryData<ChatSessionSummary[]>(historyKey, (previous) =>
        title !== null
          ? previous?.map((entry) =>
              entry.id === id ? { ...entry, title: updatedTitle } : entry,
            )
          : previous?.filter((entry) => entry.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: historyKey });
    } catch {
      setHistoryError(
        `Could not ${title === null ? "delete" : "rename"} this conversation. Please try again.`,
      );
    } finally {
      lock.current = false;
      setActivity(null);
    }
  };

  const cancelTitleEdit = () => {
    if (lock.current) {
      return;
    }

    setTitleEdit(null);
    setHistoryError("");
  };

  const closeDeleteModal = () => {
    if (lock.current) {
      return;
    }

    setDeleteTarget(null);
    setHistoryError("");
  };

  const ask = async (value: string) => {
    if (lock.current) {
      return;
    }

    const result = questionSchema.safeParse({ question: value });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    if (!sources.length) {
      setError("No ready documents are available in this selection.");
      return;
    }

    const text = result.data.question;
    const pendingMessage: ChatMessage = {
      id: `outgoing-${++messageSequence.current}`,
      role: "user",
      text,
    };
    lock.current = true;
    setActivity("sending");
    setError("");
    setQuestion("");
    setMessages((previous) =>
      scopeChanged ? [pendingMessage] : [...previous, pendingMessage],
    );
    let activeSession = session;

    try {
      if (!activeSession || scopeChanged) {
        const id = await createChatSession(sources.map((item) => item.id));
        activeSession = { id, scope };
        setSession(activeSession);
        void queryClient.invalidateQueries({
          queryKey: historyKey,
        });
      }

      const answer = await sendChatMessage(activeSession.id, text);
      setMessages((previous) => [
        ...previous.map((message) =>
          message.id === pendingMessage.id
            ? { ...message, text: answer.userMessage.content }
            : message,
        ),
        {
          id: answer.assistantMessage.id,
          role: "assistant",
          text: answer.answer,
          sources: answer.sources,
        },
      ]);
      void queryClient.invalidateQueries({
        queryKey: historyKey,
      });
    } catch (cause) {
      setMessages((previous) =>
        scopeChanged && activeSession === session
          ? messages
          : previous.filter((message) => message.id !== pendingMessage.id),
      );
      setQuestion(value);
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not answer your question. Please try again.",
      );
    } finally {
      lock.current = false;
      setActivity(null);
    }
  };

  const openSession = async (id: string) => {
    if (lock.current) {
      return;
    }

    lock.current = true;
    setActivity("opening");
    setError("");

    try {
      const saved = await getChatSession(id);
      setRestoredIds(saved.documentIds);
      setSession({
        id: saved.id,
        scope: [...saved.documentIds].sort().join(","),
      });
      setMessages(
        saved.messages.map((message) => ({
          id: message.id,
          role: message.role,
          text: message.content,
          sources: message.sources,
        })),
      );
      const first = data.documents.find((document) =>
        saved.documentIds.includes(document.id),
      );

      if (first?.courseId) {
        setCourse(first.courseId);
      }

      setNotebook("");
      setFile("");
      setQuestion("");
      setHistoryOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not open this conversation.",
      );
    } finally {
      lock.current = false;
      setActivity(null);
    }
  };

  if (data.isPending || data.error) {
    return (
      <QueryState
        pending={data.isPending}
        skeleton={<ChatPageSkeleton />}
        error={data.error}
        retry={data.refetch}
      />
    );
  }

  return (
    <div className="study-assistant study-page">
      <PageHeading
        title="Study assistant"
        description="A little more clarity, one question at a time."
        action={
          <button className="button" disabled={busy} onClick={reset}>
            <Plus size={16} /> New conversation
          </button>
        }
      />
      <div
        className={`chat-history-layout ${historyOpen ? "history-open" : ""}`}
      >
        <aside
          id="chat-history"
          className="panel chat-history"
          aria-label="Chat history"
          aria-hidden={!historyOpen}
          inert={!historyOpen}
        >
          <div className="history-heading">
            <div>
              <h3>Conversations</h3>
            </div>
            <button
              className="history-close-button"
              type="button"
              aria-label="Close chat history"
              onClick={() => {
                cancelTitleEdit();
                setHistoryOpen(false);
              }}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          {history.isPending && (
            <SkeletonRegion label="Loading conversations">
              <ConversationHistorySkeleton />
            </SkeletonRegion>
          )}
          {history.error && (
            <p className="error" role="alert">
              Could not load chat history.{" "}
              <button
                className="text-link"
                onClick={() => void history.refetch()}
              >
                Try again
              </button>
            </p>
          )}
          {!history.isPending && !history.error && !history.data?.length && (
            <p>No conversations yet.</p>
          )}
          {[...(history.data ?? [])]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((item) =>
              titleEdit?.id === item.id ? (
                <form
                  key={item.id}
                  className="chat-history-row chat-history-edit"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void updateHistory(titleEdit);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      cancelTitleEdit();
                    }
                  }}
                >
                  <input
                    aria-label="Conversation title"
                    autoFocus
                    maxLength={255}
                    value={titleEdit.title}
                    readOnly={busy}
                    onChange={(event) => {
                      setTitleEdit({ id: item.id, title: event.target.value });
                      setHistoryError("");
                    }}
                  />
                  <button
                    className="history-close-button"
                    type="submit"
                    title="Save title"
                    aria-label="Save title"
                    disabled={busy}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    className="history-close-button"
                    type="button"
                    title="Cancel edit"
                    aria-label="Cancel edit"
                    disabled={busy}
                    onClick={cancelTitleEdit}
                  >
                    <X size={15} />
                  </button>
                  {historyError && (
                    <p className="error" role="alert">
                      {historyError}
                    </p>
                  )}
                </form>
              ) : (
                <div
                  className={`chat-history-row chat-history-entry ${session?.id === item.id ? "selected" : ""}`}
                  key={item.id}
                >
                  <button
                    type="button"
                    className="chat-history-item"
                    disabled={busy}
                    aria-current={session?.id === item.id ? "true" : undefined}
                    onClick={() => {
                      cancelTitleEdit();
                      void openSession(item.id);
                    }}
                  >
                    <strong>{getHistoryTitle(item)}</strong>
                    <small>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </small>
                  </button>
                  <button
                    className="chat-history-action"
                    type="button"
                    title="Edit title"
                    aria-label={`Edit title for ${item.title || "conversation from " + new Date(item.updatedAt).toLocaleDateString()}`}
                    disabled={busy}
                    onClick={() => {
                      setHistoryError("");
                      setTitleEdit({
                        id: item.id,
                        title: getHistoryTitle(item).slice(0, 255),
                      });
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="chat-history-action"
                    type="button"
                    title="Delete conversation"
                    aria-label={`Delete ${item.title || "conversation from " + new Date(item.updatedAt).toLocaleDateString()}`}
                    disabled={busy}
                    onClick={() => {
                      cancelTitleEdit();
                      setDeleteTarget({
                        id: item.id,
                        title: getHistoryTitle(item),
                      });
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ),
            )}
        </aside>
        {deleteTarget && (
          <Modal
            title="Delete conversation"
            busy={busy}
            onClose={closeDeleteModal}
          >
            <form
              className="inline-form record-edit-form"
              onSubmit={(event) => {
                event.preventDefault();
                void updateHistory({ id: deleteTarget.id });
              }}
            >
              <p>
                Delete “{deleteTarget.title}” and all its messages? This cannot
                be undone.
              </p>
              {historyError && (
                <p className="error" role="alert">
                  {historyError}
                </p>
              )}
              <div className="inline-actions record-modal-actions">
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={closeDeleteModal}
                >
                  Cancel
                </button>
                <button type="submit" className="button danger" disabled={busy}>
                  {busy ? "Deleting…" : "Delete conversation"}
                </button>
              </div>
            </form>
          </Modal>
        )}
        <div className="chat-layout">
          <section className="panel chat-panel">
            <div className="chat-scope">
              <button
                className="history-toggle"
                type="button"
                aria-expanded={historyOpen}
                aria-controls="chat-history"
                aria-label="Open chat history"
                onClick={() => setHistoryOpen(true)}
              >
                <PanelLeftOpen size={17} />
              </button>
              <span className="scope-icon">
                <Sparkles size={17} />
              </span>
              <span className="scope-copy">
                <span className="assistant-kicker">CURRENT CONVERSATION</span>
                <strong>
                  {restoredIds !== null
                    ? "saved conversation"
                    : file
                      ? data.documents.find((item) => item.id === file)?.name
                      : notebook
                        ? scopedNotebooks.find((item) => item.id === notebook)
                            ?.noteBookName
                        : data.courses.find((item) => item.id === course)
                            ?.name || "your notes"}
                </strong>
              </span>
              <span className="scope-count">{sources.length} ready</span>
            </div>
            <div
              className="chat-messages"
              role="log"
              aria-label="Conversation"
              ref={transcript}
            >
              {messages.length === 0 ? (
                <div className="chat-welcome">
                  <span className="welcome-orbit">
                    <span className="large-spark">
                      <Sparkles size={28} />
                    </span>
                  </span>
                  <span className="assistant-kicker">YOUR STUDY COMPANION</span>
                  <h2>
                    {sources.length
                      ? "What are you curious about?"
                      : "Good questions start here."}
                  </h2>
                  <p>
                    {sources.length
                      ? "Ask anything about your selected notes. Your assistant will find relevant passages to guide the answer."
                      : "Choose a course and add documents to get started. Once processing is complete, your notes will be ready to explore here."}
                  </p>
                  {sources.length ? (
                    <div
                      className="assistant-prompts"
                      aria-label="Suggested questions"
                    >
                      {[
                        "Summarize the key ideas",
                        "Explain a difficult concept",
                        "Help me prepare for a test",
                      ].map((prompt) => (
                        <button
                          type="button"
                          key={prompt}
                          disabled={busy}
                          onClick={() => setQuestion(prompt)}
                        >
                          {prompt}
                          <ArrowUpRight size={15} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Link className="assistant-upload-link" to="/documents">
                      <BookOpen size={16} /> Go to my documents{" "}
                      <ArrowUpRight size={15} />
                    </Link>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    className={`message ${message.role}`}
                    key={message.id}
                    aria-label={
                      message.role === "user"
                        ? "Your message"
                        : "Assistant message"
                    }
                  >
                    <span className="message-avatar" aria-hidden="true">
                      {message.role === "user" ? (
                        getNameInitials(displayName).slice(0, 2)
                      ) : (
                        <Sparkles size={16} />
                      )}
                    </span>
                    <div className="message-content">
                      <p>{message.text}</p>
                      {message.sources?.map((source) => (
                        <Link
                          className="citation"
                          key={source.chunkId}
                          to={`/documents/${source.documentId}`}
                        >
                          <FileText size={14} /> {source.documentName}
                          {source.pageNumber != null
                            ? ` · page ${source.pageNumber}`
                            : ""}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {activity === "sending" && (
                <div className="message assistant chat-searching" role="status">
                  <span className="message-avatar" aria-hidden="true">
                    <Sparkles size={16} />
                  </span>
                  <span className="chat-searching-label">
                    <span className="chat-searching-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </span>
                </div>
              )}
              {activity === "opening" && (
                <p role="status">Opening conversation…</p>
              )}
            </div>
            {scopeChanged && (
              <p className="notice">
                The ready documents have changed. Your next question will start
                a new conversation with the current selection.
              </p>
            )}
            <form
              className="chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void ask(question);
              }}
            >
              <textarea
                aria-label="Your question"
                placeholder="Ask something about your notes…"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                readOnly={busy}
                disabled={!sources.length}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();

                    if (question.trim() && !busy && sources.length) {
                      void ask(question);
                    }
                  }
                }}
              />
              <button
                className="button primary"
                aria-label="Send question"
                disabled={busy || !sources.length || !question.trim()}
              >
                <Send size={17} /> <span>Send</span>
              </button>
            </form>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <p className="chat-disclaimer">
              Answers use your selected notes · Enter to send, Shift + Enter for
              a new line
            </p>
          </section>
          <aside className="panel source-panel">
            <div className="sources-heading">
              <span className="sources-heading-icon">
                <Layers3 size={18} />
              </span>
              <div>
                <span className="assistant-kicker">STUDY MATERIAL</span>
                <h3>Your sources</h3>
              </div>
            </div>
            <p>Choose the notes your assistant should use.</p>
            {restoredIds !== null && (
              <div className="notice chat-restored-notice">
                This conversation uses its original {restoredIds.length}{" "}
                selected document{restoredIds.length === 1 ? "" : "s"}. Change a
                filter to start a new conversation.
                {sources.length < restoredIds.length &&
                  " Some documents are not ready and will not be searched."}
              </div>
            )}
            <label>
              Course
              <select
                value={course}
                disabled={busy}
                onChange={(event) => {
                  setCourse(event.target.value);
                  setNotebook("");
                  setFile("");
                  reset();
                }}
              >
                {!data.courses.length && <option value="">No courses</option>}
                {data.courses.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Notebook
              <select
                value={notebook}
                disabled={busy}
                onChange={(event) => {
                  setNotebook(event.target.value);
                  setFile("");
                  reset();
                }}
              >
                <option value="">All notebooks</option>
                {scopedNotebooks.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.noteBookName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Specific file
              <select
                value={file}
                disabled={busy}
                onChange={(event) => {
                  setFile(event.target.value);
                  reset();
                }}
              >
                <option value="">All files in scope</option>
                {scopedFiles.map((item) => (
                  <option
                    value={item.id}
                    key={item.id}
                    disabled={item.status !== "ready"}
                  >
                    {item.name}
                    {item.status !== "ready" ? ` (${item.status})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="source-list">
              <div className="sources-list-heading">
                <span className="assistant-kicker">READY TO SEARCH</span>
                <span>{sources.length}</span>
              </div>
              <div
                className="source-list-scroll"
                role="region"
                aria-label="Ready documents"
                tabIndex={0}
              >
                {sources.map((item) => (
                  <Link key={item.id} to={`/documents/${item.id}`}>
                    <span className="source-file-icon">
                      <FileText size={16} />
                    </span>
                    <span className="source-file-name">
                      {item.name}
                      <small>Ready to use</small>
                    </span>
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
                {!sources.length && (
                  <div className="assistant-source-empty">
                    <BookOpen size={18} />
                    <strong>No ready sources yet</strong>
                    <span>
                      Documents appear here once processing is complete.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
