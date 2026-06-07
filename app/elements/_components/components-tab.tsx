"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Bold, Italic, Underline } from "lucide-react"

function Block({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border p-5">
      <p className="mb-4 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  )
}

export function ComponentsTab() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Block label="Button — variants">
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
      </Block>

      <Block label="Button — sizes">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg">Large</Button>
          <Button size="default">Default</Button>
          <Button size="sm">Small</Button>
          <Button size="icon" aria-label="bold">
            <Bold />
          </Button>
        </div>
      </Block>

      <Block label="ButtonGroup">
        <ButtonGroup>
          <Button variant="outline" size="sm">
            <Bold />
          </Button>
          <ButtonGroupSeparator />
          <Button variant="outline" size="sm">
            <Italic />
          </Button>
          <ButtonGroupSeparator />
          <Button variant="outline" size="sm">
            <Underline />
          </Button>
        </ButtonGroup>
      </Block>

      <Block label="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Block>

      <Block label="Avatar">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>RH</AvatarFallback>
          </Avatar>
        </div>
      </Block>

      <Block label="Card">
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>A short description of the card.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Card body content goes here.
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Save</Button>
            <Button size="sm" variant="ghost">
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </Block>

      <Block label="Tabs (nested)">
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
            <TabsTrigger value="three">Three</TabsTrigger>
          </TabsList>
          <TabsContent value="one">
            <p className="pt-2 text-sm text-muted-foreground">
              Content for tab one.
            </p>
          </TabsContent>
          <TabsContent value="two">
            <p className="pt-2 text-sm text-muted-foreground">
              Content for tab two.
            </p>
          </TabsContent>
          <TabsContent value="three">
            <p className="pt-2 text-sm text-muted-foreground">
              Content for tab three.
            </p>
          </TabsContent>
        </Tabs>
      </Block>

      <Block label="Separator">
        <div className="flex flex-col gap-3">
          <p className="text-sm">Above separator</p>
          <Separator />
          <p className="text-sm">Below separator</p>
          <div className="flex h-6 items-center gap-3">
            <span className="text-sm">Left</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Right</span>
          </div>
        </div>
      </Block>

      <Block label="Skeleton">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </Block>

      <Block label="Tooltip">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Block>

      <Block label="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>
                This is a dialog description. It supports long text.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Dialog body content.
            </p>
            <DialogFooter>
              <Button>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Block>

      <Block label="Sheet">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">Open Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet Title</SheetTitle>
              <SheetDescription>Sheet description text here.</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Sheet body content.
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </Block>

      <Block label="Sonner (toast)">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast("Default toast")}>
            Default
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success("Success toast")}
          >
            Success
          </Button>
          <Button variant="outline" onClick={() => toast.error("Error toast")}>
            Error
          </Button>
        </div>
      </Block>
    </div>
  )
}
