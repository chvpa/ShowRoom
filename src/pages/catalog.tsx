
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shirt, Footprints, Watch } from 'lucide-react';

type CategoryCardProps = {
  title: string;
  icon: React.ElementType;
  description: string;
};

const CategoryCard = ({ title, icon: Icon, description }: CategoryCardProps) => {
  return (
    <Card className="category-card overflow-hidden">
      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
          <Icon size={32} />
        </div>
        <h3 className="font-semibold text-xl">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
};

const CatalogPage = () => {
  const categories = [
    {
      title: "Prendas",
      icon: Shirt,
      description: "Explora nuestra colección de prendas de alta calidad"
    },
    {
      title: "Calzados",
      icon: Footprints,
      description: "Descubre los mejores calzados para cada ocasión"
    },
    {
      title: "Accesorios",
      icon: Watch,
      description: "Complementa tu estilo con nuestra selección de accesorios"
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-8">Catálogo</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <CategoryCard
            key={category.title}
            title={category.title}
            icon={category.icon}
            description={category.description}
          />
        ))}
      </div>
    </div>
  );
};

export default CatalogPage;
