import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, Coupon } from '@/types';
import { VAT_RATE } from '@/lib/constants';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (coupon: Coupon | null) => void;
  subtotal: number;
  discount: number;
  vatAmount: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('bellevue-cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    localStorage.setItem('bellevue-cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, qty = 1) => {
    setItems(current => {
      const existing = current.find(item => item.product.id === product.id);
      if (existing) {
        return current.map(item =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + qty }
            : item
        );
      }
      return [...current, { product, qty }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(current => current.filter(item => item.product.id !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    setItems(current =>
      current.map(item =>
        item.product.id === productId ? { ...item, qty } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (coupon: Coupon | null) => {
    setAppliedCoupon(coupon);
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.product.sale_price ?? item.product.price;
    return sum + price * item.qty;
  }, 0);

  const discount = appliedCoupon
    ? appliedCoupon.discount_type === 'percent'
      ? subtotal * (appliedCoupon.value / 100)
      : Math.min(appliedCoupon.value, subtotal)
    : 0;

  const taxableAmount = subtotal - discount;
  const vatAmount = taxableAmount * VAT_RATE;
  const total = taxableAmount + vatAmount;
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        appliedCoupon,
        applyCoupon,
        subtotal,
        discount,
        vatAmount,
        total,
        itemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
