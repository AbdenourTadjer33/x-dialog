import * as React from "react"
import {
  BoxesIcon,
  KeyboardIcon,
  PencilIcon,
  PlusIcon,
  UserPlusIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDialogStack } from "@/components/x-dialog"
import { cn } from "@/lib/utils"
import {
  formatMoney,
  orderStatus,
  orderTotal,
  useBackOffice,
  type Tab,
} from "@/store/back-office"
import { useBackOfficeActions } from "@/store/use-back-office-actions"

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  return Boolean(
    element?.closest?.(
      "input, textarea, select, [contenteditable=''], [contenteditable='true']"
    )
  )
}

/** `?` and `N` open dialogs from a plain key handler — no component to mount. */
function useShortcuts(actions: ReturnType<typeof useBackOfficeActions>) {
  const dialogsOpen = useDialogStack().length > 0
  const latest = React.useRef({ actions, dialogsOpen })
  React.useEffect(() => {
    latest.current = { actions, dialogsOpen }
  })

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target) || latest.current.dialogsOpen) return
      if (event.key === "?") {
        event.preventDefault()
        void latest.current.actions.showShortcuts()
      } else if (event.key === "n" || event.key === "N") {
        event.preventDefault()
        void latest.current.actions.createProduct()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}

const STATUS_VARIANT = {
  paid: "secondary",
  "partially refunded": "outline",
  refunded: "outline",
} as const

/**
 * A small coffee-shop back office. Every button here awaits a dialog; the
 * dialogs read and write this same state through `useBackOffice()`.
 */
export function BackOffice({ className }: { className?: string }) {
  const office = useBackOffice()
  const actions = useBackOfficeActions()
  useShortcuts(actions)

  const rowClass = (key: string) =>
    cn(
      "transition-colors duration-700",
      office.highlighted === key && "bg-resolved/10"
    )

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl bg-card text-sm ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3">
        <div className="mr-auto">
          <div className="font-medium">Bean &amp; Kettle</div>
          <div className="text-xs text-muted-foreground">
            Cash drawer {formatMoney(office.expectedCashCents)}
            {office.closings.length > 0
              ? ` · closed ${office.closings.length}× today`
              : ""}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          onClick={() => void actions.showShortcuts()}
        >
          <KeyboardIcon />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void actions.closeRegister()}
        >
          Close register
        </Button>
      </div>

      <Tabs
        value={office.tab}
        onValueChange={(value) => office.setTab(value as Tab)}
        className="gap-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>
          {office.tab === "products" ? (
            <Button size="sm" onClick={() => void actions.createProduct()}>
              <PlusIcon data-icon="inline-start" />
              New product
            </Button>
          ) : null}
        </div>

        <TabsContent value="products">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {office.products.map((product) => (
                <TableRow
                  key={product.id}
                  className={rowClass(`product:${product.id}`)}
                >
                  <TableCell className="max-w-0 pl-4">
                    <div className="truncate font-medium">{product.name}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {product.sku}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(product.priceCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.stock < 5 ? (
                      <Badge variant="destructive">{product.stock} left</Badge>
                    ) : (
                      product.stock
                    )}
                  </TableCell>
                  <TableCell className="w-0 pr-4">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Adjust stock of ${product.name}`}
                        title="Adjust stock"
                        onClick={() => void actions.adjustStock(product)}
                      >
                        <BoxesIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${product.name}`}
                        title="Edit"
                        onClick={() => void actions.editProduct(product)}
                      >
                        <PencilIcon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="orders">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Order</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {office.orders.map((order) => {
                const status = orderStatus(order)
                return (
                  <TableRow
                    key={order.id}
                    className={rowClass(`order:${order.id}`)}
                  >
                    <TableCell className="max-w-0 pl-4">
                      <div className="font-medium">
                        #{order.number}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {order.payment}
                        </span>
                      </div>
                      {order.customer ? (
                        <div className="truncate text-xs text-muted-foreground">
                          {order.customer}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void actions.assignCustomer(order)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                          <UserPlusIcon className="size-3" />
                          Walk-in · assign customer
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(orderTotal(order))}
                      {order.refundedCents > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          −{formatMoney(order.refundedCents)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                    </TableCell>
                    <TableCell className="w-0 pr-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={status === "refunded"}
                        onClick={() => void actions.refundOrder(order)}
                      >
                        Refund
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
        Press <kbd className="font-mono">N</kbd> for a new product or{" "}
        <kbd className="font-mono">?</kbd> for shortcuts.
      </p>
    </div>
  )
}
