import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Users as UsersIcon, UserPlus, MoreVertical, Edit, Trash, Eye, EyeOff, UserCheck, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Definición de tipos
interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'cliente';
  created_at: string;
  active: boolean;
  brands?: string[];
}

// Formulario de usuario
interface UserFormData {
  email: string;
  password: string;
  name: string;
  role: 'superadmin' | 'admin' | 'cliente';
  brands?: string[];
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [brands, setBrands] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    name: '',
    role: 'cliente',
    brands: []
  });
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const { toast } = useToast();
  const [showDirectSuperadminCreate, setShowDirectSuperadminCreate] = useState(false);
  const [directSuperadminData, setDirectSuperadminData] = useState({
    email: '',
    name: '',
  });

  // Cargar usuarios y marcas al iniciar
  useEffect(() => {
    fetchUsers();
    fetchBrands();
  }, []);

  // Obtener usuarios
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Obtener usuarios desde la tabla users
      const { data: authUsers, error: authError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (authError) throw authError;
      
      // Obtener asignaciones de marca para cada usuario
      const usersWithBrands = await Promise.all(
        (authUsers || []).map(async (user) => {
          const { data: userBrands, error: brandsError } = await supabase
            .from('user_brands')
            .select('brand_id')
            .eq('user_id', user.id);
          
          return {
            ...user,
            brands: userBrands ? userBrands.map(ub => ub.brand_id) : []
          };
        })
      );
      
      setUsers(usersWithBrands);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Obtener marcas
  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  // Abrir formulario para crear usuario
  const openCreateUserForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'cliente',
      brands: []
    });
    setSelectedBrands([]);
    setIsEditMode(false);
    setCurrentUser(null);
    setIsDialogOpen(true);
  };

  // Abrir formulario para editar usuario
  const openEditUserForm = (user: User) => {
    setFormData({
      email: user.email,
      password: '', // No mostramos la contraseña actual
      name: user.name,
      role: user.role,
      brands: user.brands
    });
    setSelectedBrands(user.brands || []);
    setIsEditMode(true);
    setCurrentUser(user);
    setIsDialogOpen(true);
  };

  // Manejar cambios en el formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manejar cambio de rol
  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as 'superadmin' | 'admin' | 'cliente' }));
  };

  // Manejar selección de marcas
  const handleBrandSelection = (brandId: string) => {
    setSelectedBrands(prev => {
      if (prev.includes(brandId)) {
        return prev.filter(id => id !== brandId);
      } else {
        return [...prev, brandId];
      }
    });
  };

  // Crear o actualizar usuario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && currentUser) {
        // Actualizar usuario existente
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: formData.name,
            role: formData.role,
            updated_at: new Date().toISOString()
            // No actualizamos email por seguridad
          })
          .eq('id', currentUser.id);
        
        if (updateError) throw updateError;
        
        // Si se proporcionó una nueva contraseña, actualizarla
        if (formData.password) {
          // En un entorno real, esto debería hacerse a través de un endpoint seguro en el servidor
          console.log('Cambio de contraseña detectado - implementar en backend');
        }
        
        // Actualizar marcas del usuario
        // Primero eliminamos todas las existentes
        await supabase
          .from('user_brands')
          .delete()
          .eq('user_id', currentUser.id);
        
        // Luego agregamos las nuevas selecciones
        if (selectedBrands.length > 0) {
          const brandInserts = selectedBrands.map(brandId => ({
            user_id: currentUser.id,
            brand_id: brandId
          }));
          
          const { error: brandsError } = await supabase
            .from('user_brands')
            .insert(brandInserts);
          
          if (brandsError) throw brandsError;
        }
        
        toast({
          title: "Usuario actualizado",
          description: "El usuario ha sido actualizado exitosamente.",
        });
      } else {
        // Crear nuevo usuario con Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
        
        if (authError) throw authError;
        
        if (!authData.user || !authData.user.id) {
          throw new Error('No se pudo obtener el ID del usuario creado');
        }
        
        const userId = authData.user.id;
        
        // Insertar en la tabla users
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: formData.email,
            name: formData.name,
            role: formData.role,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (userError) throw userError;
        
        // Asociar marcas al usuario
        if (selectedBrands.length > 0) {
          const brandInserts = selectedBrands.map(brandId => ({
            user_id: userId,
            brand_id: brandId
          }));
          
          const { error: brandsError } = await supabase
            .from('user_brands')
            .insert(brandInserts);
          
          if (brandsError) throw brandsError;
        }
        
        toast({
          title: "Usuario creado",
          description: `Se ha creado el usuario ${formData.email} exitosamente.`,
        });
      }
      
      // Cerrar el diálogo y refrescar la lista
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el usuario. Intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  // Manejar creación directa de superadmin
  const handleCreateDirectSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!directSuperadminData.email || !directSuperadminData.name) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: directSuperadminData.email,
        password: 'SuperAdmin123!', // Contraseña temporal que debe ser cambiada
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error("No se pudo crear el usuario en Auth");
      }
      
      // Llamar a la función RPC para crear superadmin directamente
      const { error: funcError } = await supabase.rpc(
        'create_superadmin_direct',
        {
          user_id: data.user.id,
          user_email: directSuperadminData.email,
          user_name: directSuperadminData.name
        }
      );
      
      if (funcError) throw funcError;
      
      toast({
        title: "Superadmin creado",
        description: `El superadmin ${directSuperadminData.name} ha sido creado exitosamente. La contraseña temporal es 'SuperAdmin123!'`,
      });
      
      setShowDirectSuperadminCreate(false);
      setDirectSuperadminData({ email: '', name: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error creating superadmin:', error);
      toast({
        title: "Error",
        description: `No se pudo crear el superadmin: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      });
    }
  };

  // Cambiar estado de activación de usuario
  const toggleUserActive = async (user: User) => {
    try {
      const newActiveState = !user.active;
      
      const { error } = await supabase
        .from('users')
        .update({ active: newActiveState })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Actualizar la lista de usuarios localmente
      setUsers(prev => 
        prev.map(u => u.id === user.id ? { ...u, active: newActiveState } : u)
      );
      
      toast({
        title: newActiveState ? "Usuario activado" : "Usuario desactivado",
        description: `${user.name} ha sido ${newActiveState ? 'activado' : 'desactivado'} exitosamente.`,
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del usuario.",
        variant: "destructive",
      });
    }
  };

  // Eliminar usuario
  const deleteUser = async (user: User) => {
    if (!confirm(`¿Está seguro que desea eliminar a ${user.name}?`)) {
      return;
    }
    
    try {
      // Primero eliminar relaciones en user_brands
      await supabase
        .from('user_brands')
        .delete()
        .eq('user_id', user.id);
      
      // Luego eliminar el usuario
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Actualizar lista de usuarios
      setUsers(prev => prev.filter(u => u.id !== user.id));
      
      toast({
        title: "Usuario eliminado",
        description: `${user.name} ha sido eliminado exitosamente.`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario.",
        variant: "destructive",
      });
    }
  };

  // Renderizar badge según rol
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Superadmin</span>;
      case 'admin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Admin</span>;
      case 'cliente':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Cliente</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{role}</span>;
    }
  };

  // Renderizar estado de activación
  const getStatusBadge = (active: boolean) => {
    return active 
      ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>
      : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Usuarios</h1>
        <div className="flex gap-2">
          <Button onClick={openCreateUserForm}>
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p>Cargando usuarios...</p>
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No hay usuarios registrados</h2>
            <p className="text-muted-foreground mb-6">
              Añade usuarios para administrar el acceso a la plataforma.
            </p>
            <Button onClick={openCreateUserForm}>
              Añadir usuario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>Lista de usuarios del sistema</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={!user.active ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.active)}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditUserForm(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleUserActive(user)}>
                              {user.active ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteUser(user)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo para crear/editar usuario */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Actualice los datos del usuario seleccionado." 
                : "Ingrese los datos del nuevo usuario."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Nombre y apellido"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  readOnly={isEditMode} // No permitir editar email en modo edición
                  className={isEditMode ? "bg-gray-100" : ""}
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="password">
                  {isEditMode ? "Nueva contraseña (dejar en blanco para mantener)" : "Contraseña"}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={isEditMode ? "Nueva contraseña" : "Contraseña"}
                  value={formData.password}
                  onChange={handleFormChange}
                  required={!isEditMode} // Solo requerido al crear
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Seleccione un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">
                      <div className="flex items-center">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Superadmin
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="cliente">
                      <div className="flex items-center">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Cliente
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Selector de marcas (solo visible para clientes y admins) */}
              {formData.role !== 'superadmin' && (
                <div className="grid w-full gap-1.5">
                  <Label>Marcas asignadas</Label>
                  <div className="border rounded-md p-4 max-h-40 overflow-y-auto">
                    {brands.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay marcas disponibles</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {brands.map(brand => (
                          <div key={brand.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`brand-${brand.id}`}
                              className="mr-2"
                              checked={selectedBrands.includes(brand.id)}
                              onChange={() => handleBrandSelection(brand.id)}
                            />
                            <label htmlFor={`brand-${brand.id}`} className="text-sm">
                              {brand.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {isEditMode ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para crear superadmin directamente */}
      <Dialog open={showDirectSuperadminCreate} onOpenChange={setShowDirectSuperadminCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Superadmin Directo</DialogTitle>
            <DialogDescription>
              Crea un usuario superadmin con acceso completo al sistema.
              La contraseña temporal será 'SuperAdmin123!'.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDirectSuperadmin}>
            <div className="space-y-4 py-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="direct-name">Nombre completo</Label>
                <Input
                  id="direct-name"
                  placeholder="Nombre del superadmin"
                  value={directSuperadminData.name}
                  onChange={(e) => setDirectSuperadminData({...directSuperadminData, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="direct-email">Email</Label>
                <Input
                  id="direct-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={directSuperadminData.email}
                  onChange={(e) => setDirectSuperadminData({...directSuperadminData, email: e.target.value})}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setShowDirectSuperadminCreate(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="default">
                Crear Superadmin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
