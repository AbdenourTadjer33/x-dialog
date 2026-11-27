import * as React from "react"

/* -------------------------------------------------------------------------- */
/* Domain                                                                     */
/* -------------------------------------------------------------------------- */

export type Product = {
  id: string
  name: string
  sku: string
  priceCents: number
  stock: number
}

export type OrderLine = {
  productId: string
  name: string
  quantity: number
  unitCents: number
  refunded: number
}

export type PaymentMethod = "cash" | "card"

export type Order = {
  id: string
  number: string
  customer: string | null
  lines: OrderLine[]
  payment: PaymentMethod
  refundedCents: number
}

export type RefundMethod = "original" | "store-credit"

export type Refund = {
  orderId: string
  lines: { productId: string; quantity: number }[]
  amountCents: number
  method: RefundMethod
  restock: boolean
  approvedBy: string | null
}

export type StockReason = "delivery" | "damaged" | "recount"

export type RegisterClosing = {
  expectedCents: number
  countedCents: number
  orders: number
  refundedCents: number
}

export type Tab = "products" | "orders"

/** Thrown by the fake server; dialogs show `message` inline and stay open. */
export class ApiError extends Error {
  readonly field?: string
  constructor(message: string, field?: string) {
    super(message)
    this.field = field
  }
}

export const OPENING_FLOAT_CENTS = 100_00
export const APPROVAL_THRESHOLD_CENTS = 50_00

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function orderTotal(order: Order): number {
  return order.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitCents,
    0
  )
}

export function orderStatus(
  order: Order
): "paid" | "partially refunded" | "refunded" {
  if (order.refundedCents === 0) return "paid"
  return order.refundedCents >= orderTotal(order)
    ? "refunded"
    : "partially refunded"
}

/* -------------------------------------------------------------------------- */
/* Seed data                                                                  */
/* -------------------------------------------------------------------------- */

const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Ethiopia Guji, 1 kg",
    sku: "BEAN-ETH-1K",
    priceCents: 34_00,
    stock: 18,
  },
  {
    id: "p2",
    name: "House espresso, 250 g",
    sku: "BEAN-HSE-250",
    priceCents: 12_50,
    stock: 42,
  },
  {
    id: "p3",
    name: "Gooseneck kettle",
    sku: "GEAR-KETL",
    priceCents: 64_00,
    stock: 4,
  },
  {
    id: "p4",
    name: "Ceramic dripper",
    sku: "GEAR-DRIP",
    priceCents: 28_00,
    stock: 11,
  },
  {
    id: "p5",
    name: "Paper filters ×100",
    sku: "SUPP-FILT",
    priceCents: 6_00,
    stock: 120,
  },
]

function line(product: Product, quantity: number): OrderLine {
  return {
    productId: product.id,
    name: product.name,
    quantity,
    unitCents: product.priceCents,
    refunded: 0,
  }
}

const [ethiopia, espresso, kettle, dripper, filters] = PRODUCTS as [
  Product,
  Product,
  Product,
  Product,
  Product,
]

const ORDERS: Order[] = [
  {
    id: "o1",
    number: "1041",
    customer: "Leila Silva",
    payment: "card",
    refundedCents: 0,
    lines: [line(kettle, 1), line(dripper, 1), line(filters, 2)],
  },
  {
    id: "o2",
    number: "1042",
    customer: null,
    payment: "cash",
    refundedCents: 0,
    lines: [line(espresso, 2)],
  },
  {
    id: "o3",
    number: "1043",
    customer: "Jonas Mansouri",
    payment: "cash",
    refundedCents: 0,
    lines: [line(ethiopia, 1), line(filters, 1)],
  },
  {
    id: "o4",
    number: "1044",
    customer: null,
    payment: "card",
    refundedCents: 0,
    lines: [line(dripper, 2), line(espresso, 1)],
  },
]

/* -------------------------------------------------------------------------- */
/* Store                                                                      */
/* -------------------------------------------------------------------------- */

const LATENCY_MS = 650

function respond<T>(work: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(work())
      } catch (error) {
        reject(error)
      }
    }, LATENCY_MS)
  })
}

type BackOffice = {
  products: Product[]
  orders: Order[]
  closings: RegisterClosing[]
  expectedCashCents: number
  tab: Tab
  setTab: (tab: Tab) => void
  /** Row to flash after an action, as `${kind}:${id}`. */
  highlighted: string | null
  highlight: (key: string) => void

  saveProduct: (
    input: Omit<Product, "id"> & { id?: string }
  ) => Promise<Product>
  adjustStock: (
    productId: string,
    delta: number,
    reason: StockReason
  ) => Promise<Product>
  refundOrder: (refund: Refund) => Promise<Order>
  assignCustomer: (orderId: string, customer: string) => void
  closeRegister: (closing: RegisterClosing) => Promise<void>
}

const BackOfficeContext = React.createContext<BackOffice | null>(null)

export function BackOfficeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [products, setProducts] = React.useState(PRODUCTS)
  const [orders, setOrders] = React.useState(ORDERS)
  const [closings, setClosings] = React.useState<RegisterClosing[]>([])
  const [tab, setTab] = React.useState<Tab>("products")
  const [highlighted, setHighlighted] = React.useState<string | null>(null)

  // the fake server reads the latest data, like a real one would
  const latest = React.useRef({ products, orders })
  React.useEffect(() => {
    latest.current = { products, orders }
  })

  React.useEffect(() => {
    if (!highlighted) return
    const timer = setTimeout(() => setHighlighted(null), 1600)
    return () => clearTimeout(timer)
  }, [highlighted])

  const expectedCashCents = React.useMemo(() => {
    const sales = orders
      .filter((order) => order.payment === "cash")
      .reduce((sum, order) => sum + orderTotal(order) - order.refundedCents, 0)
    return OPENING_FLOAT_CENTS + sales
  }, [orders])

  const saveProduct = React.useCallback<BackOffice["saveProduct"]>(
    (input) =>
      respond(() => {
        const sku = input.sku.trim().toUpperCase()
        const clash = latest.current.products.find(
          (product) => product.sku === sku && product.id !== input.id
        )
        if (clash)
          throw new ApiError(`${clash.name} already uses this SKU.`, "sku")

        const saved: Product = {
          ...input,
          sku,
          id: input.id ?? `p${Date.now()}`,
        }
        setProducts((current) =>
          input.id
            ? current.map((product) =>
                product.id === input.id ? saved : product
              )
            : [...current, saved]
        )
        return saved
      }),
    []
  )

  const adjustStock = React.useCallback<BackOffice["adjustStock"]>(
    (productId, delta) =>
      respond(() => {
        const product = latest.current.products.find((p) => p.id === productId)
        if (!product) throw new ApiError("This product no longer exists.")
        if (product.stock + delta < 0) {
          throw new ApiError(
            `Only ${product.stock} in stock — you can't remove ${-delta}.`,
            "quantity"
          )
        }
        const updated = { ...product, stock: product.stock + delta }
        setProducts((current) =>
          current.map((p) => (p.id === productId ? updated : p))
        )
        return updated
      }),
    []
  )

  const refundOrder = React.useCallback<BackOffice["refundOrder"]>(
    (refund) =>
      respond(() => {
        const order = latest.current.orders.find((o) => o.id === refund.orderId)
        if (!order) throw new ApiError("This order no longer exists.")

        const updated: Order = {
          ...order,
          refundedCents: order.refundedCents + refund.amountCents,
          lines: order.lines.map((l) => {
            const refunded = refund.lines.find(
              (r) => r.productId === l.productId
            )
            return refunded
              ? { ...l, refunded: l.refunded + refunded.quantity }
              : l
          }),
        }
        setOrders((current) =>
          current.map((o) => (o.id === order.id ? updated : o))
        )

        if (refund.restock) {
          setProducts((current) =>
            current.map((p) => {
              const returned = refund.lines.find((r) => r.productId === p.id)
              return returned ? { ...p, stock: p.stock + returned.quantity } : p
            })
          )
        }
        return updated
      }),
    []
  )

  const assignCustomer = React.useCallback(
    (orderId: string, customer: string) => {
      setOrders((current) =>
        current.map((o) => (o.id === orderId ? { ...o, customer } : o))
      )
    },
    []
  )

  const closeRegister = React.useCallback<BackOffice["closeRegister"]>(
    (closing) => respond(() => setClosings((current) => [closing, ...current])),
    []
  )

  const value = React.useMemo<BackOffice>(
    () => ({
      products,
      orders,
      closings,
      expectedCashCents,
      tab,
      setTab,
      highlighted,
      highlight: setHighlighted,
      saveProduct,
      adjustStock,
      refundOrder,
      assignCustomer,
      closeRegister,
    }),
    [
      adjustStock,
      assignCustomer,
      closeRegister,
      closings,
      expectedCashCents,
      highlighted,
      orders,
      products,
      refundOrder,
      saveProduct,
      tab,
    ]
  )

  return (
    <BackOfficeContext.Provider value={value}>
      {children}
    </BackOfficeContext.Provider>
  )
}

export function useBackOffice(): BackOffice {
  const value = React.useContext(BackOfficeContext)
  if (!value)
    throw new Error("useBackOffice must be used inside BackOfficeProvider")
  return value
}
