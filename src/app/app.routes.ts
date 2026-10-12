import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { rolGuard } from './guards/rol-guard';
import { cambiosSinGuardarGuard } from './guards/cambios-sin-guardar-guard';

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
            },
            {
                path: 'funcion/:id/candy', loadComponent: () => import("./componentes/candy/candy").then((c) => c.Candy)
            },
            {
                path: 'funcion/:id/checkout', loadComponent: () => import("./componentes/checkout/checkout").then((c) => c.Checkout)
            },
            {
                path: 'mi-cuenta', loadComponent: () => import("./componentes/mi-cuenta/mi-cuenta").then((c) => c.MiCuenta)
            },
            {
                path: 'validar',
                canActivate: [rolGuard('Empleado')],
                loadComponent: () => import("./componentes/validar-qr/validar-qr").then((c) => c.ValidarQr)
            },
            {
                path: 'admin',
                canActivate: [rolGuard('Admin')],
                loadComponent: () => import("./componentes/admin/panel-admin/panel-admin").then((c) => c.PanelAdmin),
                children : [ 
                    {
                        path: "",
                        loadComponent: () => import("./componentes/admin/admin-inicio/admin-inicio").then((c) => c.AdminInicio)
                    },
                    {
                        path: 'peliculas',
                        loadComponent: () => import("./componentes/admin/admin-peliculas/admin-peliculas").then((c) => c.AdminPeliculas)
                    },
                    {
                        path: 'peliculas/nueva',
                        canDeactivate: [cambiosSinGuardarGuard],
                        loadComponent: () => import("./componentes/admin/admin-pelicula-form/admin-pelicula-form").then((c) => c.AdminPeliculaForm)
                    },
                    {
                        path: 'peliculas/:id/editar',
                        canDeactivate: [cambiosSinGuardarGuard],
                        loadComponent: () => import("./componentes/admin/admin-pelicula-form/admin-pelicula-form").then((c) => c.AdminPeliculaForm)
                    },
                    {
                        path: 'salas',
                        canDeactivate: [cambiosSinGuardarGuard],
                        loadComponent: () => import("./componentes/admin/admin-salas/admin-salas").then((c) => c.AdminSalas)
                    },
                    {
                        path: 'funciones',
                        canDeactivate: [cambiosSinGuardarGuard],
                        loadComponent: () => import("./componentes/admin/admin-funciones/admin-funciones").then((c) => c.AdminFunciones)
                    },
                    {
                        path: 'candy',
                        loadComponent: () => import("./componentes/admin/admin-candy/admin-candy").then((c) => c.AdminCandy)
                    },
                    {
                        path: 'candy/productos/nuevo',
                        canDeactivate: [cambiosSinGuardarGuard],
                        loadComponent: () => import("./componentes/admin/admin-producto-form/admin-producto-form").then((c) => c.AdminProductoForm)
                    },
                    {
                        path: 'candy/productos/:id/editar',
                        canDeactivate: [cambiosSinGuardarGuard],
                        loadComponent: () => import("./componentes/admin/admin-producto-form/admin-producto-form").then((c) => c.AdminProductoForm)
                    },
                    {
                        path: 'candy/combos/nuevo',
                        canDeactivate: [cambiosSinGuardarGuard],
                        loadComponent: () => import("./componentes/admin/admin-combo-form/admin-combo-form").then((c) => c.AdminComboForm)
                    },
                    {
                        path: 'candy/combos/:id/editar',
                        canDeactivate: [cambiosSinGuardarGuard],
                        loadComponent: () => import("./componentes/admin/admin-combo-form/admin-combo-form").then((c) => c.AdminComboForm)
                    },        
                    {
                        path: 'reportes',
                        loadComponent: () => import("./componentes/admin/admin-reportes/admin-reportes").then((c) => c.AdminReportes)
                    },
                    {
                        path: 'actividad',
                        loadComponent: () => import("./componentes/admin/admin-actividad/admin-actividad").then((c) => c.AdminActividad)
                    },
                    {
                        path: 'cupones',
                        canDeactivate: [cambiosSinGuardarGuard],
                        loadComponent: () => import("./componentes/admin/admin-cupones/admin-cupones").then((c) => c.AdminCupones)
                    },
                ]
            }
        ]
    },
    {
        // Cualquier ruta que no existe vuelve al inicio (si no hay sesión, el guard manda al login)
        path: "**",
        redirectTo: "/home"
    }
]