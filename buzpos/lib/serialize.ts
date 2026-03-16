import type { Order, OrderItem, Product } from "@prisma/client";

type OrderWithItems = Order & {
  items: (OrderItem & { product: Pick<Product, "id" | "name" | "qty" | "sellPrice"> })[];
  user?: { displayName: string };
};

type SafeOrderItem = Omit<OrderItem, "costPrice" | "lineProfit"> & {
  product: Pick<Product, "id" | "name" | "qty" | "sellPrice">;
};

type SafeOrder = Omit<Order, "totalProfit"> & {
  items: SafeOrderItem[];
  user?: { displayName: string };
};

export function stripSensitiveOrderFields(order: OrderWithItems): SafeOrder {
  const { totalProfit, items, ...rest } = order;
  return {
    ...rest,
    items: items.map((item) => {
      const { costPrice, lineProfit, ...safeItem } = item;
      return safeItem;
    }),
  };
}

export function stripSensitiveOrderListFields(
  orders: (Order & {
    items: (OrderItem & { product: { name: string } })[];
    user?: { displayName: string };
  })[]
) {
  return orders.map((order) => {
    const { totalProfit, items, ...rest } = order;
    return {
      ...rest,
      items: items.map((item) => {
        const { costPrice, lineProfit, ...safeItem } = item;
        return safeItem;
      }),
    };
  });
}
