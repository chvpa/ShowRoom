import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CalendarPlus } from "lucide-react";

const PresalePage = () => {
  // Simulamos que no hay preventas disponibles
  const presales = [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Preventa</h1>
        <Button>
          <CalendarPlus className="mr-2 h-4 w-4" />
          Nueva Preventa
        </Button>
      </div>

      <Card>
        <CardContent className="py-10 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No hay preventas programadas</h2>
          <p className="text-muted-foreground mb-6">
            Programa el lanzamiento anticipado de productos especiales.
          </p>
          <Button>
            Crear preventa
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PresalePage; 