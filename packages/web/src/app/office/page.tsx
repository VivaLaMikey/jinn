"use client"
import dynamic from "next/dynamic"
import { PageLayout } from "@/components/page-layout"
import { useBreadcrumbs } from "@/context/breadcrumb-context"

const OfficeView = dynamic(() => import("./office-view"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[var(--bg)]">
      <p className="font-mono text-sm text-[var(--text-tertiary)] animate-pulse">Loading office...</p>
    </div>
  ),
})

export default function OfficePage() {
  // Pass empty breadcrumbs so the desktop header bar is hidden — the office
  // is immersive and has its own title bar chrome.
  useBreadcrumbs([])
  return (
    <PageLayout>
      <OfficeView />
    </PageLayout>
  )
}
