# Cinepop

Aplicación web de un cine: catálogo de películas, ficha con funciones y reseñas, selección de butacas, candy bar, compra con cupones y entradas en PDF con QR, y panel de administración. Trabajo Práctico 1 de Programación IV.

- **Frontend:** Angular 22 (componentes standalone, signals, Reactive Forms, lazy loading)
- **Backend:** Supabase (Auth + base de datos Postgres)
- **Librerías:** `jspdf` (PDF de las entradas) y `qrcode` (imagen del QR)
- **Deploy:** Firebase Hosting, instalable como PWA — https://cinepop-tp1-prograiv.web.app

Este README reúne las **decisiones de negocio y técnicas**. La descripción de la arquitectura (componentes, capas, flujos, modelo de datos y despliegue) está en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Cómo correrlo

```bash
npm install
npm start          # ng serve → http://localhost:4200
npm run build      # build de producción en dist/Tp1-pagina-cine/browser
firebase deploy    # publica el build en Firebase Hosting
```

El service worker de la PWA solo se activa en producción (`enabled: !isDevMode()`), así que no se ve con `ng serve`.

## Estado actual

### Implementado

**Cliente**
- **Registro** con los datos que pidió el cliente, confirmación de contraseña y fecha de nacimiento con selects de día, mes y año (validadores de grupo propios). Muestra los errores de Supabase, incluido el email ya registrado.
- **Login** con email y contraseña, e **ingreso anónimo** con nombre y email.
- **Cerrar sesión**, tanto para usuarios registrados como anónimos.
- **Home:** top 3 de películas más vendidas (sin contar compras canceladas) y las 5 reseñas más recientes.
- **Cartelera:** buscador de texto y filtro por géneros. Cada película se muestra con el componente hijo `CardPelicula`.
- **Ficha de película:** datos, géneros, precios, funciones futuras y reseñas con promedio.
- **Selección de butacas:** sala por filas con butacas normales, accesibles y VIP, pasillos y ocupadas deshabilitadas, con un panel que muestra las elegidas y el total.
- **Candy bar:** productos por categoría y carrito con + y −.
- **Checkout:**
  - Resumen de la compra, método de pago y cupones.
  - Control de edad según la clasificación de la película.
  - Bloqueo si la función ya empezó.
- **Compra confirmada:** guarda la compra, las entradas con su QR y el candy, y permite **descargar las entradas en PDF**.

**Administración** (`/admin`, solo rol Admin)
- **Películas:** alta y edición en un formulario con ruta propia, **baja lógica** (ocultar o publicar) y eliminación definitiva solo si no tiene funciones ni reseñas.
- **Salas:** alta con generación automática de sus 518 butacas, y eliminación si no tiene funciones.
- **Funciones:** programación por días de la semana y cantidad de semanas, con **asignación automática de sala** y vista previa antes de guardar. Una función se puede eliminar si no tiene entradas vendidas.
- **Registro de actividad:** cada acción del admin queda en `log_auditoria`.
- **Guards:** `rolGuard('Admin')` para entrar al panel, y `canDeactivate` para avisar si salís de un formulario con cambios sin guardar.

**General**
- **PWA:** manifest, íconos y service worker.

### Pendiente
- **Gestión de candy en el admin:** categorías, productos y **combos**. Las tablas `combos` y `combos_productos` existen, pero están vacías y el candy todavía no los muestra.
- **Cupones y puntos en el admin:** hoy los cupones se cargan directo en la base.
- **Reportes** (facturación, entradas vendidas, gráficos) y **pantalla de actividad** para leer el log.
- **Rol Empleado:** pantalla para validar el QR (`ingreso_validado`, `candy_retirado`).
- **"Mis compras":** historial, **cancelación** con crédito (`credito_disponible`) y uso de ese crédito en el checkout.
- **Puntos de fidelización:** sumar movimientos en `puntos_movimientos` con cada compra, mostrar el saldo y canjearlos.
- **Escribir reseñas:** hoy solo se muestran.
- **Precio de la entrada según la película:** hoy sale de `butacas.precio`, con un precio fijo por tipo (Normal y Accesible $4500, VIP $9000). `precio_normal` y `precio_preventa` de la película todavía no se usan en la compra.
- **Sincronización de butacas en tiempo real.**
- **RLS en Supabase.**
- Mostrar el error en el **login**, tipar los datos con interfaces en lugar de `any`, y agregar una ruta comodín `**`.

## Rutas

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | redirige a `/login` | público |
| `/login` | `Login` | público |
| `/registro` | `Registro` | público |
| `/home` | `Home` | autenticado |
| `/cartelera` (`?buscar=texto`) | `Cartelera` | autenticado |
| `/pelicula/:id` | `Pelicula` | autenticado |
| `/funcion/:id/butacas` | `Butacas` | autenticado |
| `/funcion/:id/candy` | `Candy` | autenticado |
| `/funcion/:id/checkout` | `Checkout` | autenticado |
| `/admin` | `PanelAdmin` → `AdminInicio` | rol Admin |
| `/admin/peliculas` | `AdminPeliculas` | rol Admin |
| `/admin/peliculas/nueva` | `AdminPeliculaForm` | rol Admin + `canDeactivate` |
| `/admin/peliculas/:id/editar` | `AdminPeliculaForm` | rol Admin + `canDeactivate` |
| `/admin/salas` | `AdminSalas` | rol Admin + `canDeactivate` |
| `/admin/funciones` | `AdminFunciones` | rol Admin + `canDeactivate` |

Las rutas autenticadas son hijas de `Layout` (que contiene el nav) y comparten un único `canActivate: [authGuard]` en el padre. Las de admin son a su vez hijas de `PanelAdmin`, protegido con `rolGuard('Admin')`. Todas usan lazy loading (`loadComponent`).

## Estructura

```
src/app/
├── componentes/   login, registro, layout, nav, home, cartelera, card-pelicula,
│                  pelicula, butacas, candy, checkout
│   └── admin/     panel-admin, admin-inicio, admin-peliculas,
│                  admin-pelicula-form, admin-salas, admin-funciones
├── servicios/     auth, peliculas, funciones, butaca, salas, resenas, roles,
│                  reserva, candys, compra, cupones, pdf-entradas, actividad
├── guards/        auth-guard, rol-guard, cambios-sin-guardar-guard
├── validadores/   claves-coinciden, fecha-valida
├── utils/         asignar-sala, edad, fechas
├── directivas/    rol-admin (*appRolAdmin)
├── app.routes.ts
└── app.config.ts  router + service worker
```

## Decisiones de negocio

### Butacas por sala
518 butacas en 19 filas: 15 normales (A-I, L-Q) de 28 butacas, 1 fila accesible (letra J, se elimina la K) de 14 butacas, y 3 filas VIP (R, S, T) de 28 butacas cada una, a mayor precio. El tipo de butaca es un solo campo de texto en `butacas`, no tablas separadas. Las butacas se generan desde Angular al crear la sala en el panel de admin (`Butaca.generarButacas(salaId)`, un solo `insert` con las 518) y no con un trigger SQL. Si falla la generación, la sala se borra para no dejar una sala sin butacas.

En la pantalla, las filas normales y VIP tienen pasillos después de las butacas 4 y 24. La fila K no tiene butacas, pero se dibuja vacía después de la J para respetar el espacio de la sala. Una butaca está ocupada si ya existe una fila en `entradas` para esa función; las ocupadas no se pueden seleccionar.

### Usuarios y roles
`usuarios` (datos de cliente) está separada de `roles_usuarios` (admin/empleado), porque esas cuentas no pasan por el registro público y no tienen los campos obligatorios de un cliente. Sin fila en `roles_usuarios`, se asume cliente. Tipo de sangre, color de ojos y días de vacaciones se guardan porque el cliente los pidió, aunque no condicionan ninguna regla de negocio.

Al registrarse se crea el usuario en Supabase Auth y, con su `id`, la fila correspondiente en `usuarios`. Si el email ya existe, Supabase no devuelve error (para no revelar qué emails están registrados) sino un usuario sin identidades; la app lo detecta y muestra "Ese email ya está registrado".

### Flujo de compra
Película → Función → Butacas → Candy → Checkout, en pantallas separadas. Lo que se va eligiendo (función, butacas y carrito de candy) se guarda en el servicio `Reserva`, que las pantallas siguientes leen. El candy es opcional. Si se entra al checkout sin una reserva (por ejemplo, después de recargar), se vuelve a la cartelera.

Al confirmar, `Compra.confirmarCompra()` hace tres inserciones:
1. Una fila en `compras` con el total, el método de pago, la fecha, el cupón y el **email del comprador**: el de la cuenta, o el guardado en `localStorage` si es anónimo (en ese caso `usuario_id` queda en `null`).
2. Una fila en `entradas` por cada butaca, con un QR único generado con `crypto.randomUUID()`.
3. Si hay candy, una fila en `compra_items` por producto con su cantidad. El precio se congela en `compra_items.precio_unitario`, para no verse afectado por cambios de precio posteriores.

### Funciones pasadas
La ficha solo muestra funciones que todavía no empezaron. El checkout vuelve a controlarlo, porque la función pudo empezar mientras el usuario compraba.

### Clasificación por edad
Si la película es +13 o +18:
- Al usuario registrado se le calcula la edad desde su fecha de nacimiento y, si es menor, no puede comprar.
- El anónimo no tiene fecha de nacimiento, así que debe marcar una declaración de que tiene la edad mínima.

En ambos casos se muestra el aviso de que los menores deben ir acompañados de un adulto.

### Cupones
Un solo cupón por compra; el descuento es un porcentaje sobre el subtotal (entradas + candy).
- **Primera compra:** se aplica automáticamente a un usuario registrado que nunca compró. Cuenta como usada aunque la compra se haya cancelado.
- **Mayor de 50:** se ingresa por código y se valida con la edad calculada; requiere estar registrado.

### Entradas en PDF
Una página tamaño A6 por entrada, con película, fecha, hora, sala, butaca (y la etiqueta VIP o Accesible) y su QR. Si hubo candy, se agrega una página con el pedido. El candy no tiene QR propio: se retira mostrando el QR de cualquiera de las entradas.

### Candy bar
Los productos se muestran agrupados por categoría (`categorias_candy` con sus `productos_candy`). El carrito guarda cada producto con su cantidad: + suma una unidad y − resta una, y al llegar a cero el producto sale del carrito.

### Programación de funciones
El admin elige película, días de la semana, horario, fecha de inicio y cantidad de semanas. La app genera todas las fechas futuras que coinciden y, para cada una, **asigna la primera sala libre**. Una sala está ocupada desde el inicio de la función hasta su fin **más 30 minutos de limpieza**. La hora de fin no se guarda: se calcula sumando la duración de la película al inicio (`new Date(inicio.getTime() + (duracion + 30) * 60000)`). Las fechas sin sala libre se informan y no se crean. Antes de guardar se muestra una vista previa. La regla se valida en el código, no como constraint de SQL.

### Películas
Ocultar una película es una **baja lógica** (`activa = false`): deja de verse en la cartelera y el home, pero conserva sus funciones, ventas y reseñas. Solo se puede eliminar definitivamente si no tiene funciones ni reseñas, para no perder historial.

### Catálogo y filtros
Buscador de texto y filtro de género se combinan con AND. Entre géneros seleccionados, es OR (tildar "Terror" y "Acción" muestra películas con cualquiera de los dos) — el comportamiento esperable en un catálogo tipo streaming. La búsqueda de texto no distingue mayúsculas y busca el texto en cualquier parte del nombre.

El texto de búsqueda se guarda en la URL (`/cartelera?buscar=texto`), así sobrevive a una recarga y se puede compartir el link. Se actualiza con `replaceUrl` para no llenar el historial con cada letra. Los géneros seleccionados no se guardan en la URL.

### Top 3 y promedio de reseñas
El top 3 se ordena por cantidad de entradas vendidas, sin contar las de compras canceladas. El promedio de calificación de cada película se calcula en el cliente a partir de sus reseñas; si no tiene reseñas, no se muestra.

### Compra anónima
Nombre y email del comprador anónimo se guardan en `localStorage`, sin crear usuario real en Supabase Auth. Se pide ese dato mínimo antes de navegar el catálogo (decisión propia, no exigida por el cliente) porque sin un email no habría forma de entregar el PDF/QR de una compra anónima. El guard deja pasar a quien tenga sesión de Supabase **o** un email anónimo guardado. Cerrar sesión borra esos datos.

### QR compartido (entrada + candy)
El enunciado es ambiguo sobre si el QR se invalida entero con el primer uso. Se optó por dos columnas booleanas independientes (`ingreso_validado`, `candy_retirado`), permitiendo validar entrada y candy en momentos distintos con el mismo QR. Cada entrada recibe su propio QR (un UUID) al confirmar la compra.

### Puntos y crédito
Los puntos de fidelización usan una tabla de movimientos (`puntos_movimientos`), porque el cliente pidió historial de canjes; el saldo se calcula sumando movimientos, no se guarda aparte. El crédito por cancelación es una sola columna en `usuarios`, sin historial, porque no se pidió esa trazabilidad.

### Log de auditoría
Una columna de texto libre (`descripcion`) por evento, armada desde el código, junto con el usuario y su email. Hoy registra las acciones del admin; por ejemplo, un cambio de precio queda como "Cambió el precio normal de X de $A a $B".

## Decisiones técnicas

- **Un solo cliente de Supabase.** Se crea una vez en el servicio `Auth` y el resto de los servicios lo reutilizan con `inject(Auth).client()`. Los servicios son singleton (`@Service()`, equivalente a `providedIn: 'root'`).
- **Estado de la compra en un servicio con signals (`Reserva`).** Butacas, candy y checkout son pantallas hermanas, sin relación padre-hijo, así que no pueden compartir datos con `input`/`output`. Como el servicio es singleton, lo que guarda una pantalla lo lee la siguiente. Este estado vive en memoria: se pierde al recargar la página.
- **Componente hijo con `input` y `output` (`CardPelicula`).** Recibe la película del padre con `input.required()` y avisa con un `output` cuando se la selecciona; el padre decide a dónde navegar.
- **Guards:**
  - `authGuard` es un `CanActivate` en el padre de las rutas autenticadas.
  - `rolGuard(rol)` es una función que **devuelve un guard**, para reutilizarla con cualquier rol. Si falla, devuelve un `UrlTree` a `/home` en vez de navegar a mano.
  - `cambiosSinGuardarGuard` es un `CanDeactivate` que funciona con cualquier componente que implemente la interfaz `ConCambiosSinGuardar`.
- **Validadores de grupo propios:** `clavesCoincidenValidator` (contraseña y confirmación) y `fechaValidator` (que día, mes y año formen una fecha real, por ejemplo que no exista el 31 de febrero).
- **Lógica pura en `utils/`:** la asignación de salas, el cálculo de edad y el formato de fechas son funciones sin dependencias de Angular, fáciles de probar.
- **Fechas en hora local:** `fecha_hora` se guarda sin zona horaria, así que se arma con `aTextoLocal()` en lugar de `toISOString()`, que la pasaría a UTC.
- **El nav vive solo en `Layout`**, así aparece únicamente en las pantallas autenticadas.
- **Lazy loading en todas las rutas**, para que cada pantalla se descargue recién cuando se entra.
- **Signals para el estado de los componentes.** Las listas (géneros elegidos, butacas, carrito, días de la semana) se reemplazan por arrays nuevos y no se modifican en el lugar, para que la signal detecte el cambio.
- **Reactive Forms** en registro, login y todos los formularios del admin.
- **Parámetros de ruta como Observables** (`paramMap`, `queryParamMap`) y no snapshot, porque Angular reutiliza el componente si cambia solo el parámetro.
- **`*ngIf` con `else` y `ng-template`** para los estados vacíos y para la pantalla de compra confirmada.
- **Directiva estructural `*appRolAdmin`** para mostrar el link al panel. Solo oculta en la interfaz; la ruta la protege `rolGuard`.
- **Firebase Hosting** con rewrite de todas las rutas a `index.html`, necesario para que una SPA funcione al recargar en una ruta interna.

## Limitaciones conocidas
- **Dos personas pueden comprar la misma butaca** si confirman casi al mismo tiempo: no hay tiempo real ni una restricción única en `entradas (funcion_id, butaca_id)`.
- **La compra no es atómica:** `confirmarCompra` hace tres inserciones separadas. Si falla la segunda o la tercera, la compra queda guardada sin sus entradas o sin sus productos.
- **La reserva no sobrevive a una recarga:** se pierden la función, las butacas y el carrito elegidos.

## Seguridad
RLS no está configurado todavía en ninguna tabla. Por ahora el control de acceso es solo del lado del cliente (guards de Angular), una limitación conocida del estado actual: con la clave pública se puede leer y modificar cualquier tabla. La clave del repositorio es la *publishable key*, pensada para usarse en el navegador; la protección real de los datos depende de configurar RLS.
