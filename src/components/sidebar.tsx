import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Logo from './logo';
import { 
  Layers, 
  Tag, 
  Package, 
  Percent, 
  Clock,
  ShoppingBag
} from 'lucide-react';
type NavItemProps = {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive?: boolean;
};

const NavItem = ({ icon: Icon, label, href, isActive }: NavItemProps) => {
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
        isActive 
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
};

type SidebarProps = {
  activePage?: string;
};

const Sidebar = ({ activePage = "catalog" }: SidebarProps) => {

  const navItems = [
    { icon: Layers, label: "Catálogo", href: "/", id: "catalog" },
    { icon: Tag, label: "Marcas", href: "/brands", id: "brands" },
    { icon: Package, label: "Productos", href: "/products", id: "products" },
    { icon: ShoppingBag, label: "Pedidos", href: "/orders", id: "orders" },
    { icon: Percent, label: "Ofertas", href: "/offers", id: "offers" },
    { icon: Clock, label: "Preventa", href: "/presale", id: "presale" },
  ];

  return (
    <aside className="w-64 border-r bg-sidebar fixed inset-y-0 flex flex-col">
      <div className="p-6">
        <Logo />
        {/* TODO: Implementar selector de marca con el contexto de marca */}
        <div className="mt-4 text-sm text-muted-foreground">
          Selector de marca se manejará desde el contexto
        </div>
      </div>
      <div className="px-3 py-2">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={activePage === item.id}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
