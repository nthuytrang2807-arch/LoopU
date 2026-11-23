import { useCallback, useEffect, useState } from 'react';
import { AccountView } from './components/AccountView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { GreenCreditView } from './components/GreenCreditView';
import { Header } from './components/Header';
import { MarketplaceView } from './components/MarketplaceView';
import { OrdersView } from './components/OrdersView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SellItemView } from './components/SellItemView';
import { ToastContainer } from './components/ToastContainer';
import { t } from './i18n/translations';
import { api, setStudentToken } from './lib/api';
import {
  ActiveView,
  AppLang,
  CartItem,
  Order,
  Product,
  ToastMessage,
  UserProfile,
} from './types';

export default function App() {
  const [lang, setLang] = useState<AppLang>('vi');
  const [activeView, setActiveView] = useState<ActiveView>('marketplace');

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellerFilter, setSellerFilter] = useState<{ id: string; name: string } | null>(
    null
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback(
    (
      type: ToastMessage['type'],
      title: string,
      description?: string
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await api.getProducts();
      setProducts(res.products);
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Không thể tải danh mục sản phẩm.'
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [notify]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.getOrders();
      setOrders(res.orders);
    } catch {
      // Keep current orders if silent refresh fails
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, [fetchProducts, fetchOrders]);

  // Support deep link ?item=prd-xxx
  useEffect(() => {
    if (products.length === 0) return;
    const itemId = new URLSearchParams(window.location.search).get('item');
    if (itemId) {
      const found = products.find((p) => p.id === itemId);
      if (found) {
        setSelectedProduct(found);
      }
    }
  }, [products]);

  const handleToggleWishlist = (productId: string) => {
    const strings = t(lang);
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      notify(
        'info',
        exists
          ? strings.marketplace.savedRemoved
          : strings.marketplace.savedAdded
      );
      return exists
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
    });
  };

  const handleAddToCart = (product: Product, qty = 1) => {
    if (product.stock <= 0) {
      notify('warning', t(lang).marketplace.outOfStock);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + qty);
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: nextQty } : i
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, qty) }];
    });
    notify(
      'success',
      t(lang).marketplace.addedToCart,
      lang === 'vi' ? product.title : product.titleEn
    );
  };

  const handleBuyNow = (product: Product, qty: number) => {
    handleAddToCart(product, qty);
    setSelectedProduct(null);
    setCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(i.product.stock, qty) }
          : i
      )
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleOrderCreated = async (order: Order) => {
    setCart([]);
    setCartOpen(false);
    setHighlightedOrderId(order.id);
    await Promise.all([fetchProducts(), fetchOrders()]);
    setActiveView('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProductUpdated = (updated: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setSelectedProduct((prev) =>
      prev && prev.id === updated.id ? updated : prev
    );
  };

  const handleFilterBySeller = (seller: { id: string; name: string } | null) => {
    setSellerFilter(seller);
    if (seller) {
      setActiveView('marketplace');
    }
  };

  const handleNavigate = (view: ActiveView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setStudentToken(null);
    setCurrentUser(null);
    notify(
      'info',
      lang === 'vi' ? 'Đã đăng xuất tài khoản' : 'Signed out'
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0F1412]">
      <Header
        lang={lang}
        activeView={activeView}
        onNavigate={handleNavigate}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {activeView === 'marketplace' && (
          <MarketplaceView
            lang={lang}
            onChangeLang={setLang}
            products={products}
            loading={loadingProducts}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onSelectProduct={setSelectedProduct}
            onGoSell={() => handleNavigate('sell')}
            sellerFilter={sellerFilter}
            onFilterBySeller={handleFilterBySeller}
            onNotify={notify}
          />
        )}

        {activeView === 'sell' && (
          <SellItemView
            lang={lang}
            currentUser={currentUser}
            products={products}
            onRefreshProducts={fetchProducts}
            onGoAccount={() => handleNavigate('account')}
            onSelectProduct={setSelectedProduct}
            onNotify={notify}
          />
        )}

        {activeView === 'orders' && (
          <OrdersView
            lang={lang}
            orders={orders}
            products={products}
            highlightedOrderId={highlightedOrderId}
            onRefreshOrders={async () => {
              await Promise.all([fetchOrders(), fetchProducts()]);
            }}
            onSelectProduct={setSelectedProduct}
            onGoExplore={() => handleNavigate('marketplace')}
            onNotify={notify}
          />
        )}

        {activeView === 'green_credit' && (
          <GreenCreditView
            lang={lang}
            onNavigate={handleNavigate}
            onNotify={notify}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboardView
            lang={lang}
            onRefreshStorefront={async () => {
              await Promise.all([fetchProducts(), fetchOrders()]);
            }}
            onSelectProduct={setSelectedProduct}
            onNotify={notify}
          />
        )}

        {activeView === 'account' && (
          <AccountView
            lang={lang}
            currentUser={currentUser}
            products={products}
            orders={orders}
            wishlistIds={wishlistIds}
            onAuthSuccess={(user) => setCurrentUser(user)}
            onUserUpdated={(user) => setCurrentUser(user)}
            onLogout={handleLogout}
            onSelectProduct={setSelectedProduct}
            onAddToCart={handleAddToCart}
            onGoSell={() => handleNavigate('sell')}
            onGoOrders={() => handleNavigate('orders')}
            onNotify={notify}
          />
        )}
      </main>

      <Footer lang={lang} onChangeLang={setLang} onNavigate={handleNavigate} />

      <ProductDetailModal
        product={selectedProduct}
        lang={lang}
        currentUser={currentUser}
        isSaved={
          selectedProduct ? wishlistIds.includes(selectedProduct.id) : false
        }
        onClose={() => setSelectedProduct(null)}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onFilterBySeller={handleFilterBySeller}
        onProductUpdated={handleProductUpdated}
        onNotify={notify}
      />

      <CartDrawer
        open={cartOpen}
        lang={lang}
        items={cart}
        currentUser={currentUser}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onOrderCreated={handleOrderCreated}
        onNotify={notify}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
