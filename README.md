# Cinepop

Aplicación web de un cine: catálogo de películas, ficha con funciones, selección de butacas, candy bar y compra. Trabajo Práctico 1 de Programación IV.

- **Frontend:** Angular 22 (componentes standalone, signals, Reactive Forms, lazy loading)
- **Backend:** Supabase (Auth + base de datos Postgres)
- **Deploy:** Firebase Hosting, instalable como PWA — https://cinepop-tp1-prograiv.web.app

## Cómo correrlo

```bash
npm install
npm start          # ng serve → http://localhost:4200
npm run build      # build de producción en dist/Tp1-pagina-cine/browser
firebase deploy    # publica el build en Firebase Hosting
```

## Estado actual

### Implementado
- **Registro** con los datos que pidió el cliente (nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos, días de vacaciones) y **login** con email y contraseña (Supabase Auth).
- **Ingreso anónimo** con nombre y email, sin cuenta.
- **Rutas protegidas** con un guard: sin sesión ni anónimo, se redirige a `/login`.
- **Home:** top 3 de películas más vendidas (sin contar compras canceladas) y las 5 reseñas más recientes.
- **Cartelera:** buscador de texto (desde el nav, en vivo) y filtro por géneros.
- **Ficha de película:** datos, géneros, precios y funciones. Si no hay función elegida, se muestra un aviso en lugar del botón Continuar.
- **Selección de butacas:** sala por filas con butacas normales, accesibles y VIP, pasillos y ocupadas deshabilitadas. Se eligen varias butacas y un panel lateral muestra la lista con el precio de cada una y el total.
- **Candy bar:** productos agrupados por categoría, carrito con botones + y −, y total del pedido.
- **Servicio de compra** (`Compra.confirmarCompra`): registra la compra, las entradas (cada una con su QR) y los productos de candy con el precio congelado.
- **Link al panel de admin** visible solo para el rol Admin (directiva estructural propia).
- **PWA:** manifest, íconos y service worker.

### Pendiente
- **Pantalla de checkout:** el componente y sus totales están creados, pero todavía no tiene vista ni ruta registrada, y aún no llama a `confirmarCompra`. El botón Continuar del candy ya navega a `/funcion/:id/checkout`.
- Sincronización de butacas en tiempo real.
- Entrega del QR/PDF de la compra, y guardar el email del comprador anónimo en la compra.
- Panel de administración y la ruta `/admin`.
- Botón de cerrar sesión (la función `signOut()` ya existe en el servicio `Auth`).
- RLS en Supabase.
- Tipar los datos con interfaces (modelos) en lugar de `any`.

## Rutas

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | redirige a `/login` | público |
| `/login` | `Login` | público |
| `/registro` | `Registro` | público |
| `/home` | `Home` | protegida |
| `/cartelera` (`?buscar=texto`) | `Cartelera` | protegida |
| `/pelicula/:id` | `Pelicula` | protegida |
| `/funcion/:id/butacas` | `Butacas` | protegida |
| `/funcion/:id/candy` | `Candy` | protegida |
| `/funcion/:id/checkout` | `Checkout` | *pendiente de registrar* |

Las rutas protegidas son hijas de `Layout` (que contiene el nav) y comparten un único `canActivate: [authGuard]` en el padre. Todas usan lazy loading (`loadComponent`).

## Estructura

```
src/app/
├── componentes/   login, registro, layout, nav, home, cartelera, pelicula,
│                  butacas, candy, checkout
├── servicios/     auth, peliculas, funciones, butaca, resenas, roles,
│                  reserva, candys, compra
├── guards/        auth-guard (CanActivateFn)
├── directivas/    rol-admin (*appRolAdmin)
├── app.routes.ts
└── app.config.ts  router + service worker
```

## Decisiones de negocio

### Butacas por sala
518 butacas en 19 filas: 15 normales (A-I, L-Q) de 28 butacas, 1 fila accesible (letra J, se elimina la K) de 14 butacas, y 3 filas VIP (R, S, T) de 28 butacas cada una, a mayor precio. El tipo de butaca es un solo campo de texto en `butacas`, no tablas separadas. Las butacas de cada sala se generan desde Angular (`Butaca.generarButacas(salaId)`, un solo `insert` con las 518) y no con un trigger SQL.

En la pantalla, las filas normales y VIP tienen pasillos después de las butacas 4 y 24. La fila K no tiene butacas, pero se dibuja vacía después de la J para respetar el espacio de la sala. Una butaca está ocupada si ya existe una fila en `entradas` para esa función; las ocupadas no se pueden seleccionar.

### Usuarios y roles
`usuarios` (datos de cliente) está separada de `roles_usuarios` (admin/empleado), porque esas cuentas no pasan por el registro público y no tienen los campos obligatorios de un cliente. Sin fila en `roles_usuarios`, se asume cliente. Tipo de sangre, color de ojos y días de vacaciones se guardan porque el cliente los pidió, aunque no condicionan ninguna regla de negocio.

Al registrarse se crea el usuario en Supabase Auth y, con su `id`, la fila correspondiente en `usuarios`.

### Flujo de compra
Película → Función → Butacas → Candy → Checkout, en pantallas separadas. Lo que se va eligiendo (función, butacas y carrito de candy) se guarda en el servicio `Reserva`, que las pantallas siguientes leen. El candy es opcional.

Al confirmar, `Compra.confirmarCompra()` hace tres inserciones:
1. Una fila en `compras` con el total, el método de pago y la fecha. Si el comprador es anónimo, `usuario_id` queda en `null`.
2. Una fila en `entradas` por cada butaca, con un QR único generado con `crypto.randomUUID()`.
3. Si hay candy, una fila en `compra_items` por producto con su cantidad. El precio se congela en `compra_items.precio_unitario`, para no verse afectado por cambios de precio posteriores.

### Candy bar
Los productos se muestran agrupados por categoría (`categorias_candy` con sus `productos_candy`). El carrito guarda cada producto con su cantidad: + suma una unidad y − resta una, y al llegar a cero el producto sale del carrito. El botón − está deshabilitado si el producto no está en el carrito.

### Butacas en tiempo real
**Pendiente de implementar.** Hoy la selección es local: se guarda solo en la pantalla de quien la hace. No esta decidido como implementarlo todavia.

### Funciones

La asignación de sala es automática y la regla de 30 minutos entre funciones se valida en el código, no como constraint de SQL. La hora de fin de una función no se guarda: se calcula sumando la duración de la película al horario de inicio (`new Date(inicio.getTime() + duracion * 60 * 1000)`).

### Catálogo y filtros
Buscador de texto y filtro de género se combinan con AND. Entre géneros seleccionados, es OR (tildar "Terror" y "Acción" muestra películas con cualquiera de los dos) — el comportamiento esperable en un catálogo tipo streaming. La búsqueda de texto no distingue mayúsculas y busca el texto en cualquier parte del nombre.

El texto de búsqueda viaja en la URL (`/cartelera?buscar=texto`) y no en un servicio compartido: el nav y la cartelera no son padre e hijo, y así la búsqueda sobrevive a una recarga, se puede compartir el link y funciona el botón atrás. Los géneros seleccionados, en cambio, no se guardan en la URL.

### Top 3 y promedio de reseñas
El top 3 se ordena por cantidad de entradas vendidas, sin contar las de compras canceladas. El promedio de calificación de cada película se calcula en el cliente a partir de sus reseñas; si no tiene reseñas, no se muestra.

### Compra anónima
Nombre y email del comprador anónimo se guardan en `localStorage`, sin crear usuario real en Supabase Auth. Se pide ese dato mínimo antes de navegar el catálogo (decisión propia, no exigida por el cliente) porque sin un email no habría forma de entregar el PDF/QR de una compra anónima. El guard deja pasar a quien tenga sesión de Supabase **o** un email anónimo guardado. La compra de un anónimo se registra con `usuario_id` en `null`; falta guardar su email en la compra.

### QR compartido (entrada + candy)
El enunciado es ambiguo sobre si el QR se invalida entero con el primer uso. Se optó por dos columnas booleanas independientes (`ingreso_validado`, `candy_retirado`), permitiendo validar entrada y candy en momentos distintos con el mismo QR. Cada entrada recibe su propio QR (un UUID) al confirmar la compra.

### Puntos y crédito
Los puntos de fidelización usan una tabla de movimientos (`puntos_movimientos`), porque el cliente pidió historial de canjes; el saldo se calcula sumando movimientos, no se guarda aparte. El crédito por cancelación es una sola columna en `usuarios`, sin historial, porque no se pidió esa trazabilidad.

### Log de auditoría
Una columna de texto libre (`descripcion`) por evento, armada desde el código.

## Decisiones técnicas

- **Un solo cliente de Supabase.** Se crea una vez en el servicio `Auth` y el resto de los servicios lo reutilizan con `inject(Auth).client()`. Los servicios son singleton (`@Service()`, equivalente a `providedIn: 'root'`).
- **Estado de la compra en un servicio con signals (`Reserva`).** Butacas, candy y checkout son pantallas hermanas, sin relación padre-hijo, así que no pueden compartir datos con `@Input`/`@Output`. Como el servicio es singleton, lo que guarda una pantalla lo lee la siguiente. El checkout usa directamente las signals del servicio (`butacas = this.reserva.butacasSeleccionadas`). Este estado vive en memoria: se pierde al recargar la página.
- **Guard `CanActivate` en el padre** y no `CanMatch`: si falla, no se busca otra ruta, se redirige a `/login`. Al estar en el padre, protege a todas las hijas.
- **El nav vive solo en `Layout`**, así aparece únicamente en las pantallas protegidas y no en login ni registro.
- **Lazy loading en todas las rutas**, para que cada pantalla se descargue recién cuando se entra.
- **Signals para el estado de los componentes.** Los datos que llegan de Supabase se guardan con `.set()` y la vista se actualiza sola. Las listas (géneros elegidos, butacas elegidas, carrito) se reemplazan por arrays nuevos y no se modifican en el lugar, para que la signal detecte el cambio.
- **Reactive Forms** en login y registro, con validaciones en el `.ts` y el botón de envío deshabilitado mientras el formulario es inválido.
- **Parámetros de ruta como Observables** (`paramMap`, `queryParamMap`) y no snapshot, porque Angular reutiliza el componente si cambia solo el parámetro.
- **`*ngIf` con `else` y `ng-template`** para los estados vacíos: sin función elegida, sin butacas seleccionadas y carrito vacío.
- **Directiva estructural `*appRolAdmin`** para mostrar u ocultar elementos según el rol. Solo oculta en la interfaz; no reemplaza un guard ni RLS.
- **Firebase Hosting** con rewrite de todas las rutas a `index.html`, necesario para que una SPA funcione al recargar en una ruta interna.

## Limitaciones conocidas
- **La compra no es atómica:** `confirmarCompra` hace tres inserciones separadas. Si falla la segunda o la tercera, la compra queda guardada sin sus entradas o sin sus productos. Para que sea todo o nada habría que usar una transacción, por ejemplo con una función en la base.
- **La reserva no sobrevive a una recarga:** si se recarga la página en medio del flujo de compra, se pierden la función, las butacas y el carrito elegidos.
- **Dos personas pueden elegir la misma butaca** hasta que se implemente el tiempo real; solo se valida contra las entradas ya vendidas.
