# Cinepop

Aplicación web de un cine:
- Catálogo con próximos estrenos y ficha de cada película, con funciones y reseñas.
- Butacas en tiempo real, candy bar y combos.
- Compra con cupones, crédito y puntos, y entradas en PDF con un QR por compra.
- Cuenta del cliente, pantalla del empleado para validar QR y panel de administración.

Trabajo Práctico 1 de Programación IV.

- **Frontend:** Angular 22 (componentes standalone, signals, Reactive Forms, lazy loading)
- **Backend:** Supabase (Auth, base de datos Postgres y Realtime)
- **Librerías:** `jspdf` (PDF de las entradas) y `qrcode` (imagen del QR)
- **Deploy:** Firebase Hosting, instalable como PWA. https://cinepop-tp1-prograiv.web.app

Este documento reúne las **decisiones de negocio y técnicas**. La descripción de la arquitectura (componentes, capas, flujos, modelo de datos y despliegue) está en [ARQUITECTURA.md](ARQUITECTURA.md).

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
- **Login** con email y contraseña, con el error de Supabase traducido al español (por ejemplo, "Email o contraseña incorrectos"). También hay **ingreso anónimo** con nombre y email.
- **Cerrar sesión**, tanto para usuarios registrados como anónimos.
- **Home:**
  - Top 3 de películas más vendidas.
  - **Combos** destacados, con un botón "Elegir combo".
  - Las 5 reseñas más recientes.
  - Al final, la sección **Próximamente**: estrenos futuros con su sinopsis, la fecha de estreno y los días que faltan.
- **Cartelera:** solo películas ya estrenadas, con buscador de texto y filtro por géneros. Cada película se muestra con el componente hijo `CardPelicula`.
- **Ficha de película:**
  - Datos, géneros, precios, funciones futuras y reseñas con promedio.
  - Botón **"Elegir butacas"** dentro del bloque de funciones.
  - **Formulario para escribir una reseña** (1 a 5 estrellas y comentario), solo si el cliente ya vio la película.
- **Selección de butacas en tiempo real:**
  - Sala por filas con butacas normales, accesibles y VIP, y pasillos.
  - Las butacas que **compra** otra persona se marcan como ocupadas al instante.
  - Las que otra persona **está eligiendo** aparecen bloqueadas hasta que las suelte o las compre.
- **Candy bar:** productos por categoría y carrito con + y −.
- **Checkout:**
  - Resumen de la compra, método de pago y cupón.
  - **Canje de puntos** por entradas gratis o productos.
  - **Uso del crédito** junto con otro método de pago.
  - Control de edad según la clasificación de la película.
  - Bloqueo si la función ya empezó, y aviso si otra persona compró una de las butacas mientras tanto.
- **Compra confirmada:** muestra el **código de la compra** (por ejemplo `K7M3-9QX2`) y permite **descargar el PDF**, con una sola página de entradas y un único QR para toda la compra.
- **Mi cuenta** (solo clientes registrados):
  - Crédito disponible y saldo de puntos.
  - **Mis películas:** grilla con póster, fecha y la calificación del cliente, o un acceso a "Calificar".
  - Historial de puntos.
  - **Mis compras**, con el botón **"Cancelar compra"** hasta 2 horas antes de la función.

**Empleado** (`/validar`, solo rol Empleado)
- **Validar QR:** escribe el código de la compra y toca **Validar ingreso** (entran todas las entradas de esa compra) o **Entregar candy**. Un cartel verde o rojo indica el resultado y el motivo.

**Administración** (`/admin`, solo rol Admin)
- **Películas:** alta y edición en un formulario con ruta propia, **baja lógica** (ocultar o publicar) y eliminación definitiva solo si no tiene funciones ni reseñas.
- **Salas:** alta con generación automática de sus 518 butacas, y eliminación si no tiene funciones.
- **Funciones:** programación por días de la semana y cantidad de semanas, con **asignación automática de sala** y vista previa antes de guardar.
- **Candy:** categorías, productos y **combos** (entradas + productos a un precio fijo), con imagen.
- **Cupones y puntos:**
  - Cupones de primera compra, mayor de 50 o de un tipo que escribe el admin, con porcentaje editable y activación.
  - Debajo, las **recompensas de puntos**: cuántos puntos cuesta una entrada gratis o cada producto.
- **Reportes:** facturación, compras, entradas y ticket promedio; facturación por día; entradas por película; lo más vendido del candy. Se filtra por período.
- **Actividad:** el log de auditoría con filtros por texto, usuario y período.
- **Empleados:** alta (nombre, email y contraseña) y baja de los usuarios que validan los QR.
- **Guards:** `rolGuard('Admin')` para entrar al panel, y `canDeactivate` para avisar si salís de un formulario con cambios sin guardar.

**General**
- **PWA:** manifest, íconos y service worker.
- **Ruta comodín `**`:** cualquier URL que no existe vuelve a `/home` (y el guard manda al login si no hay sesión).

### Pendiente
- **Precio de la entrada según la película (preventa):** hoy sale de `butacas.precio`, con un precio fijo por tipo (Normal y Accesible $4500, VIP $9000). `precio_normal` y `precio_preventa` de la película se muestran en la ficha pero todavía no se usan en la compra.
- **Exportar el reporte de facturación a PDF y Excel.**
- **RLS en el resto de las tablas:** hoy solo `entradas` tiene RLS (ver [Seguridad](#seguridad)).
- Tipar los datos con interfaces en lugar de `any`.

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
| `/mi-cuenta` | `MiCuenta` | autenticado (el contenido es solo para clientes) |
| `/validar` | `ValidarQr` | rol Empleado |
| `/admin` | `PanelAdmin` → `AdminInicio` | rol Admin |
| `/admin/peliculas` | `AdminPeliculas` | rol Admin |
| `/admin/peliculas/nueva`, `/admin/peliculas/:id/editar` | `AdminPeliculaForm` | rol Admin + `canDeactivate` |
| `/admin/salas` | `AdminSalas` | rol Admin + `canDeactivate` |
| `/admin/funciones` | `AdminFunciones` | rol Admin + `canDeactivate` |
| `/admin/candy` | `AdminCandy` | rol Admin |
| `/admin/candy/productos/nuevo`, `.../:id/editar` | `AdminProductoForm` | rol Admin + `canDeactivate` |
| `/admin/candy/combos/nuevo`, `.../:id/editar` | `AdminComboForm` | rol Admin + `canDeactivate` |
| `/admin/cupones` | `AdminCupones` (con el hijo `AdminRecompensas`) | rol Admin + `canDeactivate` |
| `/admin/reportes` | `AdminReportes` | rol Admin |
| `/admin/actividad` | `AdminActividad` | rol Admin |
| `/admin/empleados` | `AdminEmpleados` | rol Admin + `canDeactivate` |
| `**` | redirige a `/home` | — |

Las rutas autenticadas son hijas de `Layout` (que contiene el nav) y comparten un único `canActivate: [authGuard]` en el padre. Las de admin son a su vez hijas de `PanelAdmin`, protegido con `rolGuard('Admin')`. Todas usan lazy loading (`loadComponent`).

## Estructura

```
src/app/
├── componentes/   login, registro, layout, nav, home, cartelera, card-pelicula,
│                  pelicula, butacas, candy, checkout, mi-cuenta, validar-qr
│   └── admin/     panel-admin, admin-inicio, admin-peliculas, admin-pelicula-form,
│                  admin-salas, admin-funciones, admin-candy, admin-producto-form,
│                  admin-combo-form, admin-cupones, admin-recompensas,
│                  admin-reportes, admin-actividad, admin-empleados
├── servicios/     auth, roles, peliculas, funciones, salas, butaca, butacas-en-vivo,
│                  resenas, candys, reserva, compra, cupones, puntos, validacion,
│                  empleados, reportes, pdf-entradas, actividad
├── guards/        auth-guard, rol-guard, cambios-sin-guardar-guard
├── validadores/   claves-coinciden, fecha-valida
├── utils/         asignar-sala, edad, fechas
├── directivas/    rol-admin (*appRolAdmin)
├── app.routes.ts
└── app.config.ts  router, service worker y locale es-AR
```

## Decisiones de negocio

### Butacas por sala
518 butacas en 19 filas:
- 15 filas normales (A-I, L-Q) de 28 butacas.
- 1 fila accesible (letra J; la K se elimina) de 14 butacas.
- 3 filas VIP (R, S, T) de 28 butacas cada una, a mayor precio.

El tipo de butaca es un solo campo de texto en `butacas`, no tablas separadas. Las butacas se generan desde Angular al crear la sala en el panel de admin (`Butaca.generarButacas(salaId)`, un solo `insert` con las 518) y no con un trigger SQL. Si falla la generación, la sala se borra para no dejar una sala sin butacas.

En la pantalla, las filas normales y VIP tienen pasillos después de las butacas 4 y 24. La fila K no tiene butacas, pero se dibuja vacía después de la J para respetar el espacio de la sala. Una butaca está **ocupada** si existe una entrada **no anulada** para esa función.

### Butacas en tiempo real
El enunciado pide que, mientras alguien elige, vea qué butacas ya se ocuparon. Se resolvió con dos mecanismos de Supabase Realtime:
- **Compradas (Postgres Changes):** la pantalla escucha los cambios de la tabla `entradas`. Ante cada insert, update o delete de esa función vuelve a pedir las ocupadas. Si una de las butacas elegidas se vendió, la saca de la selección y avisa "Otra persona acaba de comprar…".
- **Elegidas por otra persona (Presence):** cada pantalla de butacas publica en un canal por función (`butacas-funcion-{id}`) qué butacas tiene marcadas. Las demás pantallas las muestran rayadas y no dejan elegirlas.

La reserva de Presence dura todo el flujo de compra (butacas → candy → checkout). Se libera sola cuando la persona desmarca, compra, cierra la pestaña o navega fuera de `/funcion/...`. **No se guarda en la base**, así que un navegador cerrado nunca deja butacas trabadas.

Además, la base tiene un **índice único parcial** `entradas (funcion_id, butaca_id) WHERE NOT anulada`. Si dos personas confirman la misma butaca casi al mismo tiempo, la segunda recibe el error 23505. La compra se deshace y el checkout muestra "Una de las butacas que elegiste se acaba de vender", con un botón para elegir otras.

### Usuarios y roles
`usuarios` (datos de cliente) está separada de `roles_usuarios` (admin y empleado), porque esas cuentas no pasan por el registro público y no tienen los campos obligatorios de un cliente. Sin fila en `roles_usuarios`, se asume cliente. `roles_usuarios` guarda además el nombre y el email, para poder listar los empleados en el admin. Tipo de sangre, color de ojos y días de vacaciones se guardan porque el cliente los pidió, aunque no condicionan ninguna regla de negocio.

Al registrarse se crea el usuario en Supabase Auth y, con su `id`, la fila correspondiente en `usuarios`. Si el email ya existe, Supabase no devuelve error (para no revelar qué emails están registrados) sino un usuario sin identidades; la app lo detecta y muestra "Ese email ya está registrado".

### Alta de empleados
El admin da de alta a los empleados desde el panel, con nombre, email y contraseña. **Dar de baja** borra la fila de `roles_usuarios`: la cuenta sigue existiendo, pero sin el rol ya no puede entrar a Validar QR. Así el log de auditoría conserva quién validó cada QR. Ver el detalle técnico en [Decisiones técnicas](#decisiones-técnicas).

### Flujo de compra
Película → Función → Butacas → Candy → Checkout, en pantallas separadas. Lo que se va eligiendo (función, butacas, carrito y combo) se guarda en el servicio `Reserva`, que las pantallas siguientes leen. El candy es opcional. Si se entra al checkout sin una reserva (por ejemplo, después de recargar), se vuelve a la cartelera.

Al confirmar, `Compra.confirmarCompra()`:
1. Inserta la fila en `compras` con:
   - El total, el método de pago, la fecha, el cupón y el crédito usado.
   - Un **código único de 8 caracteres**.
   - El **email del comprador**: el de la cuenta, o el guardado en `localStorage` si es anónimo (en ese caso `usuario_id` queda en `null`).
2. Inserta una fila en `entradas` por cada butaca.
3. Inserta el candy en `compra_items`, con el precio congelado en `precio_unitario`. Lo canjeado con puntos va en un ítem aparte con precio $0. El combo es un ítem más.
4. Si se usó crédito, lo descuenta de la cuenta.
5. Registra los movimientos de puntos: los canjes (negativos) y lo ganado (positivo).

Si falla el paso 2 o el 3, se **deshace la compra** (se borran sus ítems, sus entradas y la compra) para no dejar compras a medias. El crédito y los puntos se tocan recién al final, cuando la compra ya quedó completa.

### Combos
Un combo tiene un precio fijo e incluye una cantidad de entradas y una lista de productos (`combos_productos`). Se elige desde el home: el cliente elige la película y la función, debe marcar **exactamente** la cantidad de entradas del combo y va **directo al checkout** (sin pasar por el candy, porque el combo ya lo incluye). Con combo no se pueden canjear entradas por puntos, porque ya están dentro del precio fijo.

### Funciones pasadas
La ficha solo muestra funciones que todavía no empezaron. El checkout vuelve a controlarlo, porque la función pudo empezar mientras el usuario compraba.

### Clasificación por edad
Si la película es +13 o +18:
- Al usuario registrado se le calcula la edad desde su fecha de nacimiento y, si es menor, no puede comprar.
- El anónimo no tiene fecha de nacimiento, así que debe marcar una declaración de que tiene la edad mínima.

En ambos casos se muestra el aviso de que los menores deben ir acompañados de un adulto, también en el PDF.

### Cupones
Un solo cupón por compra. El descuento es un porcentaje que se aplica después de los canjes de puntos.
- **Primera compra:** se aplica automáticamente a un usuario registrado que nunca compró. Cuenta como usada aunque la compra se haya cancelado. Puede haber uno solo activo, y el admin puede cambiarle el porcentaje.
- **Mayor de 50:** se ingresa por código y se valida con la edad calculada; requiere estar registrado.
- **Otro tipo** (el admin escribe el nombre, por ejemplo "Estudiantes"): lo puede usar cualquiera que tenga el código.

### Cancelación y crédito
El enunciado pide cancelar "hasta 2 horas antes de la función" y "no devolver dinero, sino darles crédito en su cuenta", usable "junto con otros métodos de pago".
- Desde **Mi cuenta** se puede cancelar mientras falten más de 2 horas y no se haya usado ninguna entrada ni retirado el candy. Se controla al mostrar el botón y otra vez al confirmar, por si la página quedó abierta.
- Al cancelar, la compra queda `cancelada` con su fecha y las entradas quedan `anuladas`: la butaca se libera y el QR deja de servir. El **total pagado vuelve como crédito**.
- En el checkout, el crédito se usa con un checkbox. Si alcanza, paga todo (método `Crédito`). Si no, se combina con tarjeta o efectivo (`Tarjeta + Crédito`). El monto usado queda en `compras.credito_usado`.
- Solo los clientes registrados pueden cancelar, porque el crédito vive en su cuenta.

### Puntos de fidelización
Reglas del enunciado:
- Cada compra de un usuario registrado suma **1 punto por peso**.
- Los puntos se canjean por **entradas gratis o productos del candy**, y el admin configura cuántos puntos cuesta cada recompensa.
- El usuario ve su saldo y el historial.
- No se pueden transferir.

Decisiones propias, porque el enunciado no las define:
- **Lo pagado con crédito también suma puntos:** el enunciado dice "por cada peso gastado" y el crédito son pesos.
- **Al cancelar una compra se revierten sus puntos:** se quitan los que ganó y se devuelven los que se canjearon en ella, con un solo movimiento "Cancelación de la compra N° X". Si no, alguien podría comprar, cancelar y quedarse con el crédito y con los puntos.
- La entrada gratis es la **más barata** de las elegidas.

Las recompensas están en la tabla `recompensas`: una para la entrada y una por producto, con su costo en puntos y si está activa.

### Reseñas
El enunciado pide que "cada persona" pueda calificar con estrellas y dejar un comentario corto. Se decidió que solo puede reseñar un **cliente registrado que ya vio la película**: una entrada de una compra no cancelada, para una función que ya empezó. Así las reseñas son de gente que fue al cine. Hay **una reseña por película por usuario**, controlado en la app y con `UNIQUE (usuario_id, pelicula_id)` en la base.

### Mis películas
Una tarjeta por película vista, con las mismas reglas que las reseñas (compra no cancelada y función ya empezada). Muestra el póster, la fecha de la última vez que la vio y su calificación. Si todavía no la reseñó, muestra "Calificar →", que lleva a la ficha.

### Próximamente y cartelera
- **Cartelera:** películas activas con fecha de estreno igual o anterior a hoy.
- **Próximamente** (al final del home): las que se estrenan más adelante. Si ya tienen funciones cargadas, muestran "Preventa abierta · Ver funciones". Si no, "Las entradas todavía no están a la venta".

El día del estreno la película pasa sola de una sección a la otra.

El enunciado también pide **alertas** para avisar cuando salen a la venta. Se implementaron y se **quitaron por decisión de alcance**, para dejar la sección simple. Queda como mejora posible (una tabla de alertas por usuario y el aviso al entrar al home).

### Un QR por compra
El enunciado dice que con el mismo QR se retira el candy y que, una vez usado, deja de funcionar. Se decidió:
- **Un solo QR por compra**, no uno por entrada. Con él entran todas las entradas de la compra y se retira el candy.
- El QR contiene un **código corto de 8 caracteres** (`compras.codigo`), que también se imprime debajo para tipearlo a mano si el lector no funciona, como pide el enunciado. Usa letras y números sin los que se confunden (sin 0/O ni 1/I).
- **Ingreso y candy se validan por separado** (`ingreso_validado` y `candy_retirado` en las entradas de la compra). Así se puede comprar el candy en el entretiempo. Cada uno sirve **una sola vez**.
- Solo se valida **el día de la función**.

### Entradas en PDF
Una página con la película, fecha, hora, sala, **todas las butacas** (con la etiqueta VIP o Accesible), el QR y el código. Si hubo candy, se agrega una página con el pedido. El candy no tiene QR propio: se retira con el mismo QR.

### Candy bar
Los productos se muestran agrupados por categoría (`categorias_candy` con sus `productos_candy`). El carrito guarda cada producto con su cantidad: + suma una unidad y − resta una, y al llegar a cero el producto sale del carrito.

### Programación de funciones
El admin elige película, días de la semana, horario, fecha de inicio y cantidad de semanas. La app genera todas las fechas futuras que coinciden y, para cada una, **asigna la primera sala libre**.
- Una sala está ocupada desde el inicio de la función hasta su fin **más 30 minutos de limpieza**.
- La hora de fin no se guarda: se calcula sumando la duración de la película al inicio.
- Las fechas sin sala libre se informan y no se crean.
- Antes de guardar se muestra una vista previa.
- La regla se valida en el código, no como constraint de SQL.

### Películas
Ocultar una película es una **baja lógica** (`activa = false`): deja de verse en la cartelera y el home, pero conserva sus funciones, ventas y reseñas. Solo se puede eliminar definitivamente si no tiene funciones ni reseñas, para no perder historial.

### Catálogo y filtros
Buscador de texto y filtro de género se combinan con AND. Entre géneros seleccionados es OR: tildar "Terror" y "Acción" muestra películas con cualquiera de los dos, como en un catálogo tipo streaming. La búsqueda de texto no distingue mayúsculas y busca el texto en cualquier parte del nombre.

El texto de búsqueda se guarda en la URL (`/cartelera?buscar=texto`), así sobrevive a una recarga y se puede compartir el link. Se actualiza con `replaceUrl` para no llenar el historial con cada letra.

### Top 3 y promedio de reseñas
El top 3 se ordena por cantidad de entradas vendidas, sin contar las de compras canceladas. El promedio de calificación se calcula en el cliente a partir de las reseñas; si no tiene reseñas, no se muestra.

### Reportes
Se muestran en **tablas** y no en gráficos, por decisión propia: son más fáciles de leer con exactitud y de exportar. El enunciado pide gráficos de películas más vistas por semana y por mes y del producto más vendido; la tabla "entradas vendidas por película" con el filtro de período (7 días, 30 días, todo) y la de "lo más vendido del candy" cubren esa misma información. Las compras canceladas no se cuentan.

### Compra anónima
Nombre y email del comprador anónimo se guardan en `localStorage`, sin crear un usuario real en Supabase Auth. Se pide ese dato mínimo antes de navegar el catálogo (decisión propia, no exigida por el cliente), porque sin un email no habría forma de entregar el PDF de una compra anónima. El guard deja pasar a quien tenga sesión de Supabase **o** un email anónimo guardado. Cerrar sesión borra esos datos. El anónimo no acumula puntos ni crédito y no puede reseñar.

### Log de auditoría
Una columna de texto libre (`descripcion`) por evento, armada desde el código, junto con el usuario, su email y la fecha. Registra:
- Las acciones del admin: películas, salas, funciones, candy, cupones, recompensas y empleados. Por ejemplo, "Cambió el precio normal de X de $A a $B".
- Las **validaciones del empleado**: "Validó el ingreso de la compra N° 53" y "Entregó el candy de la compra N° 53". Cubre el "quién validó un QR" del enunciado.

## Decisiones técnicas

- **Un solo cliente de Supabase** para toda la app. Se crea en el servicio `Auth` y el resto de los servicios lo reutilizan con `inject(Auth).client()`. Los servicios son singleton (`@Service()`, equivalente a `providedIn: 'root'`).
- **Un segundo cliente de Supabase solo para dar de alta empleados.** `signUp` inicia sesión con el usuario nuevo y, con el cliente normal, reemplazaría la sesión del admin. Por eso el alta usa un cliente aparte con `persistSession: false`, `autoRefreshToken: false` y otra `storageKey`, que no guarda la sesión. El rol se asigna después con el cliente normal, todavía logueado como admin. La alternativa sería una Edge Function con la *service role key*, que nunca puede estar en el front.
- **Estado de la compra en un servicio con signals (`Reserva`).** Butacas, candy y checkout son pantallas hermanas, sin relación padre-hijo, así que no pueden compartir datos con `input`/`output`. Como el servicio es singleton, lo que guarda una pantalla lo lee la siguiente. Este estado vive en memoria: se pierde al recargar la página.
- **Componentes hijos:**
  - `CardPelicula` recibe la película con `input.required()` y avisa con un `output` cuando se la selecciona.
  - `AdminRecompensas` se usa dentro de la página de cupones.
- **Realtime:**
  - **Postgres Changes** sobre `entradas` para las butacas compradas. Se escucha toda la tabla y se filtra en el código, porque Supabase no permite filtrar los DELETE por columna.
  - **Presence** en un canal por función para las butacas que otros están eligiendo. El servicio `ButacasEnVivo` mantiene el canal abierto durante el flujo de compra y lo cierra al salir.
- **Consistencia desde la base:**
  - Índice único parcial para que no se venda dos veces la misma butaca.
  - `UNIQUE` en el código de compra y en la reseña por usuario y película.
  - `CHECK` en los métodos de pago, los tipos de recompensa y los costos.
- **Actualizaciones condicionales para no duplicar efectos:**
  - Cancelar: `update ... where cancelada = false`.
  - Validar ingreso: `where ingreso_validado = false`.
  - Entregar candy: `where candy_retirado = false`.

  Si no se actualizó ninguna fila, la acción ya estaba hecha y no se devuelve el crédito ni se valida dos veces.
- **Saldo de puntos sin columna propia:** es la suma de `puntos_movimientos`, que además sirve de historial.
- **Guards:**
  - `authGuard` es un `CanActivate` en el padre de las rutas autenticadas.
  - `rolGuard(rol)` es una función que **devuelve un guard**, y se reutiliza para `Admin` y para `Empleado`. Si falla, devuelve un `UrlTree` a `/home` en vez de navegar a mano.
  - `cambiosSinGuardarGuard` es un `CanDeactivate` que funciona con cualquier componente que implemente la interfaz `ConCambiosSinGuardar`.
- **Validadores de grupo propios:**
  - `clavesCoincidenValidator`: que la contraseña y la confirmación coincidan.
  - `fechaValidator`: que día, mes y año formen una fecha real (por ejemplo, que no exista el 31 de febrero).
- **Lógica pura en `utils/`:** la asignación de salas, el cálculo de edad y el formato de fechas son funciones sin dependencias de Angular, fáciles de probar.
- **Fechas:**
  - `funciones.fecha_hora` y `peliculas.fecha_estreno` se guardan en **hora local** sin zona horaria. Se arman con `aTextoLocal()` en lugar de `toISOString()`, que las pasaría a UTC.
  - `compras.fecha_compra`, `resenas.creado_en` y `puntos_movimientos.creado_en` se guardan en **UTC** y se muestran agregándoles la `Z`.
  - El locale de la app es `es-AR`.
- **El nav vive solo en `Layout`**, así aparece únicamente en las pantallas autenticadas. Muestra "Mi cuenta" solo a clientes, "Panel de admin" al admin y "Validar QR" al empleado.
- **Lazy loading en todas las rutas**, para que cada pantalla se descargue recién cuando se entra.
- **Signals para el estado de los componentes:**
  - Las listas se reemplazan por arrays nuevos y no se modifican en el lugar, para que la signal detecte el cambio.
  - Los valores derivados (totales, descuentos, crédito a usar) son métodos y no `computed`.
- **Reactive Forms** en el registro, el login, las reseñas y todos los formularios del admin.
- **Parámetros de ruta como Observables** (`paramMap`, `queryParamMap`) y no snapshot, porque Angular reutiliza el componente si cambia solo el parámetro.
- **Directiva estructural `*appRolAdmin`** para mostrar los links según el rol. Solo oculta en la interfaz; la ruta la protege `rolGuard`.
- **Firebase Hosting** con rewrite de todas las rutas a `index.html`, necesario para que una SPA funcione al recargar en una ruta interna.

## Limitaciones conocidas
- **La compra no es una transacción de la base.** Son varias inserciones desde el cliente: si falla un paso se deshace lo anterior, pero un corte de conexión en el medio podría dejarla incompleta. Para que sea todo o nada habría que pasarla a una función de Postgres (RPC).
- **El crédito se actualiza leyendo y escribiendo desde el cliente.** Dos operaciones simultáneas de la misma cuenta podrían pisarse.
- **Los controles de hora usan el reloj del navegador:** 2 horas para cancelar, función ya empezada, validar el día de la función y reseñar después de verla.
- **La reserva no sobrevive a una recarga:** se pierden la función, las butacas, el carrito y el combo elegidos.
- **El bloqueo de butacas con Presence es solo visual.** Lo que realmente impide vender dos veces la misma butaca es el índice único de la base.

## Seguridad
- Hoy **solo la tabla `entradas` tiene RLS**, con policies abiertas para `anon` y `authenticated` (select, insert, update y delete). Se activó para Realtime, como indica el instructivo de la cátedra.
- El resto de las tablas no tiene RLS: el control de acceso es del lado del cliente (guards de Angular y `*appRolAdmin`). Con la clave pública se podría leer y modificar cualquier tabla.
- La clave del repositorio es la *publishable key*, pensada para el navegador. La protección real de los datos depende de configurar RLS por tabla y por rol.
