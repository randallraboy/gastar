"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/expenses", label: "Expenses" },
  { href: "/receipts", label: "Capture", primary: true },
  { href: "/receipts", label: "Receipts", match: "/receipts" },
  { href: "/categories", label: "Categories" },
] as const;

const DESKTOP_LINKS = [
  { href: "/expenses", label: "Expenses" },
  { href: "/receipts", label: "Receipts" },
  { href: "/categories", label: "Categories" },
] as const;

function isActive(pathname: string, href: string, label: string) {
  if (href === "/receipts" && label === "Capture") {
    return pathname === "/receipts";
  }
  if (href === "/receipts" && label === "Receipts") {
    return pathname === "/receipts";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="nav nav-desktop" aria-label="Main">
        {DESKTOP_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive(pathname, link.href, link.label) ? "nav-link-active" : undefined
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <nav className="bottom-nav" aria-label="Main">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={[
              "bottom-nav-item",
              "primary" in tab && tab.primary ? "bottom-nav-item-primary" : "",
              isActive(pathname, tab.href, tab.label) ? "bottom-nav-item-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
