import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MoreVertical, Plus, Upload, X, Check, Tag } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Brand {
  id: string;
  name: string;
  logo?: string;
  product_types?: string[];
  created_at?: string;
  updated_at?: string;
}

// Categorías o rubros disponibles
const availableProductTypes = [
  { id: 'calzados', label: 'Calzados' },
  { id: 'prendas', label: 'Prendas' },
  { id: 'accesorios', label: 'Accesorios' },
  { id: 'deportivo', label: 'Deportivo' },
  { id: 'casual', label: 'Casual' },
  { id: 'formal', label: 'Formal' }
];

// Esquema para validación del formulario
const brandFormSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  product_types: z.array(z.string()).min(1, {
    message: "Selecciona al menos una categoría.",
  }),
  logo: z.string().optional(),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

const BrandsPage = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Inicializar form con React Hook Form
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: "",
      product_types: [],
      logo: "",
    },
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las marcas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "El archivo debe ser una imagen.",
        variant: "destructive",
      });
      return;
    }

    // Crear una URL de vista previa
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    setLogoFile(file);
  };

  const resetForm = () => {
    form.reset({
      name: "",
      product_types: [],
      logo: "",
    });
    setLogoPreview(null);
    setLogoFile(null);
    setSelectedBrand(null);
  };

  const openNewBrandForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const editBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    form.reset({
      name: brand.name,
      product_types: brand.product_types || [],
      logo: brand.logo || "",
    });
    setLogoPreview(brand.logo || null);
    setIsFormOpen(true);
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      // Validación de tipo y tamaño
      if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/i)) {
        throw new Error(`Tipo de archivo no permitido: ${file.type}`);
      }
      
      if (file.size > 2 * 1024 * 1024) { // 2MB límite
        throw new Error(`El archivo es demasiado grande: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      }
      
      // Crear un nombre de archivo seguro
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `brand_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
      
      console.log('Subiendo logo a Supabase Storage:', fileName);
      
      // Usar el cliente Supabase para subir al bucket "logos"
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Error al subir logo:', error);
        return null;
      }
      
      // Obtener la URL pública
      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);
      
      console.log('Logo subido exitosamente:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
      
    } catch (error) {
      console.error('Error en uploadLogo:', error);
      return null;
    }
  };

  // Función optimizada para convertir logos a base64 como alternativa de respaldo
  const uploadLogoAsBase64 = async (file: File): Promise<string | null> => {
    try {
      // Verificar tipo de archivo
      if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/i)) {
        console.warn(`Tipo de archivo no permitido para base64: ${file.type}`);
        return null;
      }
      
      // Para base64, limitamos el tamaño
      const maxSizeKB = 500; // 500KB límite
      if (file.size > maxSizeKB * 1024) {
        console.warn(`El archivo es demasiado grande para base64: ${(file.size / 1024).toFixed(2)}KB > ${maxSizeKB}KB`);
        return null;
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          if (!event.target?.result) {
            reject(new Error('Error al leer el archivo'));
            return;
          }
          
          const base64String = event.target.result as string;
          console.log(`Logo convertido a base64: ${(base64String.length / 1024).toFixed(2)}KB`);
          resolve(base64String);
        };
        
        reader.onerror = () => {
          reject(new Error('Error al leer el archivo'));
        };
        
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error al procesar logo como base64:', error);
      return null;
    }
  };

  const onSubmit = async (values: BrandFormValues) => {
    try {
      let logoUrl = values.logo;
      
      // Si hay un nuevo archivo de logo, intentar subirlo
      if (logoFile) {
        try {
          console.log('Procesando logo de marca...');
          
          // Primero intentar subir al bucket de storage
          logoUrl = await uploadLogo(logoFile);
          
          // Si falla, usar base64 como alternativa
          if (!logoUrl) {
            console.log('Fallback: Convirtiendo logo a base64...');
            logoUrl = await uploadLogoAsBase64(logoFile);
            
            if (logoUrl) {
              console.log('Logo convertido a base64 correctamente');
            } else {
              console.warn('No se pudo procesar el logo en ningún formato');
            }
          }
        } catch (logoError) {
          console.error("Error procesando el logo:", logoError);
          // Continuar con la creación de la marca sin logo
          logoUrl = null;
        }
      }
      
      // Preparar datos esenciales primero (sin logo para evitar problemas de caché)
      const basicData = {
        name: values.name,
        product_types: values.product_types && values.product_types.length > 0 ? values.product_types : []
      };
      
      // Log de información (sin mostrar todo el base64)
      console.log("Datos básicos a guardar:", basicData);
      console.log("Logo procesado:", logoUrl ? `[${Math.round(logoUrl.length / 1024)}KB]` : "ninguno");
      
      if (selectedBrand) {
        // ACTUALIZAR MARCA EXISTENTE
        console.log("Actualizando marca:", selectedBrand.id);
        
        try {
          // Primero actualizar los datos básicos
          const { error: basicError } = await supabase
            .from('brands')
            .update({
              ...basicData,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedBrand.id);
          
          if (basicError) {
            throw new Error(`Error al actualizar datos básicos: ${basicError.message}`);
          }
          
          // Si hay logo y se actualizaron los datos básicos, actualizar el logo en una operación separada
          if (logoUrl) {
            const { error: logoError } = await supabase
              .from('brands')
              .update({ logo: logoUrl })
              .eq('id', selectedBrand.id);
            
            if (logoError) {
              console.warn("Error al actualizar logo:", logoError);
              // Continuar de todos modos, ya que los datos básicos se actualizaron correctamente
            }
          }
          
          console.log("Marca actualizada correctamente");
          
          toast({
            title: "Éxito",
            description: "Marca actualizada correctamente.",
          });
        } catch (updateError) {
          console.error("Error en la actualización:", updateError);
          throw updateError;
        }
      } else {
        // CREAR NUEVA MARCA
        console.log("Creando nueva marca...");
        
        try {
          // Paso 1: Primero insertar la marca con datos básicos (sin logo)
          const { data: newBrand, error: insertError } = await supabase
            .from('brands')
            .insert(basicData)
            .select('id');
          
          if (insertError) {
            throw new Error(`Error al crear marca: ${insertError.message}`);
          }
          
          console.log("Marca básica creada:", newBrand);
          
          // Paso 2: Si hay logo y se creó la marca correctamente, actualizar el logo en una operación separada
          if (logoUrl && newBrand && newBrand.length > 0) {
            const brandId = newBrand[0].id;
            console.log("Actualizando logo para marca:", brandId);
            
            const { error: logoError } = await supabase
              .from('brands')
              .update({ logo: logoUrl })
              .eq('id', brandId);
            
            if (logoError) {
              console.warn("Error al agregar logo:", logoError);
              // Continuar de todos modos, ya que la marca se creó correctamente
            }
          }
          
          console.log("Marca creada correctamente");
          
          toast({
            title: "Éxito",
            description: "Marca creada correctamente.",
          });
        } catch (createError) {
          console.error("Error específico al crear:", createError);
          throw createError;
        }
      }
      
      // Recargar marcas y cerrar formulario
      fetchBrands();
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error al guardar marca:', error);
      
      let errorMessage = "No se pudo guardar la marca.";
      if (error instanceof Error) {
        errorMessage += " " + error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const deleteBrand = async (brandId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta marca?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId);
      
      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Marca eliminada correctamente.",
      });
      
      fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la marca.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Marcas</h1>
        <Button onClick={openNewBrandForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Marca
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p>Cargando marcas...</p>
        </div>
      ) : brands.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No hay marcas registradas</h2>
            <p className="text-muted-foreground mb-6">
              Agrega una marca para comenzar a gestionar tus productos.
            </p>
            <Button onClick={openNewBrandForm}>
              Crear marca
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="truncate">
                    <h2 className="text-xl font-semibold truncate">{brand.name}</h2>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Acciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => editBrand(brand)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteBrand(brand.id)} className="text-destructive">
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="h-32 flex items-center justify-center mb-4 bg-muted/20 rounded-md overflow-hidden">
                  {brand.logo ? (
                    <img 
                      src={brand.logo} 
                      alt={`${brand.name} logo`} 
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <Tag className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(brand.product_types || []).map((type) => (
                    <Badge key={type} variant="secondary">
                      {availableProductTypes.find(t => t.id === type)?.label || type}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedBrand ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
            <DialogDescription>
              {selectedBrand 
                ? 'Actualiza los detalles de la marca existente.' 
                : 'Completa los detalles para crear una nueva marca.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la marca" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <Label>Categorías de productos</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableProductTypes.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`product-type-${type.id}`}
                        checked={(form.watch('product_types') || []).includes(type.id)}
                        onCheckedChange={(checked) => {
                          const currentValues = form.getValues('product_types') || [];
                          if (checked) {
                            form.setValue('product_types', [...currentValues, type.id], { shouldValidate: true });
                          } else {
                            form.setValue(
                              'product_types', 
                              currentValues.filter(value => value !== type.id),
                              { shouldValidate: true }
                            );
                          }
                        }}
                      />
                      <Label htmlFor={`product-type-${type.id}`} className="cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {form.formState.errors.product_types && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.product_types.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Logo</Label>
                {logoPreview && (
                  <div className="h-40 flex items-center justify-center bg-muted/20 rounded-md overflow-hidden mb-2">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Label 
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center justify-center rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-sm"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                  </Label>
                  <Input 
                    id="logo-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {logoPreview && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setLogoPreview(null);
                        setLogoFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <span className="mr-2">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  )}
                  {selectedBrand ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandsPage; 