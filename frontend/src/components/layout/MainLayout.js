import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  FileSpreadsheet,
  ShoppingBag,
  Wheat,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/ventas", label: "Nueva Venta", icon: ShoppingCart },
  { path: "/compras", label: "Compras", icon: ShoppingBag },
  { path: "/productos", label: "Productos", icon: Package },
  { path: "/inventario", label: "Inventario", icon: ClipboardList },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/proveedores", label: "Proveedores", icon: Truck },
  { path: "/historial-ventas", label: "Historial", icon: History },
  { path: "/reportes", label: "Reportes", icon: FileSpreadsheet },
];

const mobileNavItems = [
  { path: "/", label: "Inicio", icon: LayoutDashboard },
  { path: "/ventas", label: "Venta", icon: ShoppingCart },
  { path: "/productos", label: "Productos", icon: Package },
  { path: "/inventario", label: "Inventario", icon: ClipboardList },
];

const NavItem = ({ item, isActive, collapsed, onClick }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center px-3 py-2.5 rounded-lg transition-all duration-300 relative overflow-hidden group",
        "hover:bg-rose-50 hover:text-rose-700",
        isActive && "bg-rose-50 text-rose-700 font-medium",
        !isActive && "text-slate-600",
        collapsed ? "justify-center px-2" : "justify-start px-3",
      )}
      data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
      title={collapsed ? item.label : ""}
    >
      <Icon
        className={cn(
          "h-5 w-5 flex-shrink-0 transition-colors duration-300",
          isActive
            ? "text-rose-600"
            : "text-slate-500 group-hover:text-rose-600",
        )}
      />
      <span
        className={cn(
          "text-sm whitespace-nowrap transition-all duration-300 ease-in-out origin-left absolute left-10",
          collapsed
            ? "opacity-0 translate-x-4 scale-95 pointer-events-none w-0 overflow-hidden"
            : "opacity-100 translate-x-0 scale-100 w-auto",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
};

const MainLayout = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { itemCount } = useCartStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-white border-r border-rose-100/50 shadow-sm transition-all duration-500 ease-in-out hidden lg:block",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-rose-100/50 transition-all duration-300 px-4 whitespace-nowrap overflow-hidden relative",
          )}
        >
          <div className="flex items-center gap-3 w-full">
            <div
              className={cn(
                "w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-rose-200 shadow-md flex-shrink-0 transition-all duration-300",
                collapsed ? "ml-0.5" : "",
              )}
            >
              <Wheat className="h-5 w-5 text-white" />
            </div>
            <div
              className={cn(
                "transition-all duration-300 ease-in-out flex flex-col justify-center overflow-hidden whitespace-nowrap",
                collapsed ? "opacity-0 w-0" : "opacity-100 w-auto ml-3",
              )}
            >
              <h1 className="text-base font-bold text-slate-800 leading-tight">
                ADMINITRACION
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                {/* Inversiones Svan */}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1.5 mt-2">
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
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-rose-100 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-all duration-300 shadow-sm z-50"
          data-testid="sidebar-collapse-btn"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-500 ease-in-out pb-20 lg:pb-0 h-full",
          collapsed ? "lg:ml-[4.5rem]" : "lg:ml-64",
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-rose-100/50 h-14 transition-all duration-300">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            {/* Mobile Menu */}
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-72 p-0 border-r-rose-100"
                >
                  <div className="flex items-center h-16 border-b border-rose-100/50 px-6 bg-rose-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-md">
                        <Wheat className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h1 className="text-base font-bold text-slate-800"></h1>
                        <p className="text-xs text-slate-500 font-medium">
                          Inversiones Svan
                        </p>
                      </div>
                    </div>
                  </div>
                  <nav className="p-4 space-y-1.5">
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-sm">
                <Wheat className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-900">SVAN</span>
            </div>

            {/* Desktop Title */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
                {navItems.find((item) => item.path === location.pathname)
                  ?.label || "Dashboard"}
              </h2>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {location.pathname !== "/ventas" && itemCount > 0 && (
                <Link to="/ventas">
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors"
                    data-testid="cart-btn"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ring-2 ring-white">
                      {itemCount}
                    </span>
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 pl-2 pr-1 hover:bg-rose-50 rounded-full transition-colors"
                    data-testid="user-menu-btn"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-rose-100">
                      <AvatarFallback className="bg-rose-100 text-rose-700 font-bold text-xs">
                        {user?.nombre?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-slate-700 mr-1">
                      {user?.nombre}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 mt-2 border-rose-100"
                >
                  <div className="px-3 py-2 bg-rose-50/50">
                    <p className="text-sm font-semibold text-slate-800">
                      {user?.nombre}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user?.email}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center mt-2 px-2 py-0.5 text-[10px] font-medium rounded-full border",
                        user?.role === "admin"
                          ? "bg-rose-100 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-600 border-slate-200",
                      )}
                    >
                      {user?.role === "admin" ? "Administrador" : "Vendedor"}
                    </span>
                  </div>
                  <DropdownMenuSeparator className="bg-rose-100/50" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 m-1 rounded-md cursor-pointer"
                    data-testid="logout-btn"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 animate-fade-in">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-rose-100 safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isCart = item.path === "/ventas";

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full relative transition-colors duration-200",
                  isActive
                    ? "text-rose-600"
                    : "text-slate-400 hover:text-slate-600",
                )}
                data-testid={`mobile-nav-${item.path.replace("/", "") || "dashboard"}`}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isActive && "scale-110",
                    )}
                  />
                  {isCart && itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-1 ring-white">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-rose-600 rounded-b-full shadow-[0_0_8px_rgba(225,29,72,0.6)]" />
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
