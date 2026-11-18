import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase/client";
import {
  useDisplayName,
  useProfile,
  useSavePreferredName,
} from "../hooks/useProfile";
import PageHeading from "../components/PageHeading";

const SettingsForm = () => {
  const navigate = useNavigate();
  const profile = useProfile();
  const displayName = useDisplayName();
  const savePreferredName = useSavePreferredName();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setName(profile.data?.preferredName ?? "");
  }, [profile.data?.preferredName]);

  return (
    <div className="settings-page study-page">
      <PageHeading
        title="Settings"
        description="A study space that works for you."
      />
      <section className="panel settings-panel">
        <h2>Profile</h2>
        <p>Your display name is {displayName}.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            try {
              await savePreferredName(name);
              setFailed(false);
              setMessage("Preferred name saved.");
            } catch (error) {
              setFailed(true);
              setMessage(
                error instanceof Error ? error.message : "Unable to save name.",
              );
            }
          }}
        >
          <label>
            Preferred name (optional)
            <input
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="button primary">Save preferred name</button>
        </form>

        {message && (
          <p
            role={failed ? "alert" : "status"}
            className={failed ? "error" : "notice"}
          >
            {message}
          </p>
        )}
      </section>

      <section className="panel settings-panel">
        <h2>Account & workspace</h2>
        <div className="inline-actions">
          <button
            className="button"
            onClick={async () => {
              const result = await supabase?.auth.signOut();

              if (result?.error) {
                setFailed(true);
                setMessage(result.error.message);
                return;
              }

              navigate("/", { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsForm;
