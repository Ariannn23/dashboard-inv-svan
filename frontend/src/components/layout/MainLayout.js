import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  ClipboardList,
  History,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/ventas', label: 'Nueva Venta', icon: ShoppingCart },
  { path: '/productos', label: 'Productos', icon: Package },
  { path: '/inventario', label: 'Inventario', icon: ClipboardList },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/proveedores', label: 'Proveedores', icon: Truck },
  { path: '/historial-ventas', label: 'Historial', icon: History },
];

const mobileNavItems = [
  { path: '/', label: 'Inicio', icon: LayoutDashboard },
  { path: '/ventas', label: 'Venta', icon: ShoppingCart },
  { path: '/productos', label: 'Productos', icon: Package },
  { path: '/inventario', label: 'Inventario', icon: ClipboardList },
];

const NavItem = ({ item, isActive, collapsed, onClick }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
        'hover:bg-teal-50 hover:text-teal-700',
        isActive && 'bg-teal-50 text-teal-700 font-medium',
        !isActive && 'text-slate-600',
        collapsed && 'justify-center px-2'
      )}
      data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span className="text-sm">{item.label}</span>}
    </Link>
  );
};

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300 hidden lg:block',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 border-b border-slate-200 px-4',
          collapsed && 'justify-center px-2'
        )}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900">SVAN ERP</h1>
                <p className="text-xs text-slate-500">Inversiones Svan</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors"
          data-testid="sidebar-collapse-btn"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3 text-slate-600" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-slate-600" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <div className={cn(
        'transition-all duration-300 pb-20 lg:pb-0',
        collapsed ? 'lg:ml-16' : 'lg:ml-64'
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-14">
          <div className="flex items-center justify-between h-full px-4">
            {/* Mobile Menu */}
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <div className="flex items-center h-16 border-b border-slate-200 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">S</span>
                      </div>
                      <div>
                        <h1 className="text-base font-semibold text-slate-900">SVAN ERP</h1>
                        <p className="text-xs text-slate-500">Inversiones Svan</p>
                      </div>
                    </div>
                  </div>
                  <nav className="p-3 space-y-1">
                    {navItems.map((item) => (
                      <NavItem
                        key={item.path}
                        item={item}
                        isActive={location.pathname === item.path}
                        collapsed={false}
                        onClick={() => setMobileMenuOpen(false)}
                      />
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center">
                <span className="text-white font-bold text-xs">S</span>
              </div>
              <span className="font-semibold text-slate-900">SVAN</span>
            </div>

            {/* Desktop Title */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-slate-900">
                {navItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {location.pathname !== '/ventas' && itemCount > 0 && (
                <Link to="/ventas">
                  <Button variant="outline" size="sm" className="relative" data-testid="cart-btn">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                      {itemCount}
                    </span>
                  </Button>
                </Link>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-btn">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-teal-100 text-teal-700 text-sm">
                        {user?.nombre?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-slate-700">
                      {user?.nombre}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.nombre}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                    <span className={cn(
                      'inline-block mt-1 px-2 py-0.5 text-xs rounded-full',
                      user?.role === 'admin' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                    )}>
                      {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600" data-testid="logout-btn">
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-bottom">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isCart = item.path === '/ventas';
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 w-full h-full relative',
                  isActive ? 'text-teal-700' : 'text-slate-500'
                )}
                data-testid={`mobile-nav-${item.path.replace('/', '') || 'dashboard'}`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {isCart && itemCount > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="text-xs">{item.label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-700 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MainLayout;
