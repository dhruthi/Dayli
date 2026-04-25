import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, RefreshCw, Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/site";

const STORAGE_KEY = "dayli_admin_token_v1";

interface ClinicLead {
  id: string;
  name: string;
  role: string;
  clinic: string;
  patients: string | null;
  city: string | null;
  email: string;
  message: string | null;
  locale: string;
  pageUrl: string | null;
  createdAt: string;
}

interface PharmaLead {
  id: string;
  name: string;
  company: string;
  therapeutic: string | null;
  email: string;
  message: string | null;
  locale: string;
  pageUrl: string | null;
  createdAt: string;
}

interface LeadsResponse {
  clinic: ClinicLead[];
  pharma: PharmaLead[];
}

function basicAuthHeader(password: string): string {
  const raw = `admin:${password}`;
  if (typeof btoa === "function") {
    return `Basic ${btoa(unescape(encodeURIComponent(raw)))}`;
  }
  return `Basic ${raw}`;
}

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminLeads() {
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved) setToken(saved);
    if (typeof document !== "undefined") {
      document.title = "Admin · Leads — dayli.ai";
      const meta = document.querySelector('meta[name="robots"]');
      if (meta) {
        meta.setAttribute("content", "noindex, nofollow");
      } else {
        const m = document.createElement("meta");
        m.name = "robots";
        m.content = "noindex, nofollow";
        document.head.appendChild(m);
      }
    }
  }, []);

  const fetchLeads = async (authToken: string): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/admin/leads"), {
        headers: { Authorization: authToken },
      });
      if (res.status === 401) {
        setError("Invalid password.");
        setToken("");
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
        return;
      }
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const body = (await res.json()) as LeadsResponse;
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void fetchLeads(token);
    }
  }, [token]);

  const handleLogin = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!password) return;
    const newToken = basicAuthHeader(password);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, newToken);
    }
    setToken(newToken);
    setPassword("");
  };

  const handleLogout = (): void => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    setToken("");
    setData(null);
  };

  const totals = useMemo(() => {
    return {
      clinic: data?.clinic.length ?? 0,
      pharma: data?.pharma.length ?? 0,
    };
  }, [data]);

  if (!token) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-16">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-lg p-6 space-y-5"
        >
          <div className="flex items-center gap-2 text-primary">
            <Lock size={20} />
            <h1 className="text-xl font-serif font-bold">dayli admin</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Restricted area. Enter the admin password to view lead submissions.
          </p>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold">Lead submissions</h1>
            <p className="text-sm text-muted-foreground">
              {totals.clinic} clinic · {totals.pharma} pharma
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchLeads(token)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {data && (
          <>
            <LeadTable
              title="Clinic leads"
              count={data.clinic.length}
              onExport={() =>
                downloadCsv(
                  `dayli-clinic-leads-${new Date().toISOString().slice(0, 10)}.csv`,
                  data.clinic as unknown as Record<string, unknown>[],
                )
              }
              columns={[
                { key: "createdAt", label: "When" },
                { key: "name", label: "Name" },
                { key: "role", label: "Role" },
                { key: "clinic", label: "Clinic" },
                { key: "city", label: "City" },
                { key: "patients", label: "Patients" },
                { key: "email", label: "Email" },
                { key: "locale", label: "Locale" },
                { key: "message", label: "Message" },
              ]}
              rows={data.clinic as unknown as Record<string, unknown>[]}
            />

            <LeadTable
              title="Pharma leads"
              count={data.pharma.length}
              onExport={() =>
                downloadCsv(
                  `dayli-pharma-leads-${new Date().toISOString().slice(0, 10)}.csv`,
                  data.pharma as unknown as Record<string, unknown>[],
                )
              }
              columns={[
                { key: "createdAt", label: "When" },
                { key: "name", label: "Name" },
                { key: "company", label: "Company" },
                { key: "therapeutic", label: "Therapeutic area" },
                { key: "email", label: "Email" },
                { key: "locale", label: "Locale" },
                { key: "message", label: "Message" },
              ]}
              rows={data.pharma as unknown as Record<string, unknown>[]}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface LeadTableProps {
  title: string;
  count: number;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  onExport: () => void;
}

function LeadTable({ title, count, columns, rows, onExport }: LeadTableProps) {
  return (
    <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{count} total</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={count === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </header>
      {count === 0 ? (
        <div className="p-6 text-sm text-muted-foreground text-center">No submissions yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="text-left font-medium px-4 py-2 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border align-top">
                  {columns.map((c) => {
                    const value = row[c.key];
                    if (c.key === "createdAt" && typeof value === "string") {
                      return (
                        <td key={c.key} className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                          {new Date(value).toLocaleString()}
                        </td>
                      );
                    }
                    if (c.key === "email" && typeof value === "string") {
                      return (
                        <td key={c.key} className="px-4 py-2">
                          <a className="text-primary underline" href={`mailto:${value}`}>
                            {value}
                          </a>
                        </td>
                      );
                    }
                    if (c.key === "message" && typeof value === "string") {
                      return (
                        <td key={c.key} className="px-4 py-2 max-w-xs">
                          <span className="block truncate" title={value}>
                            {value}
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={c.key} className="px-4 py-2 whitespace-nowrap">
                        {value == null || value === "" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          String(value)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
