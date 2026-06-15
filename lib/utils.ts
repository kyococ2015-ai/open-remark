import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Register the fluid type utilities (text-step-*) as font-sizes so tailwind-merge
// doesn't mistake them for text-color classes and drop them when merged with
// color utilities like text-transparent (e.g. the gradient pricing number).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "step--2",
            "step--1",
            "step-0",
            "step-1",
            "step-2",
            "step-3",
            "step-4",
            "step-5",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
