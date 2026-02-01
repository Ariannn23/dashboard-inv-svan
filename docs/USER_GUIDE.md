# Manual de Usuario - Sistema ERP Inversiones Svan

## 1. Acceso al Sistema

Para ingresar al sistema, diríjase a la página de inicio de sesión e introduzca sus credenciales.

- **Administrador**: Tiene acceso total a todas las funciones.
- **Vendedor**: Tiene acceso limitado (principalmente Ventas y consulta de productos).

## 2. Dashboard Principal

Al iniciar sesión, verá el panel de control principal que muestra un resumen del negocio:

- **Tarjetas de Resumen**: Ventas del día, ventas del mes, productos con stock bajo.
- **Gráficos**: Evolución de ventas en los últimos 7 días.
- **Productos Top**: Los 5 productos más vendidos.
- **Accesos Directos**: Botones rápidos para ir a Venta, Productos o Clientes.

## 3. Gestión de Productos (Inventario)

En la sección "Productos", puede administrar el catálogo.

### Crear Producto

1.  Haga clic en el botón "Nuevo Producto".
2.  Complete el formulario con: Nombre, Categoría, Precios (Compra/Venta), Stock Inicial, Stock Mínimo (para alertas).
3.  Guarde los cambios.

### Alertas de Stock

Los productos con stock igual o menor al "Stock Mínimo" aparecerán resaltados en rojo o amarillo en la lista y en el reporte de alertas del Dashboard.

## 4. Realizar una Venta (POS)

El módulo de ventas está diseñado para ser rápido y fácil de usar.

1.  **Seleccionar Cliente**: Busque un cliente existente por nombre/DNI o deje en blanco para "Cliente General".
2.  **Agregar Productos**:
    - Busque productos por nombre en la barra de búsqueda.
    - Haga clic en el producto o presione `Enter` para agregarlo al carrito.
    - Ajuste las cantidades directamente en el carrito.
3.  **Tipo de Comprobante**: Seleccione "Boleta" o "Factura".
4.  **Confirmar Venta**:
    - Verifique el total.
    - Haga clic en "Procesar Venta".
    - El sistema descontará el stock automáticamente.
    - Se generará y descargará automáticamente un PDF con el comprobante simulado.

## 5. Gestión de Compras y Abastecimiento

Para reponer stock:

1.  Vaya a "Compras".
2.  Seleccione el proveedor.
3.  Agregue los productos y cantidades a pedir.
4.  Genere la Orden de Compra (Estado: Pendiente).
5.  Cuando llegue la mercadería, busque la orden y haga clic en **"Recibir Mercadería"**.
    - Esto sumará automáticamente las cantidades al stock actual.
    - El precio de compra del producto se actualizará al nuevo precio si este cambió.

## 6. Reportes y Exportación

El sistema permite descargar información en formato Excel para análisis externo.

- **Reporte de Ventas**: Filtre por fechas y descargue un Excel con todas las transacciones detalladas.
- **Reporte de Inventario**: Descargue el stock actual, valorizado y con alertas de reposición.
- **Reporte de Clientes**: Lista de clientes con su historial de consumo.
