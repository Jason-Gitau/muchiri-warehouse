import { useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  name: string;
  flavor: string;
  unitPrice: number;
  quantity: number;
  availableStock?: number;
}

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    loadCart();

    // Listen for cart updates from other components
    const handleCartUpdate = () => loadCart();
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const loadCart = () => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      setCartItems(JSON.parse(saved));
    }
  };

  const saveCart = (items: CartItem[]) => {
    localStorage.setItem('cart', JSON.stringify(items));
    setCartItems(items);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const addItem = (
    productId: string,
    name: string,
    flavor: string,
    unitPrice: number,
    quantity: number = 1,
    availableStock?: number
  ) => {
    const existingItem = cartItems.find(item => item.productId === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      // Check stock limit
      if (availableStock && newQuantity > availableStock) {
        throw new Error('Cannot add more than available stock');
      }

      const updated = cartItems.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      );
      saveCart(updated);
    } else {
      const newItem: CartItem = {
        productId,
        name,
        flavor,
        unitPrice,
        quantity,
        availableStock,
      };
      saveCart([...cartItems, newItem]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }

    const item = cartItems.find(i => i.productId === productId);

    // Check stock limit
    if (item?.availableStock && newQuantity > item.availableStock) {
      throw new Error('Cannot exceed available stock');
    }

    const updated = cartItems.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    );
    saveCart(updated);
  };

  const removeItem = (productId: string) => {
    const updated = cartItems.filter(item => item.productId !== productId);
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const getTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0
    );
  };

  const getItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const getSubtotal = (item: CartItem) => {
    return item.unitPrice * item.quantity;
  };

  return {
    cartItems,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getTotal,
    getItemCount,
    getSubtotal,
  };
}
