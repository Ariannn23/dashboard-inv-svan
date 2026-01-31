from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from enum import Enum
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'svan-erp-secret-key-2024-super-secure')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Inversiones Svan ERP API")
api_router = APIRouter(prefix="/api")

# ===================
# ENUMS
# ===================
class UserRole(str, Enum):
    ADMIN = "admin"
    VENDEDOR = "vendedor"

class TipoCliente(str, Enum):
    PERSONA = "persona"
    EMPRESA = "empresa"

class CategoriaProducto(str, Enum):
    ALIMENTO_ANIMALES = "Alimento para Animales"
    ABARROTES = "Abarrotes"

class TipoComprobante(str, Enum):
    BOLETA = "boleta"
    FACTURA = "factura"

class TipoMovimiento(str, Enum):
    ENTRADA = "entrada"
    SALIDA = "salida"

# ===================
# MODELS
# ===================
class UserBase(BaseModel):
    email: EmailStr
    nombre: str
    role: UserRole = UserRole.VENDEDOR

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Producto
class ProductoBase(BaseModel):
    nombre: str
    categoria: CategoriaProducto
    precio_compra: float
    precio_venta: float
    stock: int = 0
    stock_minimo: int = 5
    unidad: str = "unidad"
    proveedor_id: Optional[str] = None
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None

class ProductoCreate(ProductoBase):
    pass

class Producto(ProductoBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Cliente
class ClienteBase(BaseModel):
    tipo: TipoCliente
    nombre_razon_social: str
    documento: str  # DNI o RUC
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class Cliente(ClienteBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Proveedor
class ProveedorBase(BaseModel):
    razon_social: str
    ruc: str
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    contacto: Optional[str] = None

class ProveedorCreate(ProveedorBase):
    pass

class Proveedor(ProveedorBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Venta Items
class VentaItem(BaseModel):
    producto_id: str
    producto_nombre: str
    cantidad: int
    precio_unitario: float
    subtotal: float

class VentaCreate(BaseModel):
    cliente_id: Optional[str] = None
    cliente_nombre: Optional[str] = None
    cliente_documento: Optional[str] = None
    items: List[VentaItem]
    tipo_comprobante: TipoComprobante = TipoComprobante.BOLETA
    observaciones: Optional[str] = None

class Venta(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    cliente_id: Optional[str] = None
    cliente_nombre: Optional[str] = None
    cliente_documento: Optional[str] = None
    items: List[VentaItem]
    subtotal: float
    igv: float
    total: float
    tipo_comprobante: TipoComprobante
    numero_comprobante: str
    vendedor_id: str
    vendedor_nombre: str
    observaciones: Optional[str] = None

# Movimiento Inventario (Kardex)
class MovimientoBase(BaseModel):
    producto_id: str
    producto_nombre: str
    tipo: TipoMovimiento
    cantidad: int
    stock_anterior: int
    stock_nuevo: int
    referencia: Optional[str] = None  # ID de venta o compra
    observaciones: Optional[str] = None

class MovimientoCreate(BaseModel):
    producto_id: str
    tipo: TipoMovimiento
    cantidad: int
    observaciones: Optional[str] = None

class Movimiento(MovimientoBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    usuario_id: str
    usuario_nombre: str

# ===================
# AUTH HELPERS
# ===================
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return user

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    return current_user

# ===================
# AUTH ENDPOINTS
# ===================
@api_router.post("/auth/login", response_model=Token)
async def login(request: LoginRequest):
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user or not verify_password(request.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario desactivado"
        )
    
    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    user_response = {k: v for k, v in user.items() if k != "hashed_password"}
    return {"access_token": access_token, "token_type": "bearer", "user": user_response}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "hashed_password"}

@api_router.post("/auth/register", response_model=dict)
async def register_user(user: UserCreate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user_dict = user.model_dump()
    password = user_dict.pop("password")
    user_obj = User(**user_dict)
    doc = user_obj.model_dump()
    doc["hashed_password"] = get_password_hash(password)
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.users.insert_one(doc)
    return {"message": "Usuario creado exitosamente", "id": doc["id"]}

# ===================
# PRODUCTOS ENDPOINTS
# ===================
@api_router.get("/productos", response_model=List[dict])
async def get_productos(
    categoria: Optional[str] = None,
    search: Optional[str] = None,
    stock_bajo: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if categoria:
        query["categoria"] = categoria
    if search:
        query["nombre"] = {"$regex": search, "$options": "i"}
    if stock_bajo:
        query["$expr"] = {"$lte": ["$stock", "$stock_minimo"]}
    
    productos = await db.productos.find(query, {"_id": 0}).to_list(1000)
    return productos

@api_router.get("/productos/{producto_id}")
async def get_producto(producto_id: str, current_user: dict = Depends(get_current_user)):
    producto = await db.productos.find_one({"id": producto_id}, {"_id": 0})
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@api_router.post("/productos", response_model=dict)
async def create_producto(producto: ProductoCreate, current_user: dict = Depends(require_admin)):
    producto_obj = Producto(**producto.model_dump())
    doc = producto_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.productos.insert_one(doc)
    return {"message": "Producto creado", "id": doc["id"]}

@api_router.put("/productos/{producto_id}")
async def update_producto(producto_id: str, producto: ProductoCreate, current_user: dict = Depends(require_admin)):
    existing = await db.productos.find_one({"id": producto_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    update_data = producto.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.productos.update_one({"id": producto_id}, {"$set": update_data})
    return {"message": "Producto actualizado"}

@api_router.delete("/productos/{producto_id}")
async def delete_producto(producto_id: str, current_user: dict = Depends(require_admin)):
    result = await db.productos.delete_one({"id": producto_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"message": "Producto eliminado"}

# ===================
# CLIENTES ENDPOINTS
# ===================
@api_router.get("/clientes", response_model=List[dict])
async def get_clientes(
    search: Optional[str] = None,
    tipo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if tipo:
        query["tipo"] = tipo
    if search:
        query["$or"] = [
            {"nombre_razon_social": {"$regex": search, "$options": "i"}},
            {"documento": {"$regex": search, "$options": "i"}}
        ]
    clientes = await db.clientes.find(query, {"_id": 0}).to_list(1000)
    return clientes

@api_router.get("/clientes/{cliente_id}")
async def get_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@api_router.post("/clientes", response_model=dict)
async def create_cliente(cliente: ClienteCreate, current_user: dict = Depends(get_current_user)):
    cliente_obj = Cliente(**cliente.model_dump())
    doc = cliente_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.clientes.insert_one(doc)
    return {"message": "Cliente creado", "id": doc["id"]}

@api_router.put("/clientes/{cliente_id}")
async def update_cliente(cliente_id: str, cliente: ClienteCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.clientes.find_one({"id": cliente_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    await db.clientes.update_one({"id": cliente_id}, {"$set": cliente.model_dump()})
    return {"message": "Cliente actualizado"}

@api_router.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: str, current_user: dict = Depends(require_admin)):
    result = await db.clientes.delete_one({"id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"message": "Cliente eliminado"}

# ===================
# PROVEEDORES ENDPOINTS
# ===================
@api_router.get("/proveedores", response_model=List[dict])
async def get_proveedores(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"razon_social": {"$regex": search, "$options": "i"}},
            {"ruc": {"$regex": search, "$options": "i"}}
        ]
    proveedores = await db.proveedores.find(query, {"_id": 0}).to_list(1000)
    return proveedores

@api_router.get("/proveedores/{proveedor_id}")
async def get_proveedor(proveedor_id: str, current_user: dict = Depends(get_current_user)):
    proveedor = await db.proveedores.find_one({"id": proveedor_id}, {"_id": 0})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return proveedor

@api_router.post("/proveedores", response_model=dict)
async def create_proveedor(proveedor: ProveedorCreate, current_user: dict = Depends(require_admin)):
    proveedor_obj = Proveedor(**proveedor.model_dump())
    doc = proveedor_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.proveedores.insert_one(doc)
    return {"message": "Proveedor creado", "id": doc["id"]}

@api_router.put("/proveedores/{proveedor_id}")
async def update_proveedor(proveedor_id: str, proveedor: ProveedorCreate, current_user: dict = Depends(require_admin)):
    existing = await db.proveedores.find_one({"id": proveedor_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    await db.proveedores.update_one({"id": proveedor_id}, {"$set": proveedor.model_dump()})
    return {"message": "Proveedor actualizado"}

@api_router.delete("/proveedores/{proveedor_id}")
async def delete_proveedor(proveedor_id: str, current_user: dict = Depends(require_admin)):
    result = await db.proveedores.delete_one({"id": proveedor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return {"message": "Proveedor eliminado"}

# ===================
# VENTAS ENDPOINTS
# ===================
async def get_next_comprobante_number(tipo: TipoComprobante) -> str:
    prefix = "B" if tipo == TipoComprobante.BOLETA else "F"
    serie = "001"
    
    last_venta = await db.ventas.find_one(
        {"tipo_comprobante": tipo},
        sort=[("numero_comprobante", -1)]
    )
    
    if last_venta:
        last_num = last_venta.get("numero_comprobante", f"{prefix}{serie}-00000000")
        num_part = int(last_num.split("-")[1]) + 1
    else:
        num_part = 1
    
    return f"{prefix}{serie}-{num_part:08d}"

@api_router.post("/ventas", response_model=dict)
async def create_venta(venta: VentaCreate, current_user: dict = Depends(get_current_user)):
    # Validate stock and calculate totals
    subtotal = 0
    items_with_details = []
    
    for item in venta.items:
        producto = await db.productos.find_one({"id": item.producto_id}, {"_id": 0})
        if not producto:
            raise HTTPException(status_code=400, detail=f"Producto {item.producto_id} no encontrado")
        if producto["stock"] < item.cantidad:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuficiente para {producto['nombre']}. Disponible: {producto['stock']}"
            )
        
        item_subtotal = item.cantidad * item.precio_unitario
        subtotal += item_subtotal
        items_with_details.append(VentaItem(
            producto_id=item.producto_id,
            producto_nombre=producto["nombre"],
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=item_subtotal
        ))
    
    igv = round(subtotal * 0.18, 2)
    total = round(subtotal + igv, 2)
    numero_comprobante = await get_next_comprobante_number(venta.tipo_comprobante)
    
    venta_obj = Venta(
        cliente_id=venta.cliente_id,
        cliente_nombre=venta.cliente_nombre,
        cliente_documento=venta.cliente_documento,
        items=[item.model_dump() for item in items_with_details],
        subtotal=subtotal,
        igv=igv,
        total=total,
        tipo_comprobante=venta.tipo_comprobante,
        numero_comprobante=numero_comprobante,
        vendedor_id=current_user["id"],
        vendedor_nombre=current_user["nombre"],
        observaciones=venta.observaciones
    )
    
    doc = venta_obj.model_dump()
    doc["fecha"] = doc["fecha"].isoformat()
    
    # Update stock for each product
    for item in items_with_details:
        producto = await db.productos.find_one({"id": item.producto_id}, {"_id": 0})
        new_stock = producto["stock"] - item.cantidad
        await db.productos.update_one(
            {"id": item.producto_id},
            {"$set": {"stock": new_stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Register movement
        mov = Movimiento(
            producto_id=item.producto_id,
            producto_nombre=item.producto_nombre,
            tipo=TipoMovimiento.SALIDA,
            cantidad=item.cantidad,
            stock_anterior=producto["stock"],
            stock_nuevo=new_stock,
            referencia=doc["id"],
            observaciones=f"Venta {numero_comprobante}",
            usuario_id=current_user["id"],
            usuario_nombre=current_user["nombre"]
        )
        mov_doc = mov.model_dump()
        mov_doc["fecha"] = mov_doc["fecha"].isoformat()
        await db.movimientos.insert_one(mov_doc)
    
    await db.ventas.insert_one(doc)
    return {"message": "Venta registrada", "id": doc["id"], "numero_comprobante": numero_comprobante}

@api_router.get("/ventas", response_model=List[dict])
async def get_ventas(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    tipo_comprobante: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if tipo_comprobante:
        query["tipo_comprobante"] = tipo_comprobante
    if fecha_inicio:
        query["fecha"] = {"$gte": fecha_inicio}
    if fecha_fin:
        if "fecha" in query:
            query["fecha"]["$lte"] = fecha_fin
        else:
            query["fecha"] = {"$lte": fecha_fin}
    
    ventas = await db.ventas.find(query, {"_id": 0}).sort("fecha", -1).to_list(1000)
    return ventas

@api_router.get("/ventas/{venta_id}")
async def get_venta(venta_id: str, current_user: dict = Depends(get_current_user)):
    venta = await db.ventas.find_one({"id": venta_id}, {"_id": 0})
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta

@api_router.get("/ventas/{venta_id}/pdf")
async def get_venta_pdf(venta_id: str, current_user: dict = Depends(get_current_user)):
    venta = await db.ventas.find_one({"id": venta_id}, {"_id": 0})
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=18, spaceAfter=6, textColor=colors.HexColor('#0F766E'))
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748B'))
    
    elements = []
    
    # Header
    elements.append(Paragraph("INVERSIONES SVAN", title_style))
    elements.append(Paragraph("RUC: 20123456789", subtitle_style))
    elements.append(Paragraph("Av. Principal 123, Lima, Perú", subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Comprobante info
    tipo_text = "BOLETA DE VENTA" if venta["tipo_comprobante"] == "boleta" else "FACTURA"
    elements.append(Paragraph(f"<b>{tipo_text}</b>", styles['Heading2']))
    elements.append(Paragraph(f"N° {venta['numero_comprobante']}", styles['Normal']))
    elements.append(Paragraph(f"Fecha: {venta['fecha'][:10]}", styles['Normal']))
    elements.append(Spacer(1, 10))
    
    # Client info
    if venta.get("cliente_nombre"):
        elements.append(Paragraph(f"<b>Cliente:</b> {venta['cliente_nombre']}", styles['Normal']))
    if venta.get("cliente_documento"):
        elements.append(Paragraph(f"<b>Documento:</b> {venta['cliente_documento']}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Items table
    table_data = [['Producto', 'Cant.', 'P. Unit.', 'Subtotal']]
    for item in venta['items']:
        table_data.append([
            item['producto_nombre'],
            str(item['cantidad']),
            f"S/ {item['precio_unitario']:.2f}",
            f"S/ {item['subtotal']:.2f}"
        ])
    
    # Totals
    table_data.append(['', '', 'Subtotal:', f"S/ {venta['subtotal']:.2f}"])
    table_data.append(['', '', 'IGV (18%):', f"S/ {venta['igv']:.2f}"])
    table_data.append(['', '', 'TOTAL:', f"S/ {venta['total']:.2f}"])
    
    table = Table(table_data, colWidths=[3*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F766E')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -4), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -4), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, -3), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -4), 1, colors.HexColor('#E2E8F0')),
        ('LINEABOVE', (2, -3), (-1, -3), 1, colors.HexColor('#0F766E')),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 30))
    
    # Footer
    elements.append(Paragraph("¡Gracias por su compra!", ParagraphStyle('Footer', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor('#0F766E'), alignment=1)))
    elements.append(Paragraph("Este documento es un comprobante simulado para fines internos.", ParagraphStyle('Disclaimer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94A3B8'), alignment=1)))
    
    doc.build(elements)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=comprobante_{venta['numero_comprobante']}.pdf"}
    )

# ===================
# INVENTARIO / KARDEX
# ===================
@api_router.get("/inventario/movimientos", response_model=List[dict])
async def get_movimientos(
    producto_id: Optional[str] = None,
    tipo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if producto_id:
        query["producto_id"] = producto_id
    if tipo:
        query["tipo"] = tipo
    
    movimientos = await db.movimientos.find(query, {"_id": 0}).sort("fecha", -1).to_list(1000)
    return movimientos

@api_router.post("/inventario/entrada", response_model=dict)
async def registrar_entrada(mov: MovimientoCreate, current_user: dict = Depends(require_admin)):
    producto = await db.productos.find_one({"id": mov.producto_id}, {"_id": 0})
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    new_stock = producto["stock"] + mov.cantidad
    await db.productos.update_one(
        {"id": mov.producto_id},
        {"$set": {"stock": new_stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    movimiento = Movimiento(
        producto_id=mov.producto_id,
        producto_nombre=producto["nombre"],
        tipo=TipoMovimiento.ENTRADA,
        cantidad=mov.cantidad,
        stock_anterior=producto["stock"],
        stock_nuevo=new_stock,
        observaciones=mov.observaciones,
        usuario_id=current_user["id"],
        usuario_nombre=current_user["nombre"]
    )
    
    mov_doc = movimiento.model_dump()
    mov_doc["fecha"] = mov_doc["fecha"].isoformat()
    await db.movimientos.insert_one(mov_doc)
    
    return {"message": "Entrada registrada", "nuevo_stock": new_stock}

@api_router.post("/inventario/salida", response_model=dict)
async def registrar_salida(mov: MovimientoCreate, current_user: dict = Depends(require_admin)):
    producto = await db.productos.find_one({"id": mov.producto_id}, {"_id": 0})
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if producto["stock"] < mov.cantidad:
        raise HTTPException(status_code=400, detail="Stock insuficiente")
    
    new_stock = producto["stock"] - mov.cantidad
    await db.productos.update_one(
        {"id": mov.producto_id},
        {"$set": {"stock": new_stock, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    movimiento = Movimiento(
        producto_id=mov.producto_id,
        producto_nombre=producto["nombre"],
        tipo=TipoMovimiento.SALIDA,
        cantidad=mov.cantidad,
        stock_anterior=producto["stock"],
        stock_nuevo=new_stock,
        observaciones=mov.observaciones,
        usuario_id=current_user["id"],
        usuario_nombre=current_user["nombre"]
    )
    
    mov_doc = movimiento.model_dump()
    mov_doc["fecha"] = mov_doc["fecha"].isoformat()
    await db.movimientos.insert_one(mov_doc)
    
    return {"message": "Salida registrada", "nuevo_stock": new_stock}

# ===================
# DASHBOARD
# ===================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    # Ventas del día
    ventas_hoy = await db.ventas.find({"fecha": {"$gte": today.isoformat()}}, {"_id": 0}).to_list(1000)
    total_hoy = sum(v.get("total", 0) for v in ventas_hoy)
    
    # Ventas del mes
    ventas_mes = await db.ventas.find({"fecha": {"$gte": month_start.isoformat()}}, {"_id": 0}).to_list(1000)
    total_mes = sum(v.get("total", 0) for v in ventas_mes)
    
    # Productos con stock bajo
    productos_stock_bajo = await db.productos.count_documents({"$expr": {"$lte": ["$stock", "$stock_minimo"]}})
    
    # Total productos
    total_productos = await db.productos.count_documents({})
    
    # Total clientes
    total_clientes = await db.clientes.count_documents({})
    
    # Valor del inventario
    productos = await db.productos.find({}, {"_id": 0, "stock": 1, "precio_compra": 1}).to_list(1000)
    valor_inventario = sum(p.get("stock", 0) * p.get("precio_compra", 0) for p in productos)
    
    return {
        "ventas_hoy": total_hoy,
        "ventas_hoy_count": len(ventas_hoy),
        "ventas_mes": total_mes,
        "ventas_mes_count": len(ventas_mes),
        "productos_stock_bajo": productos_stock_bajo,
        "total_productos": total_productos,
        "total_clientes": total_clientes,
        "valor_inventario": valor_inventario
    }

@api_router.get("/dashboard/ventas-recientes")
async def get_ventas_recientes(current_user: dict = Depends(get_current_user)):
    ventas = await db.ventas.find({}, {"_id": 0}).sort("fecha", -1).to_list(10)
    return ventas

@api_router.get("/dashboard/productos-top")
async def get_productos_top(current_user: dict = Depends(get_current_user)):
    # Aggregate sales by product
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.producto_id",
            "nombre": {"$first": "$items.producto_nombre"},
            "cantidad_vendida": {"$sum": "$items.cantidad"},
            "total_ventas": {"$sum": "$items.subtotal"}
        }},
        {"$sort": {"cantidad_vendida": -1}},
        {"$limit": 5}
    ]
    top_products = await db.ventas.aggregate(pipeline).to_list(5)
    return top_products

@api_router.get("/dashboard/ventas-por-periodo")
async def get_ventas_por_periodo(dias: int = 7, current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    start_date = today - timedelta(days=dias)
    
    ventas = await db.ventas.find(
        {"fecha": {"$gte": start_date.isoformat()}},
        {"_id": 0, "fecha": 1, "total": 1}
    ).to_list(1000)
    
    # Group by day
    ventas_por_dia = {}
    for v in ventas:
        fecha = v["fecha"][:10]
        if fecha not in ventas_por_dia:
            ventas_por_dia[fecha] = 0
        ventas_por_dia[fecha] += v.get("total", 0)
    
    # Fill missing days
    result = []
    for i in range(dias):
        fecha = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        result.append({"fecha": fecha, "total": ventas_por_dia.get(fecha, 0)})
    
    return result

# ===================
# SEED DATA
# ===================
@api_router.post("/seed")
async def seed_data():
    # Check if data exists
    existing_users = await db.users.count_documents({})
    if existing_users > 0:
        return {"message": "Los datos ya existen"}
    
    # Create admin user
    admin = {
        "id": str(uuid.uuid4()),
        "email": "admin@svan.com",
        "nombre": "Administrador",
        "role": "admin",
        "hashed_password": get_password_hash("admin123"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin)
    
    # Create vendedor user
    vendedor = {
        "id": str(uuid.uuid4()),
        "email": "vendedor@svan.com",
        "nombre": "Vendedor",
        "role": "vendedor",
        "hashed_password": get_password_hash("vendedor123"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(vendedor)
    
    # Create sample products
    productos = [
        {"nombre": "Dog Chow Adulto 15kg", "categoria": "Alimento para Animales", "precio_compra": 85.00, "precio_venta": 115.00, "stock": 25, "stock_minimo": 5, "unidad": "bolsa"},
        {"nombre": "Cat Chow Gatitos 8kg", "categoria": "Alimento para Animales", "precio_compra": 65.00, "precio_venta": 89.00, "stock": 18, "stock_minimo": 5, "unidad": "bolsa"},
        {"nombre": "Ricocan Carne 15kg", "categoria": "Alimento para Animales", "precio_compra": 72.00, "precio_venta": 98.00, "stock": 30, "stock_minimo": 8, "unidad": "bolsa"},
        {"nombre": "Mimaskot Adulto 15kg", "categoria": "Alimento para Animales", "precio_compra": 68.00, "precio_venta": 92.00, "stock": 3, "stock_minimo": 5, "unidad": "bolsa"},
        {"nombre": "Whiskas Atún 1.5kg", "categoria": "Alimento para Animales", "precio_compra": 22.00, "precio_venta": 32.00, "stock": 40, "stock_minimo": 10, "unidad": "bolsa"},
        {"nombre": "Arroz Costeño 5kg", "categoria": "Abarrotes", "precio_compra": 18.50, "precio_venta": 24.00, "stock": 50, "stock_minimo": 15, "unidad": "bolsa"},
        {"nombre": "Aceite Primor 1L", "categoria": "Abarrotes", "precio_compra": 8.50, "precio_venta": 11.50, "stock": 60, "stock_minimo": 20, "unidad": "botella"},
        {"nombre": "Azúcar Rubia 1kg", "categoria": "Abarrotes", "precio_compra": 3.80, "precio_venta": 5.20, "stock": 80, "stock_minimo": 25, "unidad": "bolsa"},
        {"nombre": "Leche Gloria 400g", "categoria": "Abarrotes", "precio_compra": 3.20, "precio_venta": 4.50, "stock": 100, "stock_minimo": 30, "unidad": "lata"},
        {"nombre": "Fideos Don Vittorio 500g", "categoria": "Abarrotes", "precio_compra": 2.80, "precio_venta": 4.00, "stock": 2, "stock_minimo": 20, "unidad": "paquete"},
    ]
    
    for prod in productos:
        prod["id"] = str(uuid.uuid4())
        prod["created_at"] = datetime.now(timezone.utc).isoformat()
        prod["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.productos.insert_one(prod)
    
    # Create sample clients
    clientes = [
        {"tipo": "persona", "nombre_razon_social": "Juan Pérez García", "documento": "12345678", "telefono": "999888777"},
        {"tipo": "empresa", "nombre_razon_social": "Veterinaria San Roque SAC", "documento": "20512345678", "telefono": "014567890", "direccion": "Av. Los Olivos 456"},
    ]
    
    for cliente in clientes:
        cliente["id"] = str(uuid.uuid4())
        cliente["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.clientes.insert_one(cliente)
    
    # Create sample proveedor
    proveedores = [
        {"razon_social": "Distribuidora Purina SAC", "ruc": "20123456789", "telefono": "016543210", "contacto": "Carlos López"},
        {"razon_social": "Alimentos del Norte EIRL", "ruc": "20987654321", "telefono": "016789012", "contacto": "María Gonzales"},
    ]
    
    for prov in proveedores:
        prov["id"] = str(uuid.uuid4())
        prov["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.proveedores.insert_one(prov)
    
    return {"message": "Datos iniciales creados exitosamente"}

# ===================
# ROOT
# ===================
@api_router.get("/")
async def root():
    return {"message": "Inversiones Svan ERP API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
