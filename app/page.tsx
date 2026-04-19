import { Disclaimer } from "./components/Disclaimer";
import { FeedbackForm } from "./components/FeedbackForm";
import { MacroDataAsOf } from "./components/MacroDataAsOf";
import { MacroRefreshPanel } from "./components/MacroRefreshPanel";
import { Nav } from "./components/Nav";
import { UploadForm } from "./components/UploadForm";

/** Avoid Prisma on `/` during `next build`; macro “last refreshed” loads at request time (Neon/Vercel). */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <Nav />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Macro Link</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Upload an Australian <strong>Retail</strong> budget or forecast, confirm account mappings, then view a macro
          scenario overlay with transparent drivers (CPI / WPI / retail turnover proxies cached locally).
        </p>
      </header>
      <Disclaimer />
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">1. Upload financials</h2>
        <UploadForm />
      </section>
      <MacroDataAsOf />
      <section className="text-sm text-neutral-600 dark:text-neutral-400">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Flow</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Use <strong>Refresh macro data</strong> at the bottom of this page when the cache is empty (e.g. new
            database).
          </li>
          <li>Upload spreadsheet → answer questions → review mappings → open results and download CSV.</li>
        </ol>
      </section>
      <FeedbackForm />
      <MacroRefreshPanel />
    </main>
  );
}
