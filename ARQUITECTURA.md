# Cinepop: documento de arquitectura

Este documento describe **cómo está construido** Cinepop: sus partes, cómo se comunican, cómo se organiza el código, el modelo de datos y cómo se despliega. El **por qué** de cada elección (reglas de negocio y decisiones técnicas) está en [DECISIONES.md](DECISIONES.md).

## 1. Visión general

Cinepop es una **SPA (Single Page Application)** hecha en Angular 22. No tiene un backend propio: el navegador habla directamente con **Supabase**, que provee:
- La autenticación.
- La base de datos Postgres, a través de una API REST.
- Los mensajes en tiempo real (**Realtime**).

Los archivos de la aplicación se sirven desde **Firebase Hosting**, y un **service worker** los guarda en caché para que la app sea instalable como **PWA**.

```mermaid
flowchart LR
    U([Usuario]) --> B

    subgraph B[Navegador]
        SPA[SPA Angular]
        SW[Service worker<br/>caché de la app]
        LS[(localStorage<br/>sesión y comprador anónimo)]
        PDF[jsPDF + qrcode<br/>genera el PDF]
    end

    FH[Firebase Hosting<br/>HTML, JS, CSS, íconos]
    subgraph SB[Supabase]
        AUTH[Auth<br/>email y contraseña]
        API[API REST<br/>PostgREST]
        RT[Realtime<br/>Postgres Changes + Presence]
        DB[(Postgres)]
    end

    FH -- descarga la app --> SW
    SPA -- supabase-js --> AUTH
    SPA -- supabase-js --> API
    SPA <-- WebSocket --> RT
    API --> DB
    AUTH --> DB
    DB -- cambios de entradas --> RT
    SPA --- LS
    SPA --- PDF
```

| Parte | Responsabilidad |
|---|---|
| **SPA Angular** | Toda la interfaz y la lógica de la aplicación: navegación, validaciones, cálculos (totales, descuentos, crédito, puntos, edad, asignación de salas) y armado de las consultas. |
| **Supabase Auth** | Registro, inicio y cierre de sesión de clientes, admin y empleados. |
| **Supabase API REST + Postgres** | Persistencia de todos los datos. La app lee y escribe tablas con `supabase-js`. |
| **Supabase Realtime** | Avisa en vivo los cambios de `entradas` (butacas compradas) y comparte entre pantallas las butacas que cada uno está eligiendo (Presence). |
| **Firebase Hosting** | Sirve los archivos estáticos del build y redirige cualquier ruta a `index.html`. |
| **Service worker** | Guarda en caché los archivos de la app (solo en producción). |
| **localStorage** | Sesión de Supabase y nombre y email del comprador anónimo. |
| **jsPDF + qrcode** | Generan el PDF de las entradas con su QR, en el navegador. |

## 2. Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | Angular 22, componentes standalone, signals, Reactive Forms, Router con lazy loading |
| Lenguaje | TypeScript |
| Backend como servicio | Supabase (`@supabase/supabase-js`): Auth, Postgres, Realtime |
| Documentos | `jspdf`, `qrcode` |
| PWA | `@angular/service-worker`, `manifest.webmanifest` |
| Hosting | Firebase Hosting |

## 3. Arquitectura del frontend

### 3.1 Capas

El código se organiza en capas. Cada una solo usa a las de abajo:

```mermaid
flowchart TD
    R[Router<br/>app.routes.ts + guards] --> C
    C[Componentes<br/>pantallas y piezas de UI] --> S
    C --> V[Validadores de formularios]
    C --> D[Directivas]
    S[Servicios<br/>lógica y acceso a datos] --> A
    S --> UT[Utils<br/>funciones puras]
    C --> UT
    A[Auth<br/>único cliente de Supabase] --> SB[(Supabase)]
```

| Capa | Carpeta | Qué contiene |
|---|---|---|
| **Ruteo** | `app.routes.ts`, `guards/` | Qué componente se carga en cada URL y quién puede entrar o salir. |
| **Presentación** | `componentes/` | Las pantallas. Manejan el estado de la vista con signals y llaman a los servicios. No consultan Supabase directamente. |
| **Servicios** | `servicios/` | Singletons (`@Service()`, equivalente a `providedIn: 'root'`). Encapsulan las consultas a Supabase, los canales de Realtime y la lógica compartida. |
| **Acceso a datos** | `servicios/auth.ts` | Crea **una única instancia** del cliente de Supabase; los demás servicios la obtienen con `inject(Auth).client()`. La única excepción es `Empleados`, que crea un cliente aparte sin sesión solo para el alta. |
| **Utilidades** | `utils/` | Funciones puras sin Angular: asignación de salas, cálculo de edad, formato de fechas. |
| **Validadores** | `validadores/` | Validadores de grupo para Reactive Forms. |
| **Directivas** | `directivas/` | `*appRolAdmin`, directiva estructural que muestra contenido según el rol. |

### 3.2 Estructura de carpetas

```
src/app/
├── app.ts / app.html        componente raíz (solo <router-outlet>)
├── app.config.ts            providers: router, service worker y locale es-AR
├── app.routes.ts            definición de rutas (con comodín **)
├── componentes/
│   ├── login, registro                       pantallas públicas
│   ├── layout, nav                           contenedor de las pantallas autenticadas
│   ├── home, cartelera, card-pelicula, pelicula
│   ├── butacas, candy, checkout              flujo de compra
│   ├── mi-cuenta                             crédito, puntos, Mis películas, Mis compras
│   ├── validar-qr                            pantalla del empleado
│   └── admin/
│       ├── panel-admin, admin-inicio
│       ├── admin-peliculas, admin-pelicula-form
│       ├── admin-salas, admin-funciones
│       ├── admin-candy, admin-producto-form, admin-combo-form
│       ├── admin-cupones, admin-recompensas  (hijo de cupones)
│       ├── admin-reportes, admin-actividad
│       └── admin-empleados
├── servicios/               auth, roles, peliculas, funciones, salas, butaca,
│                            butacas-en-vivo, resenas, candys, reserva, compra,
│                            cupones, puntos, validacion, empleados, reportes,
│                            pdf-entradas, actividad
├── guards/                  auth-guard, rol-guard, cambios-sin-guardar-guard
├── validadores/             claves-coinciden, fecha-valida
├── utils/                   asignar-sala, edad, fechas
└── directivas/              rol-admin
```

### 3.3 Servicios y tablas

| Servicio | Responsabilidad | Tablas |
|---|---|---|
| `Auth` | Cliente de Supabase, registro, login, logout, usuario y perfil actual | `usuarios` (+ Supabase Auth) |
| `Roles` | Rol del usuario actual | `roles_usuarios` |
| `Peliculas` | Cartelera (ya estrenadas), Próximamente, top 3, géneros, ABM y baja lógica | `peliculas`, `peliculas_generos`, `generos`, `resenas`, `funciones` |
| `Funciones` | Funciones de una película, próximas funciones, alta y baja | `funciones` |
| `Salas` | Listado, alta y baja de salas | `salas`, `butacas` |
| `Butaca` | Generar las 518 butacas, butacas de una sala, ocupadas por función y canal de Realtime (Postgres Changes) | `butacas`, `entradas` |
| `ButacasEnVivo` | Canal de Realtime Presence por función: publica las butacas elegidas y expone las que eligen otros | — (Realtime) |
| `Resenas` | Últimas reseñas, reseñas de un usuario, ¿ya reseñó?, ¿vio la película?, crear reseña | `resenas`, `entradas`, `compras`, `funciones` |
| `Candys` | Categorías, productos y combos (ABM y activos) | `categorias_candy`, `productos_candy`, `combos`, `combos_productos` |
| `Cupones` | Buscar cupones, primera compra y ABM | `cupones`, `compras` |
| `Compra` | Confirmar (con código, crédito, canjes y puntos), deshacer, Mis compras y cancelar | `compras`, `entradas`, `compra_items`, `usuarios`, `puntos_movimientos` |
| `Puntos` | Saldo, movimientos, revertir una compra y ABM de recompensas | `puntos_movimientos`, `recompensas` |
| `Validacion` | Buscar una compra por código, validar el ingreso y entregar el candy | `compras`, `entradas`, `compra_items` |
| `Empleados` | Listar, dar de alta (con un segundo cliente sin sesión) y dar de baja | `roles_usuarios` (+ Supabase Auth) |
| `Reportes` | Compras no canceladas de un período, con sus entradas y su candy | `compras`, `entradas`, `compra_items` |
| `Actividad` | Registrar y leer el log de auditoría | `log_auditoria` |
| `Reserva` | Estado en memoria de la compra en curso (función, butacas, carrito, combo) | — |
| `PdfEntradas` | Generar el PDF con el QR de la compra | — |

### 3.4 Componentes y servicios que usan

| Componente | Servicios |
|---|---|
| `Login`, `Registro` | `Auth` |
| `Nav` | `Auth`, `Reserva` (y `Roles` vía `*appRolAdmin`) |
| `Home` | `Peliculas`, `Resenas`, `Candys`, `Reserva` |
| `Cartelera` | `Peliculas` (usa el hijo `CardPelicula`) |
| `Pelicula` | `Peliculas`, `Funciones`, `Auth`, `Resenas` |
| `Butacas` | `Butaca`, `ButacasEnVivo`, `Funciones`, `Reserva` |
| `Candy` | `Candys`, `Reserva` |
| `Checkout` | `Reserva`, `Compra`, `Funciones`, `Auth`, `Cupones`, `Puntos`, `PdfEntradas` |
| `MiCuenta` | `Auth`, `Compra`, `Puntos`, `Resenas` |
| `ValidarQr` | `Validacion`, `Actividad` |
| `AdminPeliculas`, `AdminPeliculaForm` | `Peliculas`, `Actividad` |
| `AdminSalas` | `Salas`, `Butaca`, `Actividad` |
| `AdminFunciones` | `Peliculas`, `Salas`, `Funciones`, `Actividad` (y `utils/asignar-sala`) |
| `AdminCandy`, `AdminProductoForm`, `AdminComboForm` | `Candys`, `Actividad` |
| `AdminCupones` | `Cupones`, `Actividad` (usa el hijo `AdminRecompensas`) |
| `AdminRecompensas` | `Puntos`, `Candys`, `Actividad` |
| `AdminReportes` | `Reportes` |
| `AdminActividad` | `Actividad` |
| `AdminEmpleados` | `Empleados`, `Actividad` |

## 4. Ruteo y control de acceso

```mermaid
flowchart TD
    ROOT["/ (raíz)"] --> R0["'' → redirige a /login"]
    ROOT --> LOGIN["/login"]
    ROOT --> REG["/registro"]
    ROOT --> LAY["'' Layout (nav)<br/>canActivate: authGuard"]
    ROOT --> COM["** → redirige a /home"]

    LAY --> HOME[home]
    LAY --> CART[cartelera]
    LAY --> PEL["pelicula/:id"]
    LAY --> BUT["funcion/:id/butacas"]
    LAY --> CAN["funcion/:id/candy"]
    LAY --> CHK["funcion/:id/checkout"]
    LAY --> MC["mi-cuenta"]
    LAY --> VAL["validar<br/>canActivate: rolGuard('Empleado')"]
    LAY --> ADM["admin: PanelAdmin<br/>canActivate: rolGuard('Admin')"]

    ADM --> AI["'' AdminInicio"]
    ADM --> AP["peliculas, peliculas/nueva*, peliculas/:id/editar*"]
    ADM --> AS["salas*, funciones*"]
    ADM --> AC["candy, candy/productos/...*, candy/combos/...*"]
    ADM --> ACU["cupones* (+ recompensas)"]
    ADM --> AR["reportes, actividad"]
    ADM --> AE["empleados*"]
```

Las rutas marcadas con `*` tienen `canDeactivate: [cambiosSinGuardarGuard]`.

| Guard | Tipo | Dónde | Qué hace |
|---|---|---|---|
| `authGuard` | `CanActivate` | Padre `Layout` | Deja pasar si hay sesión de Supabase o un comprador anónimo en `localStorage`. Si no, navega a `/login`. |
| `rolGuard(rol)` | Función que devuelve un `CanActivate` | `admin` y `validar` | Consulta el rol en `roles_usuarios`. Si no coincide, devuelve un `UrlTree` a `/home`. |
| `cambiosSinGuardarGuard` | `CanDeactivate` | Formularios del admin | Si el componente informa cambios sin guardar (interfaz `ConCambiosSinGuardar`), pide confirmación antes de salir. |

Todas las rutas usan **lazy loading** (`loadComponent`): el código de cada pantalla se descarga recién al entrar.

**Roles:**

| Rol | Cómo se identifica | Acceso |
|---|---|---|
| Anónimo | Email en `localStorage`, sin sesión | Catálogo y compra (sin cupones de cliente, puntos, crédito ni reseñas) |
| Cliente | Sesión de Supabase con fila en `usuarios` | Catálogo, compra, cupones, puntos, crédito, reseñas y **Mi cuenta** |
| Empleado | Fila en `roles_usuarios` con `rol_usuario = 'Empleado'` | **Validar QR** |
| Admin | Fila en `roles_usuarios` con `rol_usuario = 'Admin'` | Todo, más `/admin` |

## 5. Manejo del estado

| Dónde vive | Qué guarda | Duración |
|---|---|---|
| **Signals de cada componente** | Datos de la pantalla (películas, butacas, formularios, mensajes) | Mientras la pantalla está abierta |
| **Servicio `Reserva`** (signals en un singleton) | Función, butacas, carrito y combo de la compra en curso | Hasta confirmar la compra, cerrar sesión o recargar |
| **Servicio `ButacasEnVivo`** | Canal de Presence de la función y las butacas que eligen otros | Mientras se navega dentro de `/funcion/...` |
| **Canal de Realtime (Presence)** | Las butacas que cada pantalla tiene marcadas | Mientras la pestaña está conectada al canal |
| **URL** | Texto de búsqueda de la cartelera (`?buscar=`), ids de película y función | Sobrevive a la recarga y se puede compartir |
| **`localStorage`** | Sesión de Supabase y nombre y email del comprador anónimo | Hasta cerrar sesión |
| **Postgres** | Todo lo persistente (incluido el crédito y los puntos) | Permanente |

## 6. Flujos principales

### 6.1 Ingreso y protección de rutas

```mermaid
sequenceDiagram
    actor U as Usuario
    participant L as Login
    participant A as Auth
    participant SA as Supabase Auth
    participant R as Router
    participant G as authGuard

    U->>L: email y contraseña
    L->>A: signIn(email, password)
    A->>SA: signInWithPassword
    SA-->>A: sesión o error
    A-->>L: null o mensaje de error
    L-->>U: muestra el error traducido (si hubo)
    L->>R: navigate('/home')
    R->>G: ¿puede entrar?
    G->>A: getUser()
    A-->>G: usuario
    G-->>R: true
    R-->>U: muestra Home
```

El comprador anónimo no pasa por Supabase: `Login` guarda su nombre y email en `localStorage`, y `authGuard` lo deja pasar por eso.

### 6.2 Butacas en tiempo real

```mermaid
sequenceDiagram
    actor A as Cliente A
    participant BA as Butacas (A)
    participant RT as Supabase Realtime
    participant BB as Butacas (B)
    actor B as Cliente B

    BA->>RT: entra al canal de Presence de la función
    BB->>RT: entra al mismo canal
    BA->>RT: escucha cambios de entradas (Postgres Changes)
    A->>BA: marca G10
    BA->>RT: track({ butacas: [G10] })
    RT-->>BB: sync de Presence
    BB-->>B: G10 bloqueada (rayada)
    A->>BA: compra G10 (insert en entradas)
    RT-->>BB: cambio en entradas
    BB->>BB: vuelve a pedir las ocupadas
    BB-->>B: G10 ocupada
```

Si A cierra la pestaña o sale del flujo de compra, Realtime lo saca del canal y la butaca vuelve a estar libre para B. El índice único de `entradas` es la última barrera si dos personas confirman la misma butaca a la vez.

### 6.3 Compra

```mermaid
sequenceDiagram
    actor U as Usuario
    participant B as Butacas
    participant C as Candy
    participant K as Checkout
    participant RS as Reserva
    participant CO as Compra
    participant DB as Supabase
    participant PDF as PdfEntradas

    U->>B: selecciona butacas
    B->>RS: setFuncionId, setButacas
    B->>C: /funcion/:id/candy (sin combo)
    U->>C: arma el carrito (opcional)
    C->>RS: guarda el carrito
    C->>K: /funcion/:id/checkout
    K->>RS: lee función, butacas, carrito y combo
    K->>DB: perfil (crédito), puntos, recompensas, ¿primera compra?
    U->>K: cupón, canjes de puntos, crédito, método de pago, confirmar
    K->>CO: confirmarCompra(...)
    CO->>DB: insert compras (con código único)
    CO->>DB: insert entradas
    alt la butaca ya se vendió (23505)
        CO->>DB: deshacer compra
        CO-->>K: 'ocupada' → "Elegir otras butacas"
    end
    CO->>DB: insert compra_items (pagados y canjeados a $0)
    CO->>DB: update usuarios (descuenta crédito)
    CO->>DB: insert puntos_movimientos (canjes y puntos ganados)
    CO-->>K: compra y entradas
    K->>RS: limpiar()
    K-->>U: muestra el código de la compra
    U->>K: descargar PDF
    K->>PDF: generar(compra, entradas, butacas, candy, función)
```

Controles del checkout antes de confirmar:
- Que la función no haya empezado.
- La edad mínima de la película: calculada para el registrado, declarada por el anónimo.
- La validez del cupón.
- Que no se canjeen más puntos de los que hay.

Con combo, `Butacas` va directo al checkout y exige elegir exactamente las entradas del combo.

### 6.4 Cancelación

```mermaid
sequenceDiagram
    actor U as Cliente
    participant M as MiCuenta
    participant CO as Compra
    participant P as Puntos
    participant DB as Supabase

    U->>M: Cancelar compra
    M->>M: ¿faltan más de 2 h y no se usó ninguna entrada?
    M->>CO: cancelarCompra(compra)
    CO->>DB: update compras set cancelada (si no lo estaba)
    CO->>DB: update entradas set anulada
    CO->>P: revertirCompra(compra)
    P->>DB: insert puntos_movimientos (− lo ganado, + lo canjeado)
    CO->>DB: update usuarios (+ total pagado como crédito)
    M-->>U: compra cancelada y crédito acreditado
```

Al anularse las entradas, Realtime avisa a las pantallas de butacas abiertas y esas butacas se liberan.

### 6.5 Validación del QR (empleado)

```mermaid
sequenceDiagram
    actor E as Empleado
    participant V as ValidarQr
    participant VS as Validacion
    participant AC as Actividad
    participant DB as Supabase

    E->>V: código de la compra + Validar ingreso / Entregar candy
    V->>VS: buscarCompra(código)
    VS->>DB: compra con sus entradas, función y candy
    V->>V: ¿existe? ¿cancelada? ¿ya usado? ¿es el día de la función?
    V->>VS: validarIngreso(compra) o entregarCandy(compra)
    VS->>DB: update entradas (solo las que todavía no se usaron)
    V->>AC: registrar("Validó el ingreso de la compra N° X")
    V-->>E: cartel verde o rojo con el motivo
```

### 6.6 Programación de funciones (admin)

```mermaid
sequenceDiagram
    actor A as Admin
    participant F as AdminFunciones
    participant FS as Funciones
    participant AS as utils/asignar-sala
    participant AC as Actividad
    participant DB as Supabase

    A->>F: película, días, hora, desde, semanas
    F->>F: generarFechas()
    F->>FS: getFuncionesEntre(desde, hasta)
    FS->>DB: funciones existentes con su duración
    loop por cada fecha
        F->>AS: buscarSalaLibre(salas, ocupadas, fecha, duración)
        AS-->>F: id de sala o null
    end
    F-->>A: vista previa (y fechas sin sala)
    A->>F: confirmar
    F->>FS: crearFunciones(plan)
    FS->>DB: insert funciones
    F->>AC: registrar("Creó N funciones...")
```

Una sala está ocupada desde el inicio de la función hasta el fin de la película **más 30 minutos de limpieza**. Las funciones del mismo lote también se agregan a las ocupadas, para que no se pisen entre sí.

## 7. Modelo de datos

```mermaid
erDiagram
    AUTH_USERS ||--o| USUARIOS : "perfil de cliente"
    AUTH_USERS ||--o| ROLES_USUARIOS : "rol"
    AUTH_USERS ||--o{ LOG_AUDITORIA : "registra"

    USUARIOS ||--o{ COMPRAS : "hace"
    USUARIOS ||--o{ RESENAS : "escribe"
    USUARIOS ||--o{ PUNTOS_MOVIMIENTOS : "acumula"

    PELICULAS ||--o{ PELICULAS_GENEROS : ""
    GENEROS ||--o{ PELICULAS_GENEROS : ""
    PELICULAS ||--o{ FUNCIONES : "se proyecta en"
    PELICULAS ||--o{ RESENAS : "recibe"

    SALAS ||--o{ BUTACAS : "tiene"
    SALAS ||--o{ FUNCIONES : "aloja"

    COMPRAS ||--o{ ENTRADAS : "incluye"
    COMPRAS ||--o{ COMPRA_ITEMS : "incluye"
    CUPONES ||--o{ COMPRAS : "se aplica a"
    FUNCIONES ||--o{ ENTRADAS : "para"
    BUTACAS ||--o{ ENTRADAS : "ocupa"

    CATEGORIAS_CANDY ||--o{ PRODUCTOS_CANDY : "agrupa"
    PRODUCTOS_CANDY ||--o{ COMPRA_ITEMS : ""
    COMBOS ||--o{ COMPRA_ITEMS : ""
    COMBOS ||--o{ COMBOS_PRODUCTOS : ""
    PRODUCTOS_CANDY ||--o{ COMBOS_PRODUCTOS : ""
    PRODUCTOS_CANDY ||--o| RECOMPENSAS : "se canjea por"

    COMPRAS ||--o{ PUNTOS_MOVIMIENTOS : "origina"
    ENTRADAS ||--o{ PUNTOS_MOVIMIENTOS : "canje"
    COMPRA_ITEMS ||--o{ PUNTOS_MOVIMIENTOS : "canje"

    PELICULAS {
        bigint id PK
        text nombre
        text sinopsis
        int duracion
        text formato
        int clasificacion_edad
        text idioma
        timestamp fecha_estreno
        int precio_normal
        int precio_preventa
        bool activa
    }
    FUNCIONES {
        bigint id PK
        bigint pelicula_id FK
        bigint sala_id FK
        timestamp fecha_hora
    }
    BUTACAS {
        bigint id PK
        bigint sala_id FK
        text fila
        int numero
        text tipo_butaca
        numeric precio
    }
    COMPRAS {
        bigint id PK
        uuid usuario_id FK
        bigint cupon_id FK
        text codigo UK
        text email_comprador
        int total_pagado
        int credito_usado
        text metodo_pago
        bool cancelada
        timestamp fecha_compra
        timestamp fecha_cancelacion
    }
    ENTRADAS {
        bigint id PK
        bigint compra_id FK
        bigint funcion_id FK
        bigint butaca_id FK
        text qr UK
        bool ingreso_validado
        bool candy_retirado
        bool anulada
    }
    COMPRA_ITEMS {
        bigint id PK
        bigint compra_id FK
        bigint producto_id FK
        bigint combo_id FK
        int cantidad
        int precio_unitario
    }
    USUARIOS {
        uuid id PK
        text nombre
        text apellido
        date fecha_nacimiento
        int credito_disponible
    }
    ROLES_USUARIOS {
        uuid id PK
        text rol_usuario
        text nombre
        text email
    }
    RESENAS {
        bigint id PK
        uuid usuario_id FK
        bigint pelicula_id FK
        int calificacion
        text comentario
        timestamp creado_en
    }
    PUNTOS_MOVIMIENTOS {
        bigint id PK
        uuid usuario_id FK
        int puntos
        bigint compra_id FK
        bigint entrada_id FK
        bigint compra_item_id FK
        text descripcion
        timestamp creado_en
    }
    RECOMPENSAS {
        bigint id PK
        text tipo
        bigint producto_id FK
        int costo_puntos
        bool activa
    }
    COMBOS {
        bigint id PK
        text nombre
        int precio
        int cantidad_entradas
        text imagen_ruta
        bool activo
    }
```

| Grupo | Tablas | Notas |
|---|---|---|
| Usuarios | `usuarios`, `roles_usuarios`, `auth.users` | `usuarios` y `roles_usuarios` usan como clave el `id` de Supabase Auth. `usuarios.credito_disponible` guarda el crédito por cancelaciones. |
| Catálogo | `peliculas`, `generos`, `peliculas_generos`, `resenas` | Relación muchos a muchos entre películas y géneros. `activa` implementa la baja lógica y `fecha_estreno` separa la cartelera de Próximamente. |
| Salas | `salas`, `butacas`, `funciones` | Una función une película, sala y horario. La hora de fin no se guarda: se calcula. |
| Ventas | `compras`, `entradas`, `compra_items`, `cupones` | Una compra tiene un código único (el del QR), una entrada por butaca y un ítem por producto o combo. Al cancelar, la compra queda `cancelada` y sus entradas `anuladas`. |
| Candy | `categorias_candy`, `productos_candy`, `combos`, `combos_productos` | Un combo tiene precio fijo, cantidad de entradas y productos. |
| Fidelización | `puntos_movimientos`, `recompensas` | Saldo = suma de movimientos. Cada canje se vincula a su entrada o ítem. `recompensas` guarda el costo en puntos de la entrada gratis y de cada producto. |
| Auditoría | `log_auditoria` | Texto libre por evento, con usuario, email y fecha. Incluye las validaciones de QR. |

Restricciones relevantes en la base:
- **`CHECK`** sobre los valores permitidos:
  - `formato`, `idioma`, `clasificacion_edad`, `tipo_butaca`, `calificacion`, `rol_usuario`.
  - `metodo_pago`: Tarjeta, Efectivo, Crédito, Tarjeta + Crédito, Efectivo + Crédito y Puntos.
  - `recompensas.tipo`.
  - Que `tipo_cupon` no esté vacío.
  - Que un ítem sea producto o combo, nunca los dos.
  - Que los puntos de un movimiento no sean 0.
- **`UNIQUE`:**
  - `compras.codigo`, `entradas.qr` y `resenas (usuario_id, pelicula_id)`.
  - `salas.nombre`, `generos.nombre`, `cupones.codigo_cupon`, `productos_candy.nombre`, `combos.nombre` y `categorias_candy.nombre`.
  - `butacas (sala_id, fila, numero)` y una recompensa por tipo y producto.
- **Índice único parcial** `entradas (funcion_id, butaca_id) WHERE NOT anulada`: una butaca no se puede vender dos veces para la misma función, pero sí volver a venderse si la compra anterior se canceló.

## 8. Seguridad

- **Autenticación:** Supabase Auth con email y contraseña. La sesión la maneja `supabase-js` en el navegador. El alta de empleados usa un cliente aparte sin sesión, para no pisar la del admin.
- **Autorización en la app:**
  - `authGuard` y `rolGuard('Admin')` / `rolGuard('Empleado')` deciden qué rutas se pueden abrir.
  - `*appRolAdmin` oculta elementos de la interfaz.
- **Autorización en la base:** **parcial.**
  - Solo `entradas` tiene RLS, con policies abiertas para `anon` y `authenticated`, necesarias para Realtime.
  - El resto de las tablas no tiene RLS, así que el control es del lado del cliente.
  - La clave del repositorio es la *publishable key*, pensada para el navegador; la protección real depende de configurar políticas RLS por tabla y por rol.
- **Realtime:** los canales son públicos (sin `private: true`), y el proyecto tiene activado *Allow public access*.

## 9. Despliegue

```mermaid
flowchart LR
    DEV[Código fuente] -- npm run build --> DIST[dist/Tp1-pagina-cine/browser<br/>+ ngsw-worker.js]
    DIST -- firebase deploy --> FH[Firebase Hosting<br/>cinepop-tp1-prograiv]
    FH -- HTTPS --> NAV[Navegador]
    NAV -- instala --> PWA[PWA + service worker]
```

- `npm run build` genera el build de producción. Con la configuración de producción se activa el **service worker** (`ngsw-config.json`): los archivos de la app se descargan de antemano (`prefetch`) y las imágenes y fuentes a medida que se usan (`lazy`).
- `firebase deploy` publica la carpeta del build. `firebase.json` redirige **todas las rutas a `index.html`**, necesario para que el router de Angular resuelva una URL interna al recargar.
- Firebase sirve por **HTTPS**, requisito para registrar el service worker e instalar la PWA.
- Supabase es un servicio administrado: no se despliega con la app. Su URL y la clave pública están en `src/environments/environments.ts`. Los cambios de la base (columnas, índices, policies y la publicación de Realtime) se aplican desde el SQL Editor de Supabase.

## 10. Limitaciones y evolución

El detalle está en [DECISIONES.md](DECISIONES.md#limitaciones-conocidas). Las de mayor impacto en la arquitectura son:

- **RLS parcial:** la seguridad de los datos depende de configurar políticas en el resto de las tablas.
- **Compra y cancelación no transaccionales:** son varias operaciones desde el cliente, con una compensación (`deshacerCompra`) si algo falla. Para que sean todo o nada habría que moverlas a funciones de la base (RPC).
- **Crédito con lectura y escritura desde el cliente:** dos operaciones simultáneas de la misma cuenta podrían pisarse. Una RPC con `credito_disponible = credito_disponible + monto` lo resolvería.
- **Controles de hora en el navegador:** dependen del reloj de quien usa la app.
- **Estado de la compra en memoria:** se pierde al recargar la página.
- **Precio de la entrada:** todavía sale de la butaca y no de la película (preventa pendiente).
