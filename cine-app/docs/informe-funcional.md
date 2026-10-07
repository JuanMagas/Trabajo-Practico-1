# CineApp — Informe funcional

CineApp es el sitio web del cine para vender entradas y productos del candy bar por internet, y para que el personal controle la entrada a las salas y administre toda la operación. Este informe describe qué hace el sistema para cada tipo de usuario y qué reglas respeta; cómo está construido se explica en el [Informe técnico](informe-tecnico.md), que se entrega por separado.

## Actores

Hay cuatro tipos de usuario. Lo que cada uno puede hacer depende de su rol, no de lo que muestre la pantalla.

| Actor | Quién es | Qué puede hacer |
| --- | --- | --- |
| Visitante anónimo | Cualquier persona, sin registrarse | Ver la cartelera, las próximas películas, las reseñas y los combos; elegir butacas, sumar productos y pagar |
| Cliente registrado | Quien creó una cuenta con sus datos | Todo lo anterior, más descuentos, crédito, puntos, canjes, historial, reseñas, alertas y cancelaciones |
| Empleado | Personal del cine | Validar entradas, entregar productos del candy bar y entregar canjes de puntos |
| Administrador | Responsable del cine | Todo lo que hace el empleado, más administrar películas, salas, funciones, precios, productos, combos, cupones, recompensas, reportes y el registro de actividad |

Para registrarse se piden mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y días de vacaciones por año. Registrarse da un cupón del 20% en la primera compra.

## Funcionalidades por área

### Cartelera y películas

- La página principal muestra primero las 3 películas más vendidas y, debajo, el resto de la cartelera.
- Un buscador filtra por título y por género; cada película puede tener varios géneros.
- Cada película muestra póster, duración, sinopsis, restricción de edad, puntuación promedio y reseñas, antes de elegir función.
- La sección **Próximamente** lista los estrenos con su fecha, desde cuándo se venden entradas y el precio de preventa. Los clientes pueden activar un aviso para enterarse cuando abra la venta.

### Compra de entradas

- El cliente elige una función (fecha, hora, formato 2D, 3D, 4D o 5D, e idioma castellano o subtitulada) y marca sus butacas en el mapa de la sala.
- El mapa se actualiza en tiempo real: si otra persona ocupa una butaca, deja de estar disponible sin recargar la página.
- Las butacas accesibles y las VIP se ven distintas de las comunes, y el pago indica con claridad cuáles son VIP.
- Las butacas elegidas quedan reservadas 10 minutos mientras se completa la compra.
- Antes de pagar se ve el detalle: precio de cada entrada, descuento, productos, crédito aplicado y total.
- Al confirmar, el cliente recibe un PDF con los datos de la función y un código QR.

### Candy bar y combos

- Los productos están ordenados por categoría (bebidas, comidas, golosinas, pochoclos) y se compran junto con la entrada.
- Los combos especiales aparecen destacados en la página de compra. Un combo con entrada incluida deja una de las entradas sin costo y cobra el precio fijo del combo.
- Con el mismo QR se retira el candy bar.

### Cuenta del cliente

| Sección | Qué muestra o permite |
| --- | --- |
| Mis entradas | Próximas funciones e historial, con el PDF de cada entrada, el crédito disponible, los puntos y la opción de cancelar |
| Mis películas | Historial visual de lo que vio, con póster, fecha y su calificación |
| Mis puntos | Puntos acumulados, recompensas disponibles, canje y historial de canjes |
| Mis reseñas | Calificación con estrellas y comentario corto de cada película vista |

### Empleado

Una sola pantalla con un campo de código. El empleado escanea el QR con el lector o escribe el código a mano, y elige entre **validar la entrada**, **entregar el candy bar** o **entregar un canje**. El resultado se muestra con claridad como válido o rechazado, con el motivo.

### Administrador

| Sección | Qué permite |
| --- | --- |
| Películas | Crear y editar películas, sus géneros, restricción de edad, estado y fecha de estreno |
| Salas y funciones | Programar funciones; la sala se asigna sola, sin superposiciones |
| Productos | Crear productos y categorías, cambiar precios y dar de baja |
| Combos | Armar combos con productos, precio fijo y entrada incluida o no |
| Cupones | Cambiar el porcentaje de la primera compra y crear cupones por edad |
| Recompensas | Definir cuántos puntos cuesta cada entrada o producto canjeable |
| Reportes | Facturación por día y entradas vendidas, con exportación a PDF y Excel; películas más vistas por semana y por mes; producto más vendido |
| Registro de actividad | Quién creó funciones, cambió precios, validó entradas o entregó productos, con fecha y hora |

## Flujos principales

### Comprar una entrada

1. El cliente elige una película, lee sus reseñas y elige una función.
2. Marca las butacas en el mapa. Si la película tiene restricción de edad y no inició sesión, debe aceptar un aviso que indica que debe asistir un adulto.
3. Opcionalmente suma productos o combos del candy bar.
4. Revisa el detalle: entradas, descuento, productos, crédito y total. Las butacas VIP quedan indicadas.
5. Confirma el pago. El sistema registra la compra y muestra el QR.
6. Descarga el PDF con los datos de la función y el QR.

### Cancelar una compra

1. El cliente entra a **Mis entradas** y elige **Cancelar compra**. Solo está disponible hasta 2 horas antes de la función.
2. Las butacas quedan libres para otros clientes.
3. No se devuelve dinero: el total de la compra pasa a ser crédito en su cuenta, que se descuenta automáticamente en la próxima compra.

### Canjear puntos

1. El cliente acumula 1 punto por cada peso pagado.
2. En **Mis puntos** elige una recompensa cuyo costo pueda cubrir.
3. Recibe un código de canje y el sistema le descuenta los puntos.
4. En el cine, el empleado ingresa el código y entrega la recompensa, una sola vez.

### Entrar a la sala y retirar el candy

1. El empleado escanea o escribe el código de la compra.
2. Si la entrada es válida, el sistema muestra película, sala, horario y butacas, y la marca como usada.
3. Para el candy bar, el empleado usa el mismo código y el sistema le muestra qué entregar.
4. La entrada y el candy se usan por separado: cada uno solo puede usarse una vez.

### Programar una función

1. El administrador elige película, fecha, hora, formato, idioma y precio, y opcionalmente un precio de preventa con su fecha límite.
2. El sistema asigna la primera sala libre, dejando al menos 30 minutos entre el fin de una función y el inicio de la siguiente.
3. Si no hay ninguna sala libre, o la función terminaría pasada la medianoche, avisa y propone el último horario posible.

## Reglas de negocio

El total de una compra se calcula siempre en el servidor, nunca en la pantalla del cliente, en este orden:

1. **Precio base:** el de preventa mientras la fecha límite no haya pasado; después, el precio normal de la función.
2. **Tipo de butaca:** las filas J y K son accesibles, las filas R, S y T son VIP y cuestan 1,5 veces el precio base, y el resto son estándar.
3. **Descuento:** solo para clientes registrados y solo sobre las entradas, nunca sobre el candy bar. Si le corresponden varios cupones, se aplica el de mayor porcentaje: primera compra, o el cupón por edad cuando supera la edad mínima que fijó el administrador.
4. **Candy bar:** el precio sale del catálogo; se pueden llevar hasta 20 unidades de cada producto. Un producto dado de baja corta la compra.
5. **Combos con entrada:** por cada combo, la entrada más barata queda sin costo y se cobra el precio fijo del combo. No puede haber más combos que butacas.
6. **Crédito:** se descuenta del total hasta cubrirlo; lo que falta se paga.
7. **Puntos:** 1 por cada peso efectivamente pagado. Lo que se cubrió con crédito no suma puntos.

| Situación | Qué hace el sistema |
| --- | --- |
| Película para mayores de 13 o de 18 y cliente registrado menor de esa edad | No le permite comprar |
| Película para mayores y comprador anónimo | Puede comprar, pero debe aceptar un aviso y su entrada indica que debe asistir un adulto |
| Función que ya comenzó | No se pueden comprar entradas |
| Película que se estrena en más de 7 días | La venta aún no está abierta; se muestra desde cuándo se puede comprar |
| Preventa | La venta abre 7 días antes del estreno; hasta la fecha límite de preventa que fijó el administrador en la función se cobra el precio especial, y después vuelve al normal |
| Dos personas eligen la misma butaca a la vez | Gana la primera; a la otra se le avisa y elige otra |
| Reserva de butacas sin pagar | Se libera a los 10 minutos |
| Cancelación hasta 2 horas antes | Libera las butacas, devuelve el total como crédito y resta los puntos que había dado la compra |
| Cancelación con entrada ya usada, candy ya retirado o a menos de 2 horas | No se permite |
| Canje de puntos | Descuenta los puntos, no se puede transferir a otra persona y se entrega una sola vez |
| QR de entrada o de candy ya usado | Se rechaza; cada uno se usa una sola vez |
| Validación de una entrada | Solo el día de la función y solo por personal del cine |
| Función nueva | Se asigna a la primera sala libre, con 30 minutos de margen entre funciones; no puede terminar después de las 00:00 |

## Cumplimiento de los requerimientos

Cada pedido de los mails del cliente y dónde se ve en la aplicación. Todo está cumplido salvo el mapa del cine, que el cliente no aprobó.

| Mail | Requerimiento | Estado | Dónde verlo |
| --- | --- | --- | --- |
| 1 | Salas de 20 filas con 3 bloques de 4, 20 y 4 butacas | Cumplido | Mapa de butacas al comprar |
| 1 | El admin elige películas, horarios, formato (2D a 5D) e idioma | Cumplido | Admin: Películas y Salas y funciones |
| 1 | 30 minutos entre funciones de una misma sala | Cumplido | Admin: Salas y funciones |
| 1 | Registro con mail, nombre, apellido, nacimiento, sangre, ojos y vacaciones | Cumplido | Registro |
| 1 | Cupón del 20% en la primera compra; compra anónima permitida | Cumplido | Registro y pago |
| 1 | PDF con los datos y el QR de la entrada | Cumplido | Confirmación y Mis entradas |
| 2 | Reseñas con estrellas y comentario corto, visibles antes de comprar, con promedio | Cumplido | Detalle de la película |
| 2 | Las 3 más vendidas primero y buscador con filtro por varios géneros | Cumplido | Página principal |
| 3 | Cupón de primera compra configurable y cupón para mayores de 50 | Cumplido | Admin: Cupones |
| 3 | Candy bar con productos y categorías, comprado con la entrada y retirado con el mismo QR | Cumplido | Candy bar y Admin: Productos |
| 3 | Mapa de todo el cine | No implementado | El cliente no dio luz verde |
| 4 | Usuario administrador y usuarios empleados | Cumplido | Inicio de sesión |
| 4 | Validar entradas y candy con QR o código a mano; el QR deja de servir | Cumplido | Pantalla del empleado |
| 4 | Asignación automática de sala sin superposiciones | Cumplido | Admin: Salas y funciones |
| 5 | Restricción de edad 13 y 18, con aviso de acompañante adulto | Cumplido | Detalle y pago |
| 5 | Butacas accesibles en las filas J y K, resaltadas | Cumplido | Mapa de butacas |
| 5 | Butacas en tiempo real | Cumplido | Mapa de butacas |
| 6 | Interfaces fáciles de navegar, con poco scroll | Cumplido | Toda la app |
| 6 | Reporte de facturación por día y entradas vendidas | Cumplido | Admin: Reportes |
| 7 | Puntos por compra (1 por peso), canje por entradas o productos, costos configurables | Cumplido | Mis puntos y Admin: Recompensas |
| 7 | Puntos e historial de canjes en el perfil; no transferibles | Cumplido | Mis puntos |
| 7 | Combos a precio fijo, destacados al comprar | Cumplido | Candy bar y Admin: Combos |
| 8 | Sección Próximamente con alertas de disponibilidad | Cumplido | Próximamente |
| 8 | Preventa con precio especial desde 7 días antes del estreno | Cumplido | Detalle y Admin: Salas y funciones |
| 8 | Mis películas con póster, fecha y calificación | Cumplido | Mis películas |
| 9 | Cancelar hasta 2 horas antes con crédito en vez de dinero | Cumplido | Mis entradas |
| 9 | Butacas VIP en R, S y T, más caras, marcadas y avisadas antes de pagar | Cumplido | Mapa de butacas y pago |
| 9 | Exportar la facturación a PDF y Excel | Cumplido | Admin: Reportes |
| 9 | Gráficos de películas más vistas por semana y mes, y producto más vendido | Cumplido | Admin: Reportes |
| 9 | Registro de actividad con fecha y hora | Cumplido | Admin: Registro de actividad |
| TP | Aplicación instalable (PWA) con estilo visual propio | Cumplido | Toda la app |

## Alcance y supuestos

Decisiones que se tomaron donde los mails dejaban un punto abierto, y qué queda fuera de esta versión.

| Tema | Qué se asumió o qué queda fuera |
| --- | --- |
| Pago | Es simulado: la aplicación no cobra dinero real ni se conecta con un medio de pago |
| Alertas de "avisame" | El cliente las ve dentro de la aplicación al volver a entrar; no se envían mails ni notificaciones al celular |
| Preventa | Se configura en cada función, lo que permite un precio distinto por horario o formato |
| Descuentos | Se aplican solo a las entradas, no al candy bar; si corresponden varios, se usa el mayor y no se suman |
| Cancelación | Siempre devuelve el total como crédito, incluso lo que se había pagado con crédito |
| Funciones | No pueden terminar después de las 00:00 |
| Lectura del QR | Se usa un lector que escribe el código o se tipea a mano; no se escanea con la cámara del celular |
| Excel | El reporte se exporta en un formato que Excel abre directamente (CSV) |
| Mapa del cine | No se desarrolló, porque el cliente aún no lo aprobó |
| Productos más vendidos | Un combo se cuenta como un producto con el precio completo del combo |
