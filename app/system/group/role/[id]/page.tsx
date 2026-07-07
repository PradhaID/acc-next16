"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Role {
  _id: string;
  parent: string | null;
  name: string;
  description?: string;
  url?: string;
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  roles: string[];
}

interface Action {
  _id: string;
  name: string;
  url?: string;
}

interface SubModule {
  id: string;
  actions: Action[];
}

interface NestedRoles {
  [rootName: string]: {
    id: string;
    subs: {
      [subName: string]: SubModule;
    };
  };
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 font-medium animate-pulse">Loading permissions...</p>
    </div>
  );
}

export default function GroupRolePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    document.title = "Group Roles - AccNext";
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [gRes, rRes] = await Promise.all([
          fetch(`/api/system/groups?id=${id}&withRoles=true`),
          fetch("/api/system/roles"),
        ]);
        const gData = await gRes.json();
        const rData = await rRes.json();
        setGroup(gData);
        setAllRoles(rData);
      } catch (err) {
        console.error("Error loading group roles:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const nestedRoles = useMemo<NestedRoles>(() => {
    const tree: NestedRoles = {};
    const roots = allRoles.filter((r) => !r.parent);
    const subs = allRoles.filter((r) => r.parent && roots.some((rt) => rt._id === r.parent));
    const actions = allRoles.filter((r) => r.parent && subs.some((s) => s._id === r.parent));

    for (const root of roots) {
      const subMap: { [name: string]: SubModule } = {};
      const childSubs = subs.filter((s) => s.parent === root._id);
      for (const sub of childSubs) {
        subMap[sub.name] = {
          id: sub._id,
          actions: actions.filter((a) => a.parent === sub._id).map((a) => ({
            _id: a._id,
            name: a.name,
            url: a.url,
          })),
        };
      }
      tree[root.name] = { id: root._id, subs: subMap };
    }
    return tree;
  }, [allRoles]);

  const currentRoles: string[] = (group?.roles || []).map((r: any) => r._id || r);

  const isSubFullyChecked = (sub: SubModule): boolean => {
    const selfChecked = currentRoles.includes(sub.id);
    if (sub.actions.length === 0) return selfChecked;
    return selfChecked && sub.actions.every((a) => currentRoles.includes(a._id));
  };

  const isSubPartiallyChecked = (sub: SubModule): boolean => {
    if (sub.actions.length === 0) return false;
    const hasAny = currentRoles.includes(sub.id) || sub.actions.some((a) => currentRoles.includes(a._id));
    return hasAny && !isSubFullyChecked(sub);
  };

  const isRootFullyChecked = (rootName: string): boolean => {
    const root = nestedRoles[rootName];
    if (!root) return false;
    const selfChecked = currentRoles.includes(root.id);
    const subKeys = Object.keys(root.subs);
    if (subKeys.length === 0) return selfChecked;
    return selfChecked && subKeys.every((n) => isSubFullyChecked(root.subs[n]));
  };

  const isRootPartiallyChecked = (rootName: string): boolean => {
    const root = nestedRoles[rootName];
    if (!root) return false;
    const subKeys = Object.keys(root.subs);
    if (subKeys.length === 0) return false;
    const hasAny = currentRoles.includes(root.id) || subKeys.some((n) => {
      const s = root.subs[n];
      return isSubFullyChecked(s) || isSubPartiallyChecked(s);
    });
    return hasAny && !isRootFullyChecked(rootName);
  };

  const saveRoles = async (newRoleIds: string[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/system/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, roleIds: newRoleIds }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      // Re-fetch group to sync UI with server state
      const gRes = await fetch(`/api/system/groups?id=${id}&withRoles=true`);
      if (gRes.ok) setGroup(await gRes.json());
      setShowCheck(true);
      setTimeout(() => setShowCheck(false), 2000);
    } catch (err) {
      console.error("Failed to save roles:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = async (roleId: string) => {
    if (!group) return;
    const isChecked = currentRoles.includes(roleId);
    let newRoles: string[];

    if (isChecked) {
      newRoles = currentRoles.filter((r) => r !== roleId);
    } else {
      const toAdd = new Set(currentRoles);
      toAdd.add(roleId);
      for (const rootName in nestedRoles) {
        const root = nestedRoles[rootName];
        for (const subName in root.subs) {
          const sub = root.subs[subName];
          const action = sub.actions.find((a) => a._id === roleId);
          if (action) {
            toAdd.add(sub.id);
            toAdd.add(root.id);
            break;
          }
        }
      }
      newRoles = Array.from(toAdd);
    }

    setGroup({ ...group, roles: newRoles });
    await saveRoles(newRoles);
  };

  const toggleSubModule = async (sub: SubModule) => {
    if (!group) return;
    const isFullyChecked = isSubFullyChecked(sub);
    const actionIds = sub.actions.map((a) => a._id);
    let newRoles: string[];

    if (isFullyChecked) {
      newRoles = currentRoles.filter((r) => r !== sub.id && !actionIds.includes(r));
    } else {
      const toAdd = new Set(currentRoles);
      toAdd.add(sub.id);
      actionIds.forEach((a) => toAdd.add(a));
      for (const rootName in nestedRoles) {
        const root = nestedRoles[rootName];
        for (const subName in root.subs) {
          if (root.subs[subName].id === sub.id) {
            toAdd.add(root.id);
            break;
          }
        }
      }
      newRoles = Array.from(toAdd);
    }

    setGroup({ ...group, roles: newRoles });
    await saveRoles(newRoles);
  };

  const toggleRootModule = async (rootName: string) => {
    if (!group || !nestedRoles[rootName]) return;
    const root = nestedRoles[rootName];
    const isFullyChecked = isRootFullyChecked(rootName);
    const allIds: string[] = [root.id];
    for (const subName in root.subs) {
      const sub = root.subs[subName];
      allIds.push(sub.id);
      sub.actions.forEach((a) => allIds.push(a._id));
    }

    let newRoles: string[];
    if (isFullyChecked) {
      newRoles = currentRoles.filter((r) => !allIds.includes(r));
    } else {
      const toAdd = new Set(currentRoles);
      allIds.forEach((id) => toAdd.add(id));
      newRoles = Array.from(toAdd);
    }

    setGroup({ ...group, roles: newRoles });
    await saveRoles(newRoles);
  };

  if (loading || !group) return <LoadingSpinner />;

  const rootNames = Object.keys(nestedRoles);

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Group Roles</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Manage RBAC permissions for <span className="font-bold text-gray-700 dark:text-gray-200">{group.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/system/group/edit/${id}`}
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            Edit Group
          </Link>
          <Link
            href="/system/group"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Permissions */}
        <div className="lg:col-span-3 space-y-10">
          {rootNames.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-16 text-center shadow-sm">
              <p className="text-sm text-gray-500 font-medium">No roles defined in the system.</p>
            </div>
          ) : (
            rootNames.map((rootName) => {
              const root = nestedRoles[rootName];
              const rootChecked = isRootFullyChecked(rootName);
              const rootPartial = isRootPartiallyChecked(rootName);
              const subNames = Object.keys(root.subs);

              return (
                <div key={rootName}>
                  {/* Root module */}
                  <div
                    className="flex items-center gap-3 border-b-2 border-indigo-500 pb-2.5 cursor-pointer group"
                    onClick={() => toggleRootModule(rootName)}
                  >
                    <input
                      type="checkbox"
                      checked={rootChecked}
                      ref={(el) => { if (el) el.indeterminate = rootPartial; }}
                      readOnly
                      className="rounded text-indigo-600 w-5 h-5 cursor-pointer"
                    />
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                    </svg>
                    <h2 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                      {rootName}
                    </h2>
                  </div>

                  {/* Sub-modules */}
                  <div className="ml-6 mt-4 space-y-4">
                    {subNames.length === 0 ? (
                      <p className="text-xs text-gray-400 italic ml-2">No sub-modules</p>
                    ) : (
                      subNames.map((subName) => {
                        const sub = root.subs[subName];
                        const subChecked = isSubFullyChecked(sub);
                        const subPartial = isSubPartiallyChecked(sub);
                        const hasActions = sub.actions.length > 0;

                        return (
                          <div key={subName}>
                            <div
                              className="flex items-center gap-2 cursor-pointer group"
                              onClick={() => toggleSubModule(sub)}
                            >
                              <input
                                type="checkbox"
                                checked={subChecked}
                                ref={(el) => { if (el) el.indeterminate = subPartial; }}
                                readOnly
                                className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                              />
                              <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-indigo-500 transition-colors" />
                              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 transition-colors">
                                {subName}{hasActions ? " Management" : ""}
                              </h3>
                            </div>

                            {hasActions && (
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 ml-8 mt-3">
                                {sub.actions.map((action) => {
                                  const checked = currentRoles.includes(action._id);
                                  return (
                                    <div
                                      key={action._id}
                                      onClick={() => toggleRole(action._id)}
                                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                                        checked
                                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                                          : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-200 dark:hover:border-indigo-800"
                                      }`}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-gray-900 dark:text-white">{action.name}</div>
                                        {action.url && (
                                          <div className="text-[10px] font-mono text-gray-400 truncate">{action.url}</div>
                                        )}
                                      </div>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        readOnly
                                        className="rounded text-indigo-600 w-4 h-4"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 shadow-sm sticky top-6 border-t-4 border-t-indigo-600">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Access Summary
            </h3>

            <div className="space-y-5">
              <div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    Assigned
                    {saving ? (
                      <svg className="w-3 h-3 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                      </svg>
                    ) : showCheck ? (
                      <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {currentRoles.length}
                    <span className="text-xs text-gray-400 font-normal ml-1">/ {allRoles.length}</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-500"
                    style={{ width: `${Math.min((currentRoles.length / (allRoles.length || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500 font-bold">Group</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 truncate ml-2">{group.name}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500 font-bold">Roles</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{currentRoles.length} selected</span>
                </div>
              </div>

              <button
                onClick={() => router.push(`/system/group/edit/${id}`)}
                className="w-full py-2.5 px-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
              >
                Edit Group Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
