"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

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

export function ControlsTab() {
  const [checked, setChecked] = useState(true)
  const [switchOn, setSwitchOn] = useState(true)

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Block label="Input">
        <div className="flex flex-col gap-3">
          <Input placeholder="Default input" />
          <Input placeholder="Disabled input" disabled />
        </div>
      </Block>

      <Block label="Textarea">
        <div className="flex flex-col gap-3">
          <Textarea placeholder="Default textarea" rows={3} />
          <Textarea placeholder="Disabled textarea" disabled rows={3} />
        </div>
      </Block>

      <Block label="Label + Input">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ex-input">Email address</Label>
          <Input id="ex-input" type="email" placeholder="you@example.com" />
        </div>
      </Block>

      <Block label="Checkbox">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="cb-checked"
              checked={checked}
              onCheckedChange={(v) => setChecked(!!v)}
            />
            <Label htmlFor="cb-checked">Checked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cb-unchecked" />
            <Label htmlFor="cb-unchecked">Unchecked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cb-disabled" disabled />
            <Label htmlFor="cb-disabled" className="text-muted-foreground">
              Disabled
            </Label>
          </div>
        </div>
      </Block>

      <Block label="Switch">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="sw-on"
              checked={switchOn}
              onCheckedChange={setSwitchOn}
            />
            <Label htmlFor="sw-on">{switchOn ? "On" : "Off"}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sw-disabled" disabled />
            <Label htmlFor="sw-disabled" className="text-muted-foreground">
              Disabled
            </Label>
          </div>
        </div>
      </Block>

      <Block label="Dropdown Menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Options <ChevronDown className="ml-1 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Block>

      <Block label="ScrollArea">
        <ScrollArea className="h-36 rounded-md border border-border p-3">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i}>
              <p className="text-sm text-muted-foreground">
                Scroll item {i + 1}
              </p>
              {i < 19 && <Separator className="my-1" />}
            </div>
          ))}
        </ScrollArea>
      </Block>
    </div>
  )
}
