import { useRef, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Library,
  Files,
  Sparkles,
  Layers,
  ListChecks,
  Settings,
  Timer,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { getNameInitials } from "../lib/utils";
import Brand from "./Brand";

const navigation = [
  {
    label: "Workspace",
    links: [{ to: "/", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Library",
    links: [
      { to: "/courses", label: "Courses", icon: Library },
      { to: "/documents", label: "Documents", icon: Files },
    ],
  },
  {
    label: "Study tools",
    links: [
      { to: "/chat", label: "Study assistant", icon: Sparkles },
      { to: "/flashcards", label: "Flashcards", icon: Layers },
      { to: "/tests", label: "Tests", icon: ListChecks },
      { to: "/timer", label: "Focus timer", icon: Timer },
    ],
  },
];

export default function WorkspaceSidebar({
  loading = false,
}: {
  loading?: boolean;
}) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  const closeMenu = () => {
    if (!open) return;
    setOpen(false);
    // Keep focus visible when a mobile navigation link closes the menu.
    if (menuButton.current?.getClientRects().length) menuButton.current.focus();
  };

  return (
    <aside
      className="sidebar"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) closeMenu();
      }}
    >
      <div className="sidebar-heading">
        <Brand />
        <button
          ref={menuButton}
          type="button"
          className="button mobile-nav-toggle"
          aria-expanded={open}
          aria-controls="workspace-navigation"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? (
            <X size={18} aria-hidden="true" />
          ) : (
            <Menu size={18} aria-hidden="true" />
          )}
          Menu
        </button>
      </div>
      <div
        className="sidebar-content"
        id="workspace-navigation"
        data-open={open}
      >
        <nav aria-label="Workspace">
          {navigation.map(({ label: group, links }) => (
            <div className="workspace-nav-group" key={group}>
              <span className="workspace-label">{group}</span>
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className="nav-item"
                  onClick={closeMenu}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                  {to === "/chat" && <span className="new-tag">AI</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-account">
          <NavLink className="nav-item" to="/settings" onClick={closeMenu}>
            <Settings size={18} aria-hidden="true" />
            Settings
          </NavLink>
          <Link className="profile" to="/settings" onClick={closeMenu}>
            <span
              aria-hidden="true"
              className={loading ? "avatar skeleton sk-ui-icon" : "avatar"}
            >
              {getNameInitials(
                user?.user_metadata.full_name || user?.email || "Student",
              )}
            </span>
            <span>
              <strong className={loading ? "skeleton sk-text" : undefined}>
                {user?.user_metadata.full_name || "Student"}
              </strong>
              <small>{user?.email}</small>
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
