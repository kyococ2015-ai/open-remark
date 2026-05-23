import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { GoogleTagManager } from "@next/third-parties/google"
import config from "@/config/config.json"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "OpenRemark - An Open-source Comment System for Static Websites",
  description:
    "OpenRemark is an open-source comment system for static sites built with Astro, Hugo, or Next.js. It aims to provide a fully featured commenting experience with minimal setup.",
}

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
    >
      {/* google tag manager */}
      {config.google_tag_manager.enable && (
        <GoogleTagManager gtmId={config.google_tag_manager.gtm_id} />
      )}

      <script
        async
        crossOrigin="anonymous"
        src="https://tweakcn.com/live-preview.min.js"
      />

      {/* Meta Informations */}
      {/* Favicon */}
      <link rel="icon" type="image/x-icon" href="/images/favicon.png" />

      <body suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
