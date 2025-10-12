
export interface MenuItem {
  id: number;
  name: string;
  price: number;
  emoji: string;
}

export interface OrderItem extends MenuItem {
  quantity: number;
}
