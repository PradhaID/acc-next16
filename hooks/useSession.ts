"use client";

import { useState, useEffect } from "react";

interface SessionUser {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  timezone: string;
  roleIds: string[];
}

let cachedSession: SessionUser | null | undefined = undefined;

export function useSession() {
  const [session, setSession] = useState<SessionUser | null | undefined>(cachedSession);
  const [loading, setLoading] = useState(cachedSession === undefined);

  useEffect(() => {
    if (cachedSession !== undefined) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          const user = data
            ? {
                _id: data._id,
                username: data.username,
                fullName: data.fullName,
                email: data.email,
                timezone: data.timezone,
                roleIds: data.roleIds || [],
              }
            : null;
          cachedSession = user;
          setSession(user);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          cachedSession = null;
          setSession(null);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { session, loading };
}

export function usePermission(roleId: string): boolean {
  const { session, loading } = useSession();
  if (loading || !session) return false;
  return session.roleIds.includes(roleId);
}
