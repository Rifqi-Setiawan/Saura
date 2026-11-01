
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, setToken } from "./api.ts";
import { SiteDetailModal } from "./components/SiteDetailModal.tsx";
import { SiteDetail } from "./types.ts";

afterEach(() => {
  setToken("");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("authenticated weekly report downloads", () => {
  it.each(["pdf", "csv"] as const)("downloads %s with the session header and releases the blob URL", async (format) => {
    setToken("download-test-session");
    const blob = new Blob([format === "pdf" ? "%PDF-test" : "tanggal,kwh"]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(blob));
    vi.stubGlobal("fetch", fetchMock);
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:weekly-report");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(anchor), body: { append: vi.fn() } });

    await api.downloadWeeklyReport("site-123", format);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/v1/reports/weekly/site-123/${format}`);
    expect(options.headers.get("Authorization")).toBe("Bearer download-test-session");
    expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchor.href).toBe("blob:weekly-report");
    expect(anchor.download).toBe(`saura_laporan_mingguan_site-123.${format}`);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith("blob:weekly-report");
  });

  it.each([401, 403, 500])("does not download an HTTP %s error as a report", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Akses laporan ditolak" }), { status })));
    const createUrl = vi.spyOn(URL, "createObjectURL");
    await expect(api.downloadWeeklyReport("site-123", "pdf")).rejects.toThrow("Akses laporan ditolak");
    expect(createUrl).not.toHaveBeenCalled();
  });

  it("propagates network failure without a fake download", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Jaringan terputus")));
    const createUrl = vi.spyOn(URL, "createObjectURL");
    await expect(api.downloadWeeklyReport("site-123", "csv")).rejects.toThrow("Jaringan terputus");
    expect(createUrl).not.toHaveBeenCalled();
  });

  it("renders report actions as buttons, not unauthenticated navigation links", () => {
    const site = { id: "site-123", name: "MA Nurul Huda", last_7_days: [], operator: null } as unknown as SiteDetail;
    const html = renderToStaticMarkup(<SiteDetailModal site={site} onClose={() => {}} />);
    expect(html).not.toContain("/reports/weekly/");
    expect(html).not.toContain("<a ");
    expect(html).toMatch(/<button[^>]*>[\s\S]*Ekspor Data CSV/);
    expect(html).toMatch(/<button[^>]*>[\s\S]*Unduh Laporan Mingguan PDF/);
  });
});
