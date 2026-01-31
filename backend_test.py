import requests
import sys
import json
from datetime import datetime

class ERPAPITester:
    def __init__(self, base_url="https://stocksmart-93.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.vendedor_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = {
            'productos': [],
            'clientes': [],
            'proveedores': [],
            'ventas': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@svan.com", "password": "admin123"},
            description="Login with admin credentials"
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
        
        # Test vendedor login
        success, response = self.run_test(
            "Vendedor Login",
            "POST",
            "auth/login",
            200,
            data={"email": "vendedor@svan.com", "password": "vendedor123"},
            description="Login with vendedor credentials"
        )
        if success and 'access_token' in response:
            self.vendedor_token = response['access_token']
            print(f"   Vendedor token obtained: {self.vendedor_token[:20]}...")
        
        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrong"},
            description="Should fail with invalid credentials"
        )
        
        # Test /auth/me with admin token
        if self.admin_token:
            self.run_test(
                "Get Admin Profile",
                "GET",
                "auth/me",
                200,
                token=self.admin_token,
                description="Get current user profile"
            )

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD")
        print("="*50)
        
        if not self.admin_token:
            print("❌ Skipping dashboard tests - no admin token")
            return
            
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200,
            token=self.admin_token,
            description="Get dashboard statistics"
        )
        
        if success:
            required_fields = ['ventas_hoy', 'ventas_mes', 'productos_stock_bajo', 'total_productos', 'total_clientes']
            for field in required_fields:
                if field in response:
                    print(f"   ✓ {field}: {response[field]}")
                else:
                    print(f"   ❌ Missing field: {field}")

    def test_productos_crud(self):
        """Test products CRUD operations"""
        print("\n" + "="*50)
        print("TESTING PRODUCTOS CRUD")
        print("="*50)
        
        if not self.admin_token:
            print("❌ Skipping productos tests - no admin token")
            return
        
        # Test get all products
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "productos",
            200,
            token=self.admin_token,
            description="List all products"
        )
        
        # Test create product (admin only)
        product_data = {
            "nombre": "Test Product API",
            "categoria": "Alimento para Animales",
            "precio_compra": 50.0,
            "precio_venta": 75.0,
            "stock": 100,
            "stock_minimo": 10,
            "unidad": "bolsa",
            "descripcion": "Test product created via API"
        }
        
        success, response = self.run_test(
            "Create Product (Admin)",
            "POST",
            "productos",
            200,
            data=product_data,
            token=self.admin_token,
            description="Create new product as admin"
        )
        
        if success and 'id' in response:
            product_id = response['id']
            self.created_items['productos'].append(product_id)
            
            # Test get single product
            self.run_test(
                "Get Single Product",
                "GET",
                f"productos/{product_id}",
                200,
                token=self.admin_token,
                description="Get product by ID"
            )
            
            # Test update product
            update_data = product_data.copy()
            update_data['precio_venta'] = 80.0
            
            self.run_test(
                "Update Product",
                "PUT",
                f"productos/{product_id}",
                200,
                data=update_data,
                token=self.admin_token,
                description="Update product price"
            )
        
        # Test create product as vendedor (should fail)
        self.run_test(
            "Create Product (Vendedor - Should Fail)",
            "POST",
            "productos",
            403,
            data=product_data,
            token=self.vendedor_token,
            description="Vendedor should not be able to create products"
        )

    def test_clientes_crud(self):
        """Test clients CRUD operations"""
        print("\n" + "="*50)
        print("TESTING CLIENTES CRUD")
        print("="*50)
        
        if not self.vendedor_token:
            print("❌ Skipping clientes tests - no vendedor token")
            return
        
        # Test get all clients
        self.run_test(
            "Get All Clients",
            "GET",
            "clientes",
            200,
            token=self.vendedor_token,
            description="List all clients"
        )
        
        # Test create client
        client_data = {
            "tipo": "persona",
            "nombre_razon_social": "Test Client API",
            "documento": "12345678",
            "telefono": "999888777",
            "email": "testclient@test.com",
            "direccion": "Test Address 123"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clientes",
            200,
            data=client_data,
            token=self.vendedor_token,
            description="Create new client"
        )
        
        if success and 'id' in response:
            client_id = response['id']
            self.created_items['clientes'].append(client_id)
            
            # Test get single client
            self.run_test(
                "Get Single Client",
                "GET",
                f"clientes/{client_id}",
                200,
                token=self.vendedor_token,
                description="Get client by ID"
            )
            
            # Test update client
            update_data = client_data.copy()
            update_data['telefono'] = "999777888"
            
            self.run_test(
                "Update Client",
                "PUT",
                f"clientes/{client_id}",
                200,
                data=update_data,
                token=self.vendedor_token,
                description="Update client phone"
            )

    def test_proveedores_crud(self):
        """Test suppliers CRUD operations"""
        print("\n" + "="*50)
        print("TESTING PROVEEDORES CRUD")
        print("="*50)
        
        if not self.admin_token:
            print("❌ Skipping proveedores tests - no admin token")
            return
        
        # Test get all suppliers
        self.run_test(
            "Get All Suppliers",
            "GET",
            "proveedores",
            200,
            token=self.admin_token,
            description="List all suppliers"
        )
        
        # Test create supplier (admin only)
        supplier_data = {
            "razon_social": "Test Supplier API",
            "ruc": "20123456789",
            "telefono": "016543210",
            "email": "testsupplier@test.com",
            "direccion": "Supplier Address 456",
            "contacto": "Test Contact"
        }
        
        success, response = self.run_test(
            "Create Supplier (Admin)",
            "POST",
            "proveedores",
            200,
            data=supplier_data,
            token=self.admin_token,
            description="Create new supplier as admin"
        )
        
        if success and 'id' in response:
            supplier_id = response['id']
            self.created_items['proveedores'].append(supplier_id)
            
            # Test get single supplier
            self.run_test(
                "Get Single Supplier",
                "GET",
                f"proveedores/{supplier_id}",
                200,
                token=self.admin_token,
                description="Get supplier by ID"
            )

    def test_ventas_flow(self):
        """Test sales flow"""
        print("\n" + "="*50)
        print("TESTING VENTAS FLOW")
        print("="*50)
        
        if not self.vendedor_token:
            print("❌ Skipping ventas tests - no vendedor token")
            return
        
        # First get available products
        success, products = self.run_test(
            "Get Products for Sale",
            "GET",
            "productos",
            200,
            token=self.vendedor_token,
            description="Get products to create a sale"
        )
        
        if not success or not products:
            print("❌ No products available for sale test")
            return
        
        # Find a product with stock
        available_product = None
        for product in products:
            if product.get('stock', 0) > 0:
                available_product = product
                break
        
        if not available_product:
            print("❌ No products with stock available")
            return
        
        # Create a sale
        sale_data = {
            "cliente_nombre": "Cliente Test API",
            "cliente_documento": "12345678",
            "items": [
                {
                    "producto_id": available_product['id'],
                    "producto_nombre": available_product['nombre'],
                    "cantidad": 1,
                    "precio_unitario": available_product['precio_venta'],
                    "subtotal": available_product['precio_venta']
                }
            ],
            "tipo_comprobante": "boleta"
        }
        
        success, response = self.run_test(
            "Create Sale",
            "POST",
            "ventas",
            200,
            data=sale_data,
            token=self.vendedor_token,
            description="Create a new sale"
        )
        
        if success and 'id' in response:
            sale_id = response['id']
            self.created_items['ventas'].append(sale_id)
            
            # Test get sale
            self.run_test(
                "Get Sale",
                "GET",
                f"ventas/{sale_id}",
                200,
                token=self.vendedor_token,
                description="Get sale by ID"
            )
            
            # Test get sales list
            self.run_test(
                "Get Sales List",
                "GET",
                "ventas",
                200,
                token=self.vendedor_token,
                description="List all sales"
            )
            
            # Test PDF generation
            self.run_test(
                "Generate Sale PDF",
                "GET",
                f"ventas/{sale_id}/pdf",
                200,
                token=self.vendedor_token,
                description="Generate PDF for sale"
            )

    def test_inventario_operations(self):
        """Test inventory operations"""
        print("\n" + "="*50)
        print("TESTING INVENTARIO OPERATIONS")
        print("="*50)
        
        if not self.admin_token:
            print("❌ Skipping inventario tests - no admin token")
            return
        
        # Test get movements
        self.run_test(
            "Get Inventory Movements",
            "GET",
            "inventario/movimientos",
            200,
            token=self.admin_token,
            description="List inventory movements"
        )
        
        # Get a product for inventory test
        success, products = self.run_test(
            "Get Products for Inventory",
            "GET",
            "productos",
            200,
            token=self.admin_token,
            description="Get products for inventory operations"
        )
        
        if success and products:
            product = products[0]
            
            # Test inventory entry
            entry_data = {
                "producto_id": product['id'],
                "tipo": "entrada",
                "cantidad": 10,
                "observaciones": "Test entry via API"
            }
            
            self.run_test(
                "Register Inventory Entry",
                "POST",
                "inventario/entrada",
                200,
                data=entry_data,
                token=self.admin_token,
                description="Register inventory entry"
            )
            
            # Test inventory exit
            exit_data = {
                "producto_id": product['id'],
                "tipo": "salida",
                "cantidad": 5,
                "observaciones": "Test exit via API"
            }
            
            self.run_test(
                "Register Inventory Exit",
                "POST",
                "inventario/salida",
                200,
                data=exit_data,
                token=self.admin_token,
                description="Register inventory exit"
            )

    def test_reportes_apis(self):
        """Test reports APIs"""
        print("\n" + "="*50)
        print("TESTING REPORTES APIS")
        print("="*50)
        
        if not self.admin_token:
            print("❌ Skipping reportes tests - no admin token")
            return
        
        # Test rentabilidad API
        success, response = self.run_test(
            "Get Rentabilidad Report",
            "GET",
            "reportes/rentabilidad",
            200,
            token=self.admin_token,
            description="Get profitability analysis"
        )
        
        if success:
            required_fields = ['productos', 'resumen']
            for field in required_fields:
                if field in response:
                    print(f"   ✓ {field}: Found")
                    if field == 'resumen':
                        resumen = response[field]
                        print(f"     - Total ingresos: {resumen.get('total_ingresos', 0)}")
                        print(f"     - Total ganancia: {resumen.get('total_ganancia', 0)}")
                        print(f"     - Margen global: {resumen.get('margen_global', 0)}%")
                else:
                    print(f"   ❌ Missing field: {field}")
        
        # Test ventas por categoria API
        success, response = self.run_test(
            "Get Ventas por Categoria",
            "GET",
            "reportes/ventas-por-categoria",
            200,
            token=self.admin_token,
            description="Get sales by category"
        )
        
        if success and isinstance(response, list):
            print(f"   ✓ Found {len(response)} categories")
            for cat in response[:3]:  # Show first 3
                print(f"     - {cat.get('categoria', 'N/A')}: {cat.get('total', 0)}")
        
        # Test ventas por vendedor API
        success, response = self.run_test(
            "Get Ventas por Vendedor",
            "GET",
            "reportes/ventas-por-vendedor",
            200,
            token=self.admin_token,
            description="Get sales by vendor"
        )
        
        if success and isinstance(response, list):
            print(f"   ✓ Found {len(response)} vendors")
            for vend in response[:3]:  # Show first 3
                print(f"     - {vend.get('vendedor', 'N/A')}: {vend.get('total', 0)} ({vend.get('ventas', 0)} ventas)")

    def test_compras_flow(self):
        """Test purchase orders (compras) complete flow"""
        print("\n" + "="*50)
        print("TESTING COMPRAS FLOW")
        print("="*50)
        
        if not self.admin_token:
            print("❌ Skipping compras tests - no admin token")
            return
        
        # Test get compras stats
        success, stats = self.run_test(
            "Get Compras Stats",
            "GET",
            "compras/stats/resumen",
            200,
            token=self.admin_token,
            description="Get purchase statistics"
        )
        
        if success:
            required_fields = ['compras_mes', 'compras_pendientes', 'total_historico']
            for field in required_fields:
                if field in stats:
                    print(f"   ✓ {field}: {stats[field]}")
                else:
                    print(f"   ❌ Missing field: {field}")
        
        # Test get all compras
        success, compras = self.run_test(
            "Get All Compras",
            "GET",
            "compras",
            200,
            token=self.admin_token,
            description="List all purchase orders"
        )
        
        # Test get compras with filter
        success, compras_pendientes = self.run_test(
            "Get Pending Compras",
            "GET",
            "compras?estado=pendiente",
            200,
            token=self.admin_token,
            description="List pending purchase orders"
        )
        
        # Get suppliers and products for creating a purchase order
        success, suppliers = self.run_test(
            "Get Suppliers for Compra",
            "GET",
            "proveedores",
            200,
            token=self.admin_token,
            description="Get suppliers for purchase order"
        )
        
        success, products = self.run_test(
            "Get Products for Compra",
            "GET",
            "productos",
            200,
            token=self.admin_token,
            description="Get products for purchase order"
        )
        
        if not suppliers or not products:
            print("❌ No suppliers or products available for compra test")
            return
        
        # Create a purchase order
        supplier = suppliers[0]
        product = products[0]
        
        compra_data = {
            "proveedor_id": supplier['id'],
            "items": [
                {
                    "producto_id": product['id'],
                    "producto_nombre": product['nombre'],
                    "cantidad": 10,
                    "precio_unitario": 50.0,
                    "subtotal": 500.0
                }
            ],
            "fecha_entrega_estimada": "2024-12-31",
            "observaciones": "Test purchase order via API"
        }
        
        success, response = self.run_test(
            "Create Purchase Order",
            "POST",
            "compras",
            200,
            data=compra_data,
            token=self.admin_token,
            description="Create new purchase order"
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create purchase order")
            return
        
        compra_id = response['id']
        numero_orden = response.get('numero_orden', 'N/A')
        print(f"   ✓ Created purchase order: {numero_orden}")
        
        # Test get single compra
        success, compra_detail = self.run_test(
            "Get Single Compra",
            "GET",
            f"compras/{compra_id}",
            200,
            token=self.admin_token,
            description="Get purchase order by ID"
        )
        
        if success:
            print(f"   ✓ Estado: {compra_detail.get('estado', 'N/A')}")
            print(f"   ✓ Total: {compra_detail.get('total', 0)}")
            print(f"   ✓ Items: {len(compra_detail.get('items', []))}")
        
        # Get product stock before receiving
        success, product_before = self.run_test(
            "Get Product Before Receive",
            "GET",
            f"productos/{product['id']}",
            200,
            token=self.admin_token,
            description="Get product stock before receiving"
        )
        
        stock_before = product_before.get('stock', 0) if success else 0
        print(f"   ✓ Stock before receive: {stock_before}")
        
        # Test receive compra (should update stock automatically)
        success, receive_response = self.run_test(
            "Receive Purchase Order",
            "POST",
            f"compras/{compra_id}/recibir",
            200,
            token=self.admin_token,
            description="Receive purchase order and update stock"
        )
        
        if success:
            print(f"   ✓ {receive_response.get('message', 'Received')}")
            print(f"   ✓ Products updated: {receive_response.get('productos_actualizados', 0)}")
            
            # Verify stock was updated
            success, product_after = self.run_test(
                "Get Product After Receive",
                "GET",
                f"productos/{product['id']}",
                200,
                token=self.admin_token,
                description="Verify stock was updated"
            )
            
            if success:
                stock_after = product_after.get('stock', 0)
                print(f"   ✓ Stock after receive: {stock_after}")
                expected_stock = stock_before + 10  # We added 10 units
                if stock_after == expected_stock:
                    print(f"   ✅ Stock correctly updated (+10 units)")
                else:
                    print(f"   ❌ Stock mismatch. Expected: {expected_stock}, Got: {stock_after}")
            
            # Verify Kardex movement was created
            success, movements = self.run_test(
                "Get Kardex Movements",
                "GET",
                f"inventario/movimientos?producto_id={product['id']}",
                200,
                token=self.admin_token,
                description="Verify Kardex movement was registered"
            )
            
            if success and movements:
                # Find the movement for this purchase
                purchase_movement = None
                for mov in movements:
                    if mov.get('referencia') == compra_id and mov.get('tipo') == 'entrada':
                        purchase_movement = mov
                        break
                
                if purchase_movement:
                    print(f"   ✅ Kardex movement registered:")
                    print(f"     - Tipo: {purchase_movement.get('tipo')}")
                    print(f"     - Cantidad: {purchase_movement.get('cantidad')}")
                    print(f"     - Stock anterior: {purchase_movement.get('stock_anterior')}")
                    print(f"     - Stock nuevo: {purchase_movement.get('stock_nuevo')}")
                else:
                    print(f"   ❌ Kardex movement not found for purchase {compra_id}")
        
        # Test try to receive again (should fail)
        self.run_test(
            "Try Receive Again (Should Fail)",
            "POST",
            f"compras/{compra_id}/recibir",
            400,
            token=self.admin_token,
            description="Should fail - already received"
        )
        
        # Create another purchase order to test cancel
        compra_data_2 = {
            "proveedor_id": supplier['id'],
            "items": [
                {
                    "producto_id": product['id'],
                    "producto_nombre": product['nombre'],
                    "cantidad": 5,
                    "precio_unitario": 45.0,
                    "subtotal": 225.0
                }
            ],
            "observaciones": "Test purchase order for cancel"
        }
        
        success, response_2 = self.run_test(
            "Create Purchase Order for Cancel",
            "POST",
            "compras",
            200,
            data=compra_data_2,
            token=self.admin_token,
            description="Create purchase order to test cancel"
        )
        
        if success and 'id' in response_2:
            compra_id_2 = response_2['id']
            
            # Test cancel compra
            success, cancel_response = self.run_test(
                "Cancel Purchase Order",
                "POST",
                f"compras/{compra_id_2}/cancelar",
                200,
                token=self.admin_token,
                description="Cancel purchase order"
            )
            
            if success:
                print(f"   ✓ {cancel_response.get('message', 'Cancelled')}")
                
                # Verify status changed
                success, cancelled_compra = self.run_test(
                    "Verify Cancelled Status",
                    "GET",
                    f"compras/{compra_id_2}",
                    200,
                    token=self.admin_token,
                    description="Verify order was cancelled"
                )
                
                if success and cancelled_compra.get('estado') == 'cancelada':
                    print(f"   ✅ Order status correctly changed to 'cancelada'")
                else:
                    print(f"   ❌ Order status not updated correctly")
            
            # Test delete cancelled order
            success, delete_response = self.run_test(
                "Delete Cancelled Order",
                "DELETE",
                f"compras/{compra_id_2}",
                200,
                token=self.admin_token,
                description="Delete cancelled purchase order"
            )
            
            if success:
                print(f"   ✓ {delete_response.get('message', 'Deleted')}")
        
        # Test try to delete received order (should fail)
        self.run_test(
            "Try Delete Received Order (Should Fail)",
            "DELETE",
            f"compras/{compra_id}",
            400,
            token=self.admin_token,
            description="Should fail - cannot delete received order"
        )
        
        # Test vendedor access (should fail for create)
        if self.vendedor_token:
            self.run_test(
                "Vendedor Create Compra (Should Fail)",
                "POST",
                "compras",
                403,
                data=compra_data,
                token=self.vendedor_token,
                description="Vendedor should not be able to create purchase orders"
            )

    def test_reportes_excel_exports(self):
        """Test Excel export endpoints"""
        print("\n" + "="*50)
        print("TESTING EXCEL EXPORTS")
        print("="*50)
        
        if not self.admin_token:
            print("❌ Skipping excel export tests - no admin token")
            return
        
        # Test ventas excel export (POST)
        export_data = {
            "fecha_inicio": "2024-01-01",
            "fecha_fin": "2024-12-31",
            "tipo_comprobante": "all"
        }
        
        success, response = self.run_test(
            "Export Ventas Excel",
            "POST",
            "reportes/ventas/excel",
            200,
            data=export_data,
            token=self.admin_token,
            description="Export sales to Excel with filters"
        )
        
        # Test inventario excel export (GET)
        success, response = self.run_test(
            "Export Inventario Excel",
            "GET",
            "reportes/inventario/excel",
            200,
            token=self.admin_token,
            description="Export inventory to Excel"
        )
        
        # Test clientes excel export (GET)
        success, response = self.run_test(
            "Export Clientes Excel",
            "GET",
            "reportes/clientes/excel",
            200,
            token=self.admin_token,
            description="Export clients to Excel"
        )

    def test_seed_endpoint(self):
        """Test seed data endpoint"""
        print("\n" + "="*50)
        print("TESTING SEED ENDPOINT")
        print("="*50)
        
        self.run_test(
            "Seed Data",
            "POST",
            "seed",
            200,
            description="Seed initial data (should say data already exists)"
        )

    def cleanup_created_items(self):
        """Clean up created test items"""
        print("\n" + "="*50)
        print("CLEANUP CREATED ITEMS")
        print("="*50)
        
        if not self.admin_token:
            print("❌ No admin token for cleanup")
            return
        
        # Delete created products
        for product_id in self.created_items['productos']:
            self.run_test(
                f"Delete Product {product_id[:8]}",
                "DELETE",
                f"productos/{product_id}",
                200,
                token=self.admin_token,
                description="Cleanup test product"
            )
        
        # Delete created suppliers
        for supplier_id in self.created_items['proveedores']:
            self.run_test(
                f"Delete Supplier {supplier_id[:8]}",
                "DELETE",
                f"proveedores/{supplier_id}",
                200,
                token=self.admin_token,
                description="Cleanup test supplier"
            )
        
        # Delete created clients (admin only)
        for client_id in self.created_items['clientes']:
            self.run_test(
                f"Delete Client {client_id[:8]}",
                "DELETE",
                f"clientes/{client_id}",
                200,
                token=self.admin_token,
                description="Cleanup test client"
            )

def main():
    print("🚀 Starting Inversiones Svan ERP API Tests")
    print("=" * 60)
    
    tester = ERPAPITester()
    
    try:
        # Run all tests
        tester.test_seed_endpoint()
        tester.test_authentication()
        tester.test_dashboard_stats()
        tester.test_productos_crud()
        tester.test_clientes_crud()
        tester.test_proveedores_crud()
        tester.test_ventas_flow()
        tester.test_inventario_operations()
        tester.test_reportes_apis()
        tester.test_reportes_excel_exports()
        
        # Cleanup
        tester.cleanup_created_items()
        
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL RESULTS")
    print("="*60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())