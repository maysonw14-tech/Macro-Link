"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/questions", label: "Questions" },
  { href: "/mapping", label: "Mappings" },
  { href: "/results", label: "Results" },
];

function linkActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href;
}

export function Nav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3 text-sm dark:border-neutral-800">
      {links.map((l) => {
        const active = linkActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-neutral-100 px-2 py-1 font-medium text-neutral-900 underline decoration-neutral-400 underline-offset-4 dark:bg-neutral-800 dark:text-neutral-50"
                : "rounded-md px-2 py-1 text-neutral-700 underline-offset-4 hover:bg-neutral-50 hover:underline dark:text-neutral-200 dark:hover:bg-neutral-900/60"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
