import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Logo from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redireccionar si el usuario ya está autenticado
  useEffect(() => {
    if (user && !authLoading) {
      navigateAfterLogin();
    }
  }, [user, authLoading]);

  // Función para redireccionar según el rol
  const navigateAfterLogin = () => {
    if (user) {
      if (user.role === "superadmin") {
        navigate("/users");
      } else if (user.role === "admin" || user.role === "cliente") {
        // Redirigir a selección de marca para que luego vaya al catálogo
        navigate("/brand-selection");
      }
    }
  };

  // Manejar el inicio de sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Por favor ingrese email y contraseña",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Usar la función login del contexto en lugar de manejar directamente la autenticación
      const success = await login(email, password);

      if (success) {
        // La función de login ya maneja la redirección
        navigateAfterLogin();
      }
    } catch (error) {
      console.error("Error de login:", error);
      toast({
        title: "Error de inicio de sesión",
        description:
          error instanceof Error ? error.message : "Credenciales inválidas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Si está verificando la autenticación, mostrar un indicador de carga
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mb-4 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center">
          
          <CardTitle className="text-2xl text-center">
          <div className="w-32 mb-4">
            <Logo />
          </div>
            </CardTitle>
          <CardDescription className="text-center">
            Ingrese sus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-xs text-center text-muted-foreground">
            Sistema de gestión de marcas de Showroom
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
