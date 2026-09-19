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
        path: "home",
        loadComponent: () => import("./componentes/home/home").then((c) => c.Home),
        canActivate: [authGuard]
    },
    {
        path: "cartelera",
        loadComponent: () => import("./componentes/cartelera/cartelera").then((c) => c.Cartelera),
        canActivate: [authGuard]
    }
];
