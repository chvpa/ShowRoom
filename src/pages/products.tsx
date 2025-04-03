
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CSVUploader from '@/components/CSVUploader';

const ProductsPage = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-semibold">Productos</h1>
        <CSVUploader />
      </div>

      <Card className="mt-4">
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            No hay productos cargados. Por favor, suba un archivo CSV para comenzar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
