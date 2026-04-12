import { NextResponse } from "next/server";
import { overlayToCsv } from "@/lib/csvExport";
import { buildMacroLinkWorkbookBuffer } from "@/lib/xlsxExport";
import { runComputeForSessionId } from "@/lib/computeRun";
import { getSessionCookieId } from "@/lib/sessionServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = await getSessionCookieId();
  if (!id) return NextResponse.json({ error: "No session" }, { status: 401 });
  try {
    const out = await runComputeForSessionId(id);
    const fmt = new URL(req.url).searchParams.get("format");
    if (fmt === "csv") {
      const csv = overlayToCsv(out.overlay);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="macro-link-pl.csv"',
        },
      });
    }

    const buf = buildMacroLinkWorkbookBuffer(out.overlay, out.narrative);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="macro-link-report.xlsx"',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
