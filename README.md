## Decisiones de negocio

### Butacas por sala
518 butacas en 19 filas: 15 normales (A-I, L-Q) de 28 butacas, 1 fila accesible (letra J, se elimina la K) de 14 butacas, y 3 filas VIP (R, S, T) de 28 butacas cada una, a mayor precio. El tipo de butaca es un solo campo de texto en `butacas`, no tablas separadas. Las filas de cada sala se generan desde Angular (no con un trigger SQL, para no depender de PL/pgSQL, no visto en la materia).

### Usuarios y roles
`usuarios` (datos de cliente) está separada de `roles_usuarios` (admin/empleado), porque esas cuentas no pasan por el registro público y no tienen los campos obligatorios de un cliente. Sin fila en `roles_usuarios`, se asume cliente. Tipo de sangre, color de ojos y días de vacaciones se guardan porque el cliente los pidió, aunque no condicionan ninguna regla de negocio

### Flujo de compra
Película → Función → Butacas → Candy → Checkout, en pantallas separadas. El precio de cada ítem se congela en `compra_items.precio_unitario` al momento de la compra, para no verse afectado por cambios de precio posteriores.

### Butacas en tiempo real
**Pendiente de implementar.** Se decidió usar Supabase Realtime Broadcast: la selección temporal de butacas se emitiría por canal, sin persistir en la base — solo la compra confirmada crearía filas en `entradas`.

La asignación de sala es automática y la regla de 30 minutos entre funciones se valida en el código, no como constraint de SQL. La hora de fin de una función no se guarda: se calcula sumando la duración de la película al horario de inicio.

### Catálogo y filtros
Buscador de texto y filtro de género se combinan con AND. Entre géneros seleccionados, es OR (tildar "Terror" y "Acción" muestra películas con cualquiera de los dos) — el comportamiento esperable en un catálogo tipo streaming.

### Compra anónima
Nombre y email del comprador anónimo se guardan en `localStorage`, sin crear usuario real en Supabase Auth. Se pide ese dato mínimo antes de navegar el catálogo (decisión propia, no exigida por el cliente) porque sin un email no habría forma de entregar el PDF/QR de una compra anónima.

### QR compartido (entrada + candy)
El enunciado es ambiguo sobre si el QR se invalida entero con el primer uso. Se optó por dos columnas booleanas independientes (`ingreso_validado`, `candy_retirado`), permitiendo validar entrada y candy en momentos distintos con el mismo QR.

### Puntos y crédito
Los puntos de fidelización usan una tabla de movimientos (`puntos_movimientos`), porque el cliente pidió historial de canjes; el saldo se calcula sumando movimientos, no se guarda aparte. El crédito por cancelación es una sola columna en `usuarios`, sin historial, porque no se pidió esa trazabilidad.

### Log de auditoría
Una columna de texto libre (`descripcion`) por evento, armada desde el código.

### Seguridad
RLS no está configurado todavía en ninguna tabla — queda pendiente junto con el panel de admin. Por ahora el control de acceso es solo del lado del cliente (guards de Angular), una limitación conocida del estado actual.
