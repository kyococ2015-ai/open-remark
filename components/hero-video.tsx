"use client"

import { useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import { cn } from "@/lib/utils"

const YOUTUBE_EMBED_SRC =
  "https://www.youtube-nocookie.com/embed/uOYTTEZhHfI?rel=0&modestbranding=1&autoplay=1"

export function HeroVideo() {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      {playing ? (
        <iframe
          className="animate-in fade-in absolute inset-0 h-full w-full duration-700 ease-out"
          src={YOUTUBE_EMBED_SRC}
          title="OpenRemark Demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play OpenRemark demo video"
          className="group absolute inset-0 cursor-pointer overflow-hidden"
        >
          <Image
            src="/images/product-featured.png"
            alt="OpenRemark product preview"
            fill
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover opacity-100 transition-opacity duration-300 ease-out group-hover:opacity-70"
          />
          <span className="absolute inset-0 bg-black/25 transition-colors duration-300 group-hover:bg-black/35" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/90 shadow-xl ring-1 ring-black/5 backdrop-blur-sm sm:size-20">
              <Play
                className="ml-1 size-6 text-primary sm:size-7"
                fill="currentColor"
                aria-hidden="true"
              />
            </span>
            <span
              className={cn(
                "absolute size-16 rounded-full bg-white/60 sm:size-20",
                "animate-[ripple-smooth_3.6s_cubic-bezier(0.16,1,0.3,1)_infinite]",
                "group-hover:[animation-play-state:paused]"
              )}
            />
          </span>
        </button>
      )}
    </div>
  )
}
