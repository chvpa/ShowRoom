
import React from 'react';
import Header from './header';
import Logo from './logo';
import { 
  Layers, 
  Tag, 
  Package, 
  Percent, 
  Clock,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';

type LayoutProps = {
  children: React.ReactNode;
  activePage?: string;
};

const navItems = [
  { icon: Layers, label: "Catálogo", href: "/", id: "catalog" },
  { icon: Tag, label: "Marcas", href: "/brands", id: "brands" },
  { icon: Package, label: "Productos", href: "/products", id: "products" },
  { icon: Percent, label: "Ofertas", href: "/offers", id: "offers" },
  { icon: Clock, label: "Preventa", href: "/presale", id: "presale" },
  { icon: Users, label: "Usuarios", href: "/users", id: "users" },
];

const Layout = ({ children, activePage = "catalog" }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar>
          <SidebarHeader className="p-4">
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navegación</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={activePage === item.id}
                        tooltip={item.label}
                      >
                        <Link to={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <div className="text-xs text-sidebar-foreground/70">
              Showroom v1.0
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarRail />
        
        <SidebarInset className="w-full">
          <div className="flex flex-col h-full">
            <Header />
            <main className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
