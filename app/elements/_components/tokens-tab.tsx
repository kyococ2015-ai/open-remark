function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-10">
      <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-12 w-full rounded-md border border-border"
        style={{ background: `var(${name})` }}
      />
      <span className="text-[11px] font-medium text-foreground">{name}</span>
      <span className="text-[10px] text-muted-foreground">{value}</span>
    </div>
  )
}

const colorGroups: {
  label: string
  tokens: { name: string; value: string }[]
}[] = [
  {
    label: "Base",
    tokens: [
      { name: "--background", value: "oklch(0.9934 0.0017 174.5)" },
      { name: "--foreground", value: "oklch(0.2464 0.0358 168.9)" },
      { name: "--card", value: "oklch(1.0000 0 0)" },
      { name: "--popover", value: "oklch(1.0000 0 0)" },
    ],
  },
  {
    label: "Brand",
    tokens: [
      { name: "--primary", value: "oklch(0.6373 0.1362 162.5)" },
      { name: "--secondary", value: "oklch(0.9593 0.0088 174.3)" },
      { name: "--accent", value: "oklch(0.9498 0.0187 174.0)" },
      { name: "--muted", value: "oklch(0.9572 0.0053 174.4)" },
    ],
  },
  {
    label: "Semantic",
    tokens: [
      { name: "--destructive", value: "oklch(0.6356 0.2082 25.4)" },
      { name: "--border", value: "oklch(0.9161 0.0142 174.1)" },
      { name: "--input", value: "oklch(0.9161 0.0142 174.1)" },
      { name: "--ring", value: "oklch(0.6373 0.1362 162.5)" },
    ],
  },
  {
    label: "Charts",
    tokens: [
      { name: "--chart-1", value: "oklch(0.6373 0.1362 162.5)" },
      { name: "--chart-2", value: "oklch(0.7303 0.1378 170.3)" },
      { name: "--chart-3", value: "oklch(0.7521 0.1557 160.2)" },
      { name: "--chart-4", value: "oklch(0.7791 0.0991 181.3)" },
      { name: "--chart-5", value: "oklch(0.8441 0.0580 172.4)" },
    ],
  },
  {
    label: "Sidebar",
    tokens: [
      { name: "--sidebar", value: "oklch(0.9861 0.0023 174.5)" },
      { name: "--sidebar-primary", value: "oklch(0.6373 0.1362 162.5)" },
      { name: "--sidebar-accent", value: "oklch(0.9470 0.0140 174.1)" },
      { name: "--sidebar-border", value: "oklch(0.9302 0.0118 174.2)" },
    ],
  },
]

const radiusTokens = [
  { label: "sm", var: "--radius-sm" },
  { label: "md", var: "--radius-md" },
  { label: "lg", var: "--radius-lg" },
  { label: "xl", var: "--radius-xl" },
]

const shadowTokens = [
  "shadow-2xs",
  "shadow-xs",
  "shadow-sm",
  "shadow",
  "shadow-md",
  "shadow-lg",
  "shadow-xl",
  "shadow-2xl",
]

export function TokensTab() {
  return (
    <div>
      {colorGroups.map((group) => (
        <Section key={group.label} title={group.label}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {group.tokens.map((t) => (
              <Swatch key={t.name} name={t.name} value={t.value} />
            ))}
          </div>
        </Section>
      ))}

      <Section title="Radius">
        <div className="flex flex-wrap gap-4">
          {radiusTokens.map((r) => (
            <div key={r.var} className="flex flex-col items-center gap-2">
              <div
                className="size-16 border-2 border-primary bg-primary/10"
                style={{ borderRadius: `var(${r.var})` }}
              />
              <span className="text-xs text-muted-foreground">{r.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shadows">
        <div className="flex flex-col gap-4">
          {shadowTokens.map((s) => (
            <div
              key={s}
              className={`rounded-lg bg-card px-4 py-3 text-sm font-medium text-foreground shadow-${s}`}
            >
              {s}
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
