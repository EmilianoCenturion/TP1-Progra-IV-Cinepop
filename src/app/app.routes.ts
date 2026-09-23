import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    {
        path: "",
        redirectTo: "/login",
        pathMatch: 'full'
    },
    {
        path: "registro",
        loadComponent: () => import("./componentes/registro/registro").then((c) => c.Registro)
    },
    {
        path: "login",
        loadComponent: () => import("./componentes/login/login").then((c) => c.Login)
    },
    {
        path: "",
        loadComponent: () => import("./componentes/layout/layout").then((c) => c.Layout),
        canActivate: [authGuard],
        children: [
            {
                path: 'home', loadComponent: () => import("./componentes/home/home").then((c) => c.Home),
            },
            {
                path: 'cartelera', loadComponent: () => import("./componentes/cartelera/cartelera").then((c) => c.Cartelera)
            },
            {
                path: 'pelicula/:id', loadComponent: () => import("./componentes/pelicula/pelicula").then((c) => c.Pelicula)
            },
            {
                path: 'funcion/:id/butacas', loadComponent: () => import("./componentes/butacas/butacas").then((c) => c.Butacas)
            }
        ]
    }
]
