import {
  SiteDetail,
  SiteSummary,
  Ticket,
  User,
  WeeklyReport,
} from "./types.ts";

const API_BASE = "/api/v1";

let authToken =
  typeof localStorage !== "undefined"
    ? localStorage.getItem("saura_token") || ""
    : "";

export function setToken(token: string) {
  authToken = token;
  if (typeof localStorage !== "undefined") {
    if (token) {
      localStorage.setItem("saura_token", token);
    } else {
      localStorage.removeItem("saura_token");
    }
  }
}

export function getToken(): string {
  return authToken;
}

async function requestResponse(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = "Permintaan gagal";
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      errorDetail = `HTTP ${res.status}`;
    }
    throw new Error(errorDetail);
  }

  return res;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await requestResponse(endpoint, options);
  return response.json() as Promise<T>;
}

export const api = {
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.access_token);
    return res;
  },

  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  async listSites(): Promise<SiteSummary[]> {
    return request<SiteSummary[]>("/sites");
  },

  async getSite(siteId: string): Promise<SiteDetail> {
    return request<SiteDetail>(`/sites/${siteId}`);
  },

  async listTickets(status?: string): Promise<Ticket[]> {
    const query = status ? `?status=${status}` : "";
    return request<Ticket[]>(`/tickets${query}`);
  },

  async getTicket(ticketId: string): Promise<Ticket> {
    return request<Ticket>(`/tickets/${ticketId}`);
  },

  async approveTicket(ticketId: string): Promise<void> {
    await request(`/tickets/${ticketId}/approve`, { method: "POST" });
  },

  async postponeTicket(ticketId: string, note: string): Promise<void> {
    await request(`/tickets/${ticketId}/postpone`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  async markTicketDone(ticketId: string, note: string): Promise<void> {
    await request(`/tickets/${ticketId}/done`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  async getWeeklyReport(siteId: string, endDate?: string): Promise<WeeklyReport> {
    const q = endDate ? `?end_date=${endDate}` : "";
    return request<WeeklyReport>(`/reports/weekly/${siteId}${q}`);
  },

  async downloadWeeklyReport(siteId: string, format: "pdf" | "csv"): Promise<void> {
    const response = await requestResponse(`/reports/weekly/${encodeURIComponent(siteId)}/${format}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    try {
      anchor.href = url;
      anchor.download = `saura_laporan_mingguan_${siteId}.${format}`;
      document.body.append(anchor);
      anchor.click();
    } finally {
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  },

  async getSimStatus(): Promise<{ current_date: string; cutoff_passed: boolean }> {
    return request<{ current_date: string; cutoff_passed: boolean }>("/sim/status");
  },

  async advanceSim(toDate: string): Promise<{ current_date: string }> {
    return request<{ current_date: string }>("/sim/advance", {
      method: "POST",
      body: JSON.stringify({ to_date: toDate }),
    });
  },

  async seedSim(demoDate = "2026-10-26"): Promise<void> {
    await request("/sim/seed", {
      method: "POST",
      body: JSON.stringify({ reset: true, demo_date: demoDate }),
    });
  },
};
