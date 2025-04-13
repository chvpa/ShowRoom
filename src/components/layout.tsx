import React from "react";
import Header from "./header";
import Logo from "./logo";
import {
  Layers,
  Tag,
  Package,
  Percent,
  Clock,
  Users,
  ShoppingCart,
  Menu,
  PanelRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useBrand } from "@/contexts/brand-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

type LayoutProps = {
  children: React.ReactNode;
  activePage?: string;
};

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  id: string;
  roles: Array<"superadmin" | "admin" | "cliente">;
};

const navItems: NavItem[] = [
  {
    icon: Layers,
    label: "Catálogo",
    href: "/catalog",
    id: "catalog",
    roles: ["superadmin", "admin", "cliente"],
  },
  {
    icon: Package,
    label: "Productos",
    href: "/products",
    id: "products",
    roles: ["superadmin", "admin"],
  },
  {
    icon: Percent,
    label: "Ofertas",
    href: "/offers",
    id: "offers",
    roles: ["superadmin", "admin"],
  },
  {
    icon: Clock,
    label: "Preventa",
    href: "/presale",
    id: "presale",
    roles: ["superadmin", "admin"],
  },
  {
    icon: Tag,
    label: "Marcas",
    href: "/brands",
    id: "brands",
    roles: ["superadmin"],
  },
  {
    icon: Users,
    label: "Usuarios",
    href: "/users",
    id: "users",
    roles: ["superadmin"],
  },
];

// Componente interno que maneja la navegación con acceso a useSidebar
const NavigationMenu = ({ activePage }: { activePage: string }) => {
  const { user } = useAuth();
  const { selectedBrand } = useBrand();
  const isMobile = useIsMobile();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  // Filter navigation items based on user role
  const filteredNavItems = user
    ? navItems.filter((item) => item.roles.includes(user.role))
    : [];

  // Función para generar URLs con el formato de marca
  const getNavItemHref = (item: NavItem): string => {
    if (!selectedBrand) return item.href;

    // Si tenemos una marca seleccionada y es un enlace que debe incluir la marca
    if (["catalog", "cart"].includes(item.id)) {
      const slugName = selectedBrand.name.toLowerCase();

      switch (item.id) {
        case "catalog":
          return `/${slugName}/catalogo`;
        case "cart":
          return `/${slugName}/carrito`;
        default:
          return item.href;
      }
    }

    return item.href;
  };

  // Manejar navegación cerrando el sidebar en mobile
  const handleNavigation = (href: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(href);
  };

  return (
    <SidebarMenu>
      {isMobile && (
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            onClick={toggleSidebar}
          >
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      {filteredNavItems.map((item) => (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            asChild
            isActive={activePage === item.id}
            tooltip={item.label}
            onClick={() => handleNavigation(getNavItemHref(item))}
          >
            <button className="w-full flex items-center">
              <item.icon />
              <span>{item.label}</span>
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
};

// Componente para manejar el sidebar desde el Header
const SidebarMenuWrapper = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 md:inline-flex"
      onClick={toggleSidebar}
    >
      <PanelRight />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

// Componente interno para el header del sidebar
const SidebarHeaderContent = () => {
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-row justify-between w-full">
      <Logo />
      {isMobile && (
        <button onClick={toggleSidebar}>
          <PanelRight className="w-5 h-5 text-primary" />
        </button>
      )}
    </div>
  );
};

const Layout = ({ children, activePage = "catalog" }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar>
          <SidebarHeader className="p-4">
            <SidebarHeaderContent />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navegación</SidebarGroupLabel>
              <SidebarGroupContent>
                <NavigationMenu activePage={activePage} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <div className="text-xs text-sidebar-foreground/70">
              Showroom v1.0
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="w-full">
          <div className="flex flex-col h-full">
            <Header sidebarTrigger={<SidebarMenuWrapper />} />
            <main className="flex-1 p-4 md:p-6">{children}</main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
