
import React from 'react';
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

const UsersPage = () => {
  const users = [
    { id: 1, name: "Carlos Rodríguez", email: "carlos@example.com", role: "Administrador" },
    { id: 2, name: "Ana Martínez", email: "ana@example.com", role: "Editor" },
    { id: 3, name: "Luis García", email: "luis@example.com", role: "Visualizador" },
    { id: 4, name: "Elena Pérez", email: "elena@example.com", role: "Editor" },
    { id: 5, name: "Javier López", email: "javier@example.com", role: "Visualizador" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6">Usuarios</h1>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
