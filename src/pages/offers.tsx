import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Percent, Tags } from "lucide-react";

const OffersPage = () => {
  // Simulamos que no hay ofertas disponibles
  const offers = [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Ofertas</h1>
      </div>

      <Card>
        <CardContent className="py-10 text-center">
          <Percent className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No hay ofertas activas</h2>
          <p className="text-muted-foreground mb-6">
            Crea ofertas especiales para tus productos.
          </p>
          <Button>Crear oferta</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OffersPage;
