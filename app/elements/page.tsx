import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { TokensTab } from "./_components/tokens-tab"
import { ComponentsTab } from "./_components/components-tab"
import { ControlsTab } from "./_components/controls-tab"
import { ChartsTab } from "./_components/charts-tab"
import { DashboardTab } from "./_components/dashboard-tab"

export default function ElementsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Elements</h1>
      </div>

      <Tabs defaultValue="tokens">
        <TabsList className="mb-6">
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens">
          <TokensTab />
        </TabsContent>
        <TabsContent value="components">
          <ComponentsTab />
        </TabsContent>
        <TabsContent value="controls">
          <ControlsTab />
        </TabsContent>
        <TabsContent value="charts">
          <ChartsTab />
        </TabsContent>
        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
      </Tabs>

      <ThemeToggle />
    </div>
  )
}
