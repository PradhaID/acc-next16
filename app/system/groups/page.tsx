"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import SearchInput from "@/components/ui/SearchInput";
import { FormattedDateTime } from "@/hooks/useTimezone";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";
import type { Column } from "@/components/ui/DataTable";

interface Group {
  _id: string;
  name: string;
  description?: string;
  created: { at: string; by: string | null };
  updated: { at: string; by: string | null };
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filtered, setFiltered] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "Groups - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/system/groups")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setGroups(data);
          setFiltered(data);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const canAddGroup = usePermission(ROLES.ADD_GROUP);

  const handleSearch = (query: string) => {
    setSearch(query);
    const q = query.toLowerCase();
    setFiltered(
      groups.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q)
      )
    );
  };

  const columns: Column<Group>[] = [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "created", label: "Created", render: (row) => <FormattedDateTime date={row.created.at} /> },
  ];

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Groups"
        subtitle="Manage user groups and their role assignments"
        actions={
          canAddGroup && (
            <Link
              href="/system/groups/add"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Group
            </Link>
          )
        }
      />

      <SearchInput value={search} onChange={handleSearch} placeholder="Search groups..." />

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(row) => row._id}
        loading={loading}
        onRowClick={(row) => router.push(`/system/groups/edit/${row._id}`)}
      />
    </div>
  );
}
