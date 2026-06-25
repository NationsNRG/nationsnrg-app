"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/authenticated-fetch";

interface SavedView {
  id: string;
  view_name: string;
  view_description: string | null;
  filter_payload: Record<string, unknown>;
  is_system_view: boolean;
}

interface OperatorSavedViewsBarProps {
  viewScope?: "intake_dashboard";
  basePath?: string;
}

function buildHref(basePath: string, payload: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }

    if (typeof value === "number") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export default function OperatorSavedViewsBar({
  viewScope = "intake_dashboard",
  basePath = "/intake/deal",
}: OperatorSavedViewsBarProps) {
  const [loading, setLoading] = useState(true);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [filterJson, setFilterJson] = useState("{}");

  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editViewName, setEditViewName] = useState("");
  const [editViewDescription, setEditViewDescription] = useState("");
  const [editFilterJson, setEditFilterJson] = useState("{}");

  const [saving, setSaving] = useState(false);
  const [updatingViewId, setUpdatingViewId] = useState<string | null>(null);
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadViews() {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch(
  `/api/operator/saved-views?viewScope=${viewScope}`,
      );

      const data = (await response.json()) as
        | { ok: true; savedViews: SavedView[] }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to load saved views. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load saved views.");
      }

      setSavedViews(Array.isArray(data.savedViews) ? data.savedViews : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved views.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadViews();
  }, [viewScope]);

  async function saveView(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const parsed = JSON.parse(filterJson) as Record<string, unknown>;

      const response = await authenticatedFetch("/api/operator/saved-views", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          viewScope,
          viewName,
          viewDescription: viewDescription.trim() === "" ? null : viewDescription,
          filterPayload: parsed,
        }),
      });

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to save view. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to save view.");
      }

      setMessage("Saved view created.");
      setViewName("");
      setViewDescription("");
      setFilterJson("{}");

      await loadViews();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Filter JSON must be valid JSON.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to save view.");
      }
    } finally {
      setSaving(false);
    }
  }

  function startEdit(view: SavedView) {
    if (view.is_system_view) {
      setError("System saved views are locked and cannot be edited.");
      return;
    }

    setEditingViewId(view.id);
    setEditViewName(view.view_name);
    setEditViewDescription(view.view_description ?? "");
    setEditFilterJson(JSON.stringify(view.filter_payload, null, 2));
    setMessage(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingViewId(null);
    setEditViewName("");
    setEditViewDescription("");
    setEditFilterJson("{}");
  }

  async function updateView(viewId: string) {
    try {
      setUpdatingViewId(viewId);
      setMessage(null);
      setError(null);

      const parsed = JSON.parse(editFilterJson) as Record<string, unknown>;

      const response = await authenticatedFetch(`/api/operator/saved-views/${viewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          viewName: editViewName,
          viewDescription:
            editViewDescription.trim() === "" ? null : editViewDescription,
          filterPayload: parsed,
        }),
      });

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string; locked?: boolean };

      if (!response.ok) {
        throw new Error(`Failed to update saved view. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update saved view.");
      }

      setMessage("Saved view updated.");
      cancelEdit();
      await loadViews();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Edit filter JSON must be valid JSON.");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to update saved view.",
        );
      }
    } finally {
      setUpdatingViewId(null);
    }
  }

  async function deleteView(view: SavedView) {
    if (view.is_system_view) {
      setError("System saved views are locked and cannot be deleted.");
      return;
    }

    try {
      setDeletingViewId(view.id);
      setMessage(null);
      setError(null);

      const response = await authenticatedFetch(`/api/operator/saved-views/${view.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as
        | { ok: true; deletedViewName: string }
        | { ok: false; error?: string; locked?: boolean };

      if (!response.ok) {
        throw new Error(`Failed to delete saved view. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to delete saved view.");
      }

      setMessage(`Deleted saved view: ${data.deletedViewName}.`);
      if (editingViewId === view.id) {
        cancelEdit();
      }
      await loadViews();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete saved view.",
      );
    } finally {
      setDeletingViewId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Saved Views</h2>
          <p className="text-sm text-gray-400">
            Operator presets for fast intake filtering. System views are locked.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadViews()}
          disabled={
            loading ||
            saving ||
            updatingViewId !== null ||
            deletingViewId !== null
          }
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Views"}
        </button>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-green-800 bg-green-950 p-3 text-sm text-green-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {savedViews.length === 0 ? (
          <p className="text-sm text-gray-400">No saved views found.</p>
        ) : (
          savedViews.map((view) => (
            <div
              key={view.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              {editingViewId === view.id ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs uppercase text-gray-500">
                      View Name
                    </label>
                    <input
                      type="text"
                      value={editViewName}
                      onChange={(e) => setEditViewName(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase text-gray-500">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editViewDescription}
                      onChange={(e) => setEditViewDescription(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase text-gray-500">
                      Filter JSON
                    </label>
                    <textarea
                      value={editFilterJson}
                      onChange={(e) => setEditFilterJson(e.target.value)}
                      className="min-h-32 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-xs text-white"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void updateView(view.id)}
                      disabled={
                        updatingViewId !== null || deletingViewId !== null || saving
                      }
                      className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
                    >
                      {updatingViewId === view.id ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={updatingViewId !== null}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={buildHref(basePath, view.filter_payload)}
                      className="text-sm font-medium text-white hover:underline"
                      title={view.view_description ?? ""}
                    >
                      {view.is_system_view ? "★ " : ""}
                      {view.view_name}
                    </a>

                    {view.is_system_view ? (
                      <span className="rounded-full border border-blue-800 bg-blue-950 px-2 py-1 text-xs font-medium uppercase text-blue-300">
                        locked
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(view)}
                          disabled={
                            deletingViewId !== null || updatingViewId !== null
                          }
                          className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteView(view)}
                          disabled={deletingViewId !== null}
                          className="rounded-lg border border-red-800 bg-red-950 px-2 py-1 text-xs font-medium text-red-300 disabled:opacity-50"
                        >
                          {deletingViewId === view.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-gray-400">
                    {view.view_description ?? "No description."}
                  </p>

                  <pre className="mt-3 overflow-x-auto rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                    {JSON.stringify(view.filter_payload, null, 2)}
                  </pre>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={saveView}
        className="space-y-4 rounded-xl border border-gray-800 bg-black p-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">View Name</label>
            <input
              type="text"
              required
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="Florida High Bill"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Description
            </label>
            <input
              type="text"
              value={viewDescription}
              onChange={(e) => setViewDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="FL deals above 10000 monthly."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Filter JSON
          </label>
          <textarea
            value={filterJson}
            onChange={(e) => setFilterJson(e.target.value)}
            className="min-h-28 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white"
            placeholder='{"state":"FL","minBill":"10000"}'
          />
        </div>

        <button
          type="submit"
          disabled={saving || deletingViewId !== null || updatingViewId !== null}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save View"}
        </button>
      </form>
    </section>
  );
}
