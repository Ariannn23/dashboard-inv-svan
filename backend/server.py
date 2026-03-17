from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
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
import xlsxwriter
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError("La variable de entorno 'SECRET_KEY' no está configurada. Es obligatoria para la seguridad del sistema.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="ERP API")  # Inversiones Svan ERP API
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

# Compra a Proveedor
class EstadoCompra(str, Enum):
    PENDIENTE = "pendiente"
    RECIBIDA = "recibida"
    CANCELADA = "cancelada"

class CompraItem(BaseModel):
    producto_id: str
    producto_nombre: str
    cantidad: int
    precio_unitario: float
    subtotal: float

class CompraCreate(BaseModel):
    proveedor_id: str
    items: List[CompraItem]
    observaciones: Optional[str] = None
    fecha_entrega_estimada: Optional[str] = None

class Compra(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    proveedor_id: str
    proveedor_nombre: str
    proveedor_ruc: str
    items: List[CompraItem]
    subtotal: float
    igv: float
    total: float
    numero_orden: str
    estado: EstadoCompra = EstadoCompra.PENDIENTE
    fecha_entrega_estimada: Optional[str] = None
    fecha_recepcion: Optional[str] = None
    usuario_id: str
    usuario_nombre: str
    observaciones: Optional[str] = None

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
# COMPRAS A PROVEEDORES
# ===================
async def get_next_sequence(name: str) -> int:
    """Obtiene el siguiente número de una secuencia atómica"""
    result = await db.sequences.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return result["seq"]

async def get_next_orden_number() -> str:
    """Genera número de orden de compra correlativo atómico"""
    num = await get_next_sequence("orden_compra")
    return f"OC-{num:08d}"

@api_router.post("/compras", response_model=dict)
async def create_compra(compra: CompraCreate, current_user: dict = Depends(require_admin)):
    """Crea una nueva orden de compra a proveedor"""
    # Validar proveedor
    proveedor = await db.proveedores.find_one({"id": compra.proveedor_id}, {"_id": 0})
    if not proveedor:
        raise HTTPException(status_code=400, detail="Proveedor no encontrado")
    
    # Calcular totales
    subtotal = 0
    items_with_details = []
    
    for item in compra.items:
        producto = await db.productos.find_one({"id": item.producto_id}, {"_id": 0})
        if not producto:
            raise HTTPException(status_code=400, detail=f"Producto {item.producto_id} no encontrado")
        
        item_subtotal = item.cantidad * item.precio_unitario
        subtotal += item_subtotal
        items_with_details.append(CompraItem(
            producto_id=item.producto_id,
            producto_nombre=producto["nombre"],
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=item_subtotal
        ))
    
    igv = round(subtotal * 0.18, 2)
    total = round(subtotal + igv, 2)
    numero_orden = await get_next_orden_number()
    
    compra_obj = Compra(
        proveedor_id=compra.proveedor_id,
        proveedor_nombre=proveedor["razon_social"],
        proveedor_ruc=proveedor["ruc"],
        items=[item.model_dump() for item in items_with_details],
        subtotal=subtotal,
        igv=igv,
        total=total,
        numero_orden=numero_orden,
        estado=EstadoCompra.PENDIENTE,
        fecha_entrega_estimada=compra.fecha_entrega_estimada,
        usuario_id=current_user["id"],
        usuario_nombre=current_user["nombre"],
        observaciones=compra.observaciones
    )
    
    doc = compra_obj.model_dump()
    doc["fecha"] = doc["fecha"].isoformat()
    
    await db.compras.insert_one(doc)
    return {"message": "Orden de compra creada", "id": doc["id"], "numero_orden": numero_orden}

@api_router.get("/compras", response_model=List[dict])
async def get_compras(
    estado: Optional[str] = None,
    proveedor_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista todas las órdenes de compra"""
    query = {}
    if estado and estado != 'all':
        query["estado"] = estado
    if proveedor_id:
        query["proveedor_id"] = proveedor_id
    
    compras = await db.compras.find(query, {"_id": 0}).sort("fecha", -1).to_list(1000)
    return compras

@api_router.get("/compras/{compra_id}")
async def get_compra(compra_id: str, current_user: dict = Depends(get_current_user)):
    """Obtiene detalle de una orden de compra"""
    compra = await db.compras.find_one({"id": compra_id}, {"_id": 0})
    if not compra:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    return compra

@api_router.post("/compras/{compra_id}/recibir", response_model=dict)
async def recibir_compra(compra_id: str, current_user: dict = Depends(require_admin)):
    """Marca una compra como recibida y actualiza el inventario automáticamente"""
    compra = await db.compras.find_one({"id": compra_id}, {"_id": 0})
    if not compra:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    
    if compra.get("estado") == "recibida":
        raise HTTPException(status_code=400, detail="Esta compra ya fue recibida")
    
    if compra.get("estado") == "cancelada":
        raise HTTPException(status_code=400, detail="No se puede recibir una compra cancelada")
    
    # Actualizar estado de la compra
    fecha_recepcion = datetime.now(timezone.utc).isoformat()
    await db.compras.update_one(
        {"id": compra_id},
        {"$set": {"estado": "recibida", "fecha_recepcion": fecha_recepcion}}
    )
    
    # Actualizar inventario para cada producto (Atómico)
    for item in compra.get("items", []):
        # Actualizar stock, precio y fecha en una sola operación atómica
        producto_previo = await db.productos.find_one_and_update(
            {"id": item["producto_id"]},
            {
                "$inc": {"stock": item["cantidad"]},
                "$set": {
                    "precio_compra": item["precio_unitario"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            return_document=ReturnDocument.BEFORE
        )
        
        if producto_previo:
            stock_anterior = producto_previo["stock"]
            nuevo_stock = stock_anterior + item["cantidad"]
            
            # Registrar movimiento en Kardex
            mov = Movimiento(
                producto_id=item["producto_id"],
                producto_nombre=item["producto_nombre"],
                tipo=TipoMovimiento.ENTRADA,
                cantidad=item["cantidad"],
                stock_anterior=stock_anterior,
                stock_nuevo=nuevo_stock,
                referencia=compra_id,
                observaciones=f"Compra {compra['numero_orden']} - {compra['proveedor_nombre']}",
                usuario_id=current_user["id"],
                usuario_nombre=current_user["nombre"]
            )
            mov_doc = mov.model_dump()
            mov_doc["fecha"] = mov_doc["fecha"].isoformat()
            await db.movimientos.insert_one(mov_doc)
    
    return {
        "message": "Compra recibida y stock actualizado",
        "productos_actualizados": len(compra.get("items", []))
    }

@api_router.post("/compras/{compra_id}/cancelar", response_model=dict)
async def cancelar_compra(compra_id: str, current_user: dict = Depends(require_admin)):
    """Cancela una orden de compra pendiente"""
    compra = await db.compras.find_one({"id": compra_id}, {"_id": 0})
    if not compra:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    
    if compra.get("estado") == "recibida":
        raise HTTPException(status_code=400, detail="No se puede cancelar una compra ya recibida")
    
    await db.compras.update_one(
        {"id": compra_id},
        {"$set": {"estado": "cancelada"}}
    )
    
    return {"message": "Orden de compra cancelada"}

@api_router.delete("/compras/{compra_id}")
async def delete_compra(compra_id: str, current_user: dict = Depends(require_admin)):
    """Elimina una orden de compra (solo si está cancelada o pendiente)"""
    compra = await db.compras.find_one({"id": compra_id}, {"_id": 0})
    if not compra:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    
    if compra.get("estado") == "recibida":
        raise HTTPException(status_code=400, detail="No se puede eliminar una compra recibida")
    
    result = await db.compras.delete_one({"id": compra_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    return {"message": "Orden de compra eliminada"}

@api_router.get("/compras/stats/resumen")
async def get_compras_stats(current_user: dict = Depends(get_current_user)):
    """Obtiene estadísticas de compras"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    
    # Compras del mes (recibidas)
    compras_mes = await db.compras.find(
        {"estado": "recibida", "fecha": {"$gte": month_start.isoformat()}},
        {"_id": 0}
    ).to_list(1000)
    total_mes = sum(c.get("total", 0) for c in compras_mes)
    
    # Compras pendientes
    compras_pendientes = await db.compras.count_documents({"estado": "pendiente"})
    
    # Total histórico
    todas_compras = await db.compras.find({"estado": "recibida"}, {"_id": 0}).to_list(10000)
    total_historico = sum(c.get("total", 0) for c in todas_compras)
    
    return {
        "compras_mes": total_mes,
        "compras_mes_count": len(compras_mes),
        "compras_pendientes": compras_pendientes,
        "total_historico": total_historico
    }

# ===================
# VENTAS ENDPOINTS
# ===================
async def get_next_comprobante_number(tipo: TipoComprobante) -> str:
    """Genera número de comprobante correlativo atómico"""
    prefix = "B" if tipo == TipoComprobante.BOLETA else "F"
    serie = "001"
    key = f"comprobante_{prefix}{serie}"
    num = await get_next_sequence(key)
    return f"{prefix}{serie}-{num:08d}"

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
    
    # Update stock for each product (Atómico)
    for item in items_with_details:
        # Intento de decremento atómico con validación de stock suficiente
        producto_previo = await db.productos.find_one_and_update(
            {"id": item.producto_id, "stock": {"$gte": item.cantidad}},
            {"$inc": {"stock": -item.cantidad}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
            return_document=ReturnDocument.BEFORE
        )

        if not producto_previo:
            # Si retorna None, el producto no existe o no tiene stock suficiente
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuficiente o producto no encontrado: {item.producto_nombre}"
            )
        
        stock_anterior = producto_previo["stock"]
        new_stock = stock_anterior - item.cantidad

        # Register movement
        mov = Movimiento(
            producto_id=item.producto_id,
            producto_nombre=item.producto_nombre,
            tipo=TipoMovimiento.SALIDA,
            cantidad=item.cantidad,
            stock_anterior=stock_anterior,
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
    # elements.append(Paragraph("INVERSIONES SVAN", title_style))
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
# REPORTES Y EXPORTACIÓN EXCEL
# ===================

class ReporteVentasRequest(BaseModel):
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    tipo_comprobante: Optional[str] = None

@api_router.post("/reportes/ventas/excel")
async def exportar_ventas_excel(
    request: ReporteVentasRequest,
    current_user: dict = Depends(get_current_user)
):
    """Exporta reporte de ventas a Excel"""
    query = {}
    if request.tipo_comprobante and request.tipo_comprobante != 'all':
        query["tipo_comprobante"] = request.tipo_comprobante
    if request.fecha_inicio:
        query["fecha"] = {"$gte": request.fecha_inicio}
    if request.fecha_fin:
        if "fecha" in query:
            query["fecha"]["$lte"] = request.fecha_fin + "T23:59:59"
        else:
            query["fecha"] = {"$lte": request.fecha_fin + "T23:59:59"}
    
    ventas = await db.ventas.find(query, {"_id": 0}).sort("fecha", -1).to_list(10000)
    
    buffer = BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {'in_memory': True})
    
    # Formatos
    header_format = workbook.add_format({
        'bold': True, 'bg_color': '#0F766E', 'font_color': 'white',
        'border': 1, 'align': 'center', 'valign': 'vcenter'
    })
    money_format = workbook.add_format({'num_format': 'S/ #,##0.00', 'border': 1})
    date_format = workbook.add_format({'num_format': 'dd/mm/yyyy hh:mm', 'border': 1})
    cell_format = workbook.add_format({'border': 1})
    total_format = workbook.add_format({
        'bold': True, 'bg_color': '#E2E8F0', 'num_format': 'S/ #,##0.00', 'border': 1
    })
    
    # Hoja de Resumen de Ventas
    ws_resumen = workbook.add_worksheet('Resumen Ventas')
    ws_resumen.set_column('A:A', 20)
    ws_resumen.set_column('B:G', 15)
    
    headers = ['N° Comprobante', 'Fecha', 'Cliente', 'Tipo', 'Subtotal', 'IGV', 'Total']
    for col, header in enumerate(headers):
        ws_resumen.write(0, col, header, header_format)
    
    total_ventas = 0
    total_igv = 0
    for row, venta in enumerate(ventas, 1):
        ws_resumen.write(row, 0, venta.get('numero_comprobante', ''), cell_format)
        ws_resumen.write(row, 1, venta.get('fecha', '')[:16].replace('T', ' '), cell_format)
        ws_resumen.write(row, 2, venta.get('cliente_nombre', 'Cliente General'), cell_format)
        ws_resumen.write(row, 3, 'Boleta' if venta.get('tipo_comprobante') == 'boleta' else 'Factura', cell_format)
        ws_resumen.write(row, 4, venta.get('subtotal', 0), money_format)
        ws_resumen.write(row, 5, venta.get('igv', 0), money_format)
        ws_resumen.write(row, 6, venta.get('total', 0), money_format)
        total_ventas += venta.get('total', 0)
        total_igv += venta.get('igv', 0)
    
    # Totales
    last_row = len(ventas) + 1
    ws_resumen.write(last_row, 3, 'TOTALES:', header_format)
    ws_resumen.write(last_row, 4, total_ventas - total_igv, total_format)
    ws_resumen.write(last_row, 5, total_igv, total_format)
    ws_resumen.write(last_row, 6, total_ventas, total_format)
    
    # Hoja de Detalle por Producto
    ws_detalle = workbook.add_worksheet('Detalle Productos')
    ws_detalle.set_column('A:A', 30)
    ws_detalle.set_column('B:E', 15)
    
    headers_det = ['Producto', 'Cantidad Vendida', 'Precio Promedio', 'Total Ventas']
    for col, header in enumerate(headers_det):
        ws_detalle.write(0, col, header, header_format)
    
    # Agregar productos de todas las ventas
    productos_vendidos = defaultdict(lambda: {'cantidad': 0, 'total': 0, 'precios': []})
    for venta in ventas:
        for item in venta.get('items', []):
            prod_id = item.get('producto_nombre', 'Sin nombre')
            productos_vendidos[prod_id]['cantidad'] += item.get('cantidad', 0)
            productos_vendidos[prod_id]['total'] += item.get('subtotal', 0)
            productos_vendidos[prod_id]['precios'].append(item.get('precio_unitario', 0))
    
    for row, (nombre, data) in enumerate(sorted(productos_vendidos.items(), key=lambda x: x[1]['total'], reverse=True), 1):
        precio_prom = sum(data['precios']) / len(data['precios']) if data['precios'] else 0
        ws_detalle.write(row, 0, nombre, cell_format)
        ws_detalle.write(row, 1, data['cantidad'], cell_format)
        ws_detalle.write(row, 2, precio_prom, money_format)
        ws_detalle.write(row, 3, data['total'], money_format)
    
    workbook.close()
    buffer.seek(0)
    
    fecha_reporte = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=reporte_ventas_{fecha_reporte}.xlsx"}
    )

@api_router.get("/reportes/inventario/excel")
async def exportar_inventario_excel(current_user: dict = Depends(get_current_user)):
    """Exporta inventario completo a Excel"""
    productos = await db.productos.find({}, {"_id": 0}).to_list(10000)
    movimientos = await db.movimientos.find({}, {"_id": 0}).sort("fecha", -1).to_list(10000)
    
    buffer = BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {'in_memory': True})
    
    # Formatos
    header_format = workbook.add_format({
        'bold': True, 'bg_color': '#0F766E', 'font_color': 'white',
        'border': 1, 'align': 'center', 'valign': 'vcenter'
    })
    money_format = workbook.add_format({'num_format': 'S/ #,##0.00', 'border': 1})
    cell_format = workbook.add_format({'border': 1})
    warning_format = workbook.add_format({'border': 1, 'bg_color': '#FEF3C7'})
    danger_format = workbook.add_format({'border': 1, 'bg_color': '#FEE2E2'})
    total_format = workbook.add_format({
        'bold': True, 'bg_color': '#E2E8F0', 'num_format': 'S/ #,##0.00', 'border': 1
    })
    
    # Hoja de Inventario
    ws_inv = workbook.add_worksheet('Inventario Actual')
    ws_inv.set_column('A:A', 30)
    ws_inv.set_column('B:H', 15)
    
    headers = ['Producto', 'Categoría', 'Stock', 'Stock Mín', 'Unidad', 'P. Compra', 'P. Venta', 'Valor Stock']
    for col, header in enumerate(headers):
        ws_inv.write(0, col, header, header_format)
    
    valor_total = 0
    for row, prod in enumerate(productos, 1):
        stock = prod.get('stock', 0)
        stock_min = prod.get('stock_minimo', 0)
        valor = stock * prod.get('precio_compra', 0)
        valor_total += valor
        
        # Determinar formato según stock
        fmt = cell_format
        if stock == 0:
            fmt = danger_format
        elif stock <= stock_min:
            fmt = warning_format
        
        ws_inv.write(row, 0, prod.get('nombre', ''), fmt)
        ws_inv.write(row, 1, prod.get('categoria', ''), fmt)
        ws_inv.write(row, 2, stock, fmt)
        ws_inv.write(row, 3, stock_min, fmt)
        ws_inv.write(row, 4, prod.get('unidad', ''), fmt)
        ws_inv.write(row, 5, prod.get('precio_compra', 0), money_format)
        ws_inv.write(row, 6, prod.get('precio_venta', 0), money_format)
        ws_inv.write(row, 7, valor, money_format)
    
    # Total
    last_row = len(productos) + 1
    ws_inv.write(last_row, 6, 'VALOR TOTAL:', header_format)
    ws_inv.write(last_row, 7, valor_total, total_format)
    
    # Hoja de Kardex / Movimientos
    ws_kardex = workbook.add_worksheet('Kardex Movimientos')
    ws_kardex.set_column('A:A', 20)
    ws_kardex.set_column('B:B', 30)
    ws_kardex.set_column('C:G', 15)
    
    headers_k = ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Stock Ant.', 'Stock Nuevo', 'Usuario']
    for col, header in enumerate(headers_k):
        ws_kardex.write(0, col, header, header_format)
    
    entrada_format = workbook.add_format({'border': 1, 'bg_color': '#D1FAE5'})
    salida_format = workbook.add_format({'border': 1, 'bg_color': '#FEF3C7'})
    
    for row, mov in enumerate(movimientos, 1):
        fmt = entrada_format if mov.get('tipo') == 'entrada' else salida_format
        ws_kardex.write(row, 0, mov.get('fecha', '')[:16].replace('T', ' '), fmt)
        ws_kardex.write(row, 1, mov.get('producto_nombre', ''), fmt)
        ws_kardex.write(row, 2, 'Entrada' if mov.get('tipo') == 'entrada' else 'Salida', fmt)
        ws_kardex.write(row, 3, mov.get('cantidad', 0), fmt)
        ws_kardex.write(row, 4, mov.get('stock_anterior', 0), fmt)
        ws_kardex.write(row, 5, mov.get('stock_nuevo', 0), fmt)
        ws_kardex.write(row, 6, mov.get('usuario_nombre', ''), fmt)
    
    # Hoja de Stock Bajo
    ws_bajo = workbook.add_worksheet('Stock Bajo - Alertas')
    ws_bajo.set_column('A:A', 30)
    ws_bajo.set_column('B:E', 15)
    
    headers_b = ['Producto', 'Stock Actual', 'Stock Mínimo', 'Faltan', 'Estado']
    for col, header in enumerate(headers_b):
        ws_bajo.write(0, col, header, header_format)
    
    row = 1
    for prod in productos:
        stock = prod.get('stock', 0)
        stock_min = prod.get('stock_minimo', 0)
        if stock <= stock_min:
            faltan = stock_min - stock
            estado = 'AGOTADO' if stock == 0 else 'BAJO'
            fmt = danger_format if stock == 0 else warning_format
            ws_bajo.write(row, 0, prod.get('nombre', ''), fmt)
            ws_bajo.write(row, 1, stock, fmt)
            ws_bajo.write(row, 2, stock_min, fmt)
            ws_bajo.write(row, 3, faltan, fmt)
            ws_bajo.write(row, 4, estado, fmt)
            row += 1
    
    workbook.close()
    buffer.seek(0)
    
    fecha_reporte = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=reporte_inventario_{fecha_reporte}.xlsx"}
    )

@api_router.get("/reportes/clientes/excel")
async def exportar_clientes_excel(current_user: dict = Depends(get_current_user)):
    """Exporta clientes con historial de compras a Excel"""
    clientes = await db.clientes.find({}, {"_id": 0}).to_list(10000)
    ventas = await db.ventas.find({}, {"_id": 0}).to_list(10000)
    
    # Calcular totales por cliente
    ventas_por_cliente = defaultdict(lambda: {'count': 0, 'total': 0})
    for venta in ventas:
        cliente_id = venta.get('cliente_id')
        if cliente_id:
            ventas_por_cliente[cliente_id]['count'] += 1
            ventas_por_cliente[cliente_id]['total'] += venta.get('total', 0)
    
    buffer = BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {'in_memory': True})
    
    header_format = workbook.add_format({
        'bold': True, 'bg_color': '#0F766E', 'font_color': 'white',
        'border': 1, 'align': 'center'
    })
    money_format = workbook.add_format({'num_format': 'S/ #,##0.00', 'border': 1})
    cell_format = workbook.add_format({'border': 1})
    
    ws = workbook.add_worksheet('Clientes')
    ws.set_column('A:A', 30)
    ws.set_column('B:G', 18)
    
    headers = ['Cliente', 'Tipo', 'Documento', 'Teléfono', 'Email', 'N° Compras', 'Total Compras']
    for col, header in enumerate(headers):
        ws.write(0, col, header, header_format)
    
    for row, cliente in enumerate(clientes, 1):
        cliente_id = cliente.get('id')
        stats = ventas_por_cliente.get(cliente_id, {'count': 0, 'total': 0})
        
        ws.write(row, 0, cliente.get('nombre_razon_social', ''), cell_format)
        ws.write(row, 1, 'Persona' if cliente.get('tipo') == 'persona' else 'Empresa', cell_format)
        ws.write(row, 2, cliente.get('documento', ''), cell_format)
        ws.write(row, 3, cliente.get('telefono', ''), cell_format)
        ws.write(row, 4, cliente.get('email', ''), cell_format)
        ws.write(row, 5, stats['count'], cell_format)
        ws.write(row, 6, stats['total'], money_format)
    
    workbook.close()
    buffer.seek(0)
    
    fecha_reporte = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=reporte_clientes_{fecha_reporte}.xlsx"}
    )

@api_router.get("/reportes/rentabilidad")
async def get_reporte_rentabilidad(current_user: dict = Depends(get_current_user)):
    """Obtiene análisis de rentabilidad por producto"""
    productos = await db.productos.find({}, {"_id": 0}).to_list(10000)
    ventas = await db.ventas.find({}, {"_id": 0}).to_list(10000)
    
    # Calcular ventas por producto
    ventas_por_producto = defaultdict(lambda: {'cantidad': 0, 'ingresos': 0})
    for venta in ventas:
        for item in venta.get('items', []):
            prod_id = item.get('producto_id')
            ventas_por_producto[prod_id]['cantidad'] += item.get('cantidad', 0)
            ventas_por_producto[prod_id]['ingresos'] += item.get('subtotal', 0)
    
    resultado = []
    for prod in productos:
        prod_id = prod.get('id')
        ventas_data = ventas_por_producto.get(prod_id, {'cantidad': 0, 'ingresos': 0})
        
        precio_compra = prod.get('precio_compra', 0)
        precio_venta = prod.get('precio_venta', 0)
        margen = precio_venta - precio_compra
        margen_porcentaje = (margen / precio_compra * 100) if precio_compra > 0 else 0
        ganancia_total = margen * ventas_data['cantidad']
        
        resultado.append({
            'id': prod_id,
            'nombre': prod.get('nombre', ''),
            'categoria': prod.get('categoria', ''),
            'precio_compra': precio_compra,
            'precio_venta': precio_venta,
            'margen': margen,
            'margen_porcentaje': round(margen_porcentaje, 1),
            'cantidad_vendida': ventas_data['cantidad'],
            'ingresos': ventas_data['ingresos'],
            'ganancia_total': ganancia_total,
            'stock': prod.get('stock', 0)
        })
    
    # Ordenar por ganancia total
    resultado.sort(key=lambda x: x['ganancia_total'], reverse=True)
    
    # Calcular totales
    total_ingresos = sum(r['ingresos'] for r in resultado)
    total_ganancia = sum(r['ganancia_total'] for r in resultado)
    total_costo = total_ingresos - total_ganancia
    margen_global = (total_ganancia / total_costo * 100) if total_costo > 0 else 0
    
    return {
        'productos': resultado,
        'resumen': {
            'total_ingresos': round(total_ingresos, 2),
            'total_costo': round(total_costo, 2),
            'total_ganancia': round(total_ganancia, 2),
            'margen_global': round(margen_global, 1)
        }
    }

@api_router.get("/reportes/ventas-por-categoria")
async def get_ventas_por_categoria(current_user: dict = Depends(get_current_user)):
    """Obtiene ventas agrupadas por categoría"""
    ventas = await db.ventas.find({}, {"_id": 0}).to_list(10000)
    productos = await db.productos.find({}, {"_id": 0}).to_list(10000)
    
    # Map productos a categorías
    prod_categoria = {p.get('id'): p.get('categoria', 'Sin categoría') for p in productos}
    
    categorias = defaultdict(lambda: {'cantidad': 0, 'total': 0})
    for venta in ventas:
        for item in venta.get('items', []):
            prod_id = item.get('producto_id')
            categoria = prod_categoria.get(prod_id, 'Sin categoría')
            categorias[categoria]['cantidad'] += item.get('cantidad', 0)
            categorias[categoria]['total'] += item.get('subtotal', 0)
    
    resultado = [
        {'categoria': cat, 'cantidad': data['cantidad'], 'total': round(data['total'], 2)}
        for cat, data in categorias.items()
    ]
    resultado.sort(key=lambda x: x['total'], reverse=True)
    
    return resultado

@api_router.get("/reportes/ventas-por-vendedor")
async def get_ventas_por_vendedor(current_user: dict = Depends(get_current_user)):
    """Obtiene ventas agrupadas por vendedor"""
    ventas = await db.ventas.find({}, {"_id": 0}).to_list(10000)
    
    vendedores = defaultdict(lambda: {'count': 0, 'total': 0})
    for venta in ventas:
        vendedor = venta.get('vendedor_nombre', 'Desconocido')
        vendedores[vendedor]['count'] += 1
        vendedores[vendedor]['total'] += venta.get('total', 0)
    
    resultado = [
        {'vendedor': v, 'ventas': data['count'], 'total': round(data['total'], 2)}
        for v, data in vendedores.items()
    ]
    resultado.sort(key=lambda x: x['total'], reverse=True)
    
    return resultado

# ===================
# SEED DATA
# ===================
@api_router.post("/seed")
async def seed_data():
    if os.environ.get("ENVIRONMENT") != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida en este entorno. Solo disponible en 'development'."
        )
    # Only create users if they don't exist
    existing_users = await db.users.count_documents({})
    if existing_users == 0:
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
        # PET FOOD
        {"nombre": "Dog Chow Adulto 15kg", "categoria": "Alimento para Animales", "precio_compra": 85.00, "precio_venta": 115.00, "stock": 25, "stock_minimo": 5, "unidad": "bolsa"},
        {"nombre": "Cat Chow Gatitos 8kg", "categoria": "Alimento para Animales", "precio_compra": 65.00, "precio_venta": 89.00, "stock": 18, "stock_minimo": 5, "unidad": "bolsa"},
        {"nombre": "Ricocan Carne 15kg", "categoria": "Alimento para Animales", "precio_compra": 72.00, "precio_venta": 98.00, "stock": 30, "stock_minimo": 8, "unidad": "bolsa"},
        {"nombre": "Mimaskot Adulto 15kg", "categoria": "Alimento para Animales", "precio_compra": 68.00, "precio_venta": 92.00, "stock": 3, "stock_minimo": 5, "unidad": "bolsa"},
        {"nombre": "Whiskas Atún 1.5kg", "categoria": "Alimento para Animales", "precio_compra": 22.00, "precio_venta": 32.00, "stock": 40, "stock_minimo": 10, "unidad": "bolsa"},
        {"nombre": "Pro Plan Adulto 3kg", "categoria": "Alimento para Animales", "precio_compra": 45.00, "precio_venta": 65.00, "stock": 12, "stock_minimo": 3, "unidad": "bolsa"},
        {"nombre": "Hills Science Diet 2kg", "categoria": "Alimento para Animales", "precio_compra": 55.00, "precio_venta": 78.00, "stock": 8, "stock_minimo": 2, "unidad": "bolsa"},
        {"nombre": "Pedigree Cachorro 10kg", "categoria": "Alimento para Animales", "precio_compra": 60.00, "precio_venta": 82.00, "stock": 15, "stock_minimo": 5, "unidad": "bolsa"},
        {"nombre": "Cambo Adulto Cordero 15kg", "categoria": "Alimento para Animales", "precio_compra": 90.00, "precio_venta": 125.00, "stock": 10, "stock_minimo": 3, "unidad": "bolsa"},
        {"nombre": "Ricocat Pescado 9kg", "categoria": "Alimento para Animales", "precio_compra": 58.00, "precio_venta": 79.00, "stock": 20, "stock_minimo": 5, "unidad": "bolsa"},
        # ABARROTES
        {"nombre": "Arroz Costeño 5kg", "categoria": "Abarrotes", "precio_compra": 18.50, "precio_venta": 24.00, "stock": 50, "stock_minimo": 15, "unidad": "bolsa"},
        {"nombre": "Aceite Primor 1L", "categoria": "Abarrotes", "precio_compra": 8.50, "precio_venta": 11.50, "stock": 60, "stock_minimo": 20, "unidad": "botella"},
        {"nombre": "Azúcar Rubia 1kg", "categoria": "Abarrotes", "precio_compra": 3.80, "precio_venta": 5.20, "stock": 80, "stock_minimo": 25, "unidad": "bolsa"},
        {"nombre": "Leche Gloria 400g", "categoria": "Abarrotes", "precio_compra": 3.20, "precio_venta": 4.50, "stock": 100, "stock_minimo": 30, "unidad": "lata"},
        {"nombre": "Fideos Don Vittorio 500g", "categoria": "Abarrotes", "precio_compra": 2.80, "precio_venta": 4.00, "stock": 45, "stock_minimo": 20, "unidad": "paquete"},
        {"nombre": "Atún Florida Trozos", "categoria": "Abarrotes", "precio_compra": 4.50, "precio_venta": 6.50, "stock": 70, "stock_minimo": 15, "unidad": "lata"},
        {"nombre": "Menestra Lentejas 500g", "categoria": "Abarrotes", "precio_compra": 3.50, "precio_venta": 5.00, "stock": 35, "stock_minimo": 10, "unidad": "bolsa"},
        {"nombre": "Avena 3 Ositos 300g", "categoria": "Abarrotes", "precio_compra": 2.20, "precio_venta": 3.50, "stock": 40, "stock_minimo": 10, "unidad": "bolsa"},
        {"nombre": "Chocolate Sol del Cusco", "categoria": "Abarrotes", "precio_compra": 1.50, "precio_venta": 2.50, "stock": 90, "stock_minimo": 20, "unidad": "barra"},
        {"nombre": "Mermelada Gloria 300g", "categoria": "Abarrotes", "precio_compra": 4.20, "precio_venta": 6.00, "stock": 25, "stock_minimo": 5, "unidad": "frasco"},
        # LIMPIEZA
        {"nombre": "Detergente Ariel 1kg", "categoria": "Abarrotes", "precio_compra": 12.00, "precio_venta": 16.50, "stock": 30, "stock_minimo": 8, "unidad": "bolsa"},
        {"nombre": "Lejía Clorox 1L", "categoria": "Abarrotes", "precio_compra": 3.50, "precio_venta": 5.00, "stock": 40, "stock_minimo": 10, "unidad": "botella"},
        {"nombre": "Jabón Bolivar Barra", "categoria": "Abarrotes", "precio_compra": 2.50, "precio_venta": 3.80, "stock": 60, "stock_minimo": 15, "unidad": "barra"},
        {"nombre": "Ayudín Pasta 400g", "categoria": "Abarrotes", "precio_compra": 3.20, "precio_venta": 4.80, "stock": 35, "stock_minimo": 10, "unidad": "pote"},
        {"nombre": "Suavizante Downy 1L", "categoria": "Abarrotes", "precio_compra": 9.00, "precio_venta": 13.50, "stock": 15, "stock_minimo": 5, "unidad": "botella"},
    ]
    
    products_added = 0
    for prod in productos:
        exists = await db.productos.find_one({"nombre": prod["nombre"]})
        if not exists:
            prod["id"] = str(uuid.uuid4())
            prod["created_at"] = datetime.now(timezone.utc).isoformat()
            prod["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.productos.insert_one(prod)
            products_added += 1
    
    # Create sample clients
    clientes = [
        {"tipo": "persona", "nombre_razon_social": "Juan Pérez García", "documento": "12345678", "telefono": "999888777", "direccion": "Av. Lima 123"},
        {"tipo": "empresa", "nombre_razon_social": "Veterinaria San Roque SAC", "documento": "20512345678", "telefono": "014567890", "direccion": "Av. Los Olivos 456"},
        {"tipo": "persona", "nombre_razon_social": "María Rodríguez López", "documento": "87654321", "telefono": "987654321", "direccion": "Jr. Puno 789"},
        {"tipo": "empresa", "nombre_razon_social": "Bodega El Tío Juan", "documento": "20601234567", "telefono": "012345678", "direccion": "Calle Real 101"},
        {"tipo": "persona", "nombre_razon_social": "Carlos Sánchez Vega", "documento": "11223344", "telefono": "911223344", "direccion": "Av. Arequipa 555"},
        {"tipo": "empresa", "nombre_razon_social": "Restaurante Sabor Peruano", "documento": "20556677889", "telefono": "013334444", "direccion": "Av. Brasil 2020"},
        {"tipo": "persona", "nombre_razon_social": "Ana Torres Díaz", "documento": "44332211", "telefono": "944332211", "direccion": "Jr. Cusco 321"},
        {"tipo": "empresa", "nombre_razon_social": "Farmacia Salud Total", "documento": "20445566771", "telefono": "015556666", "direccion": "Av. Tacna 888"},
        {"tipo": "persona", "nombre_razon_social": "Luis Mendoza Ruiz", "documento": "55667788", "telefono": "955667788", "direccion": "Calle La Paz 100"},
        {"tipo": "empresa", "nombre_razon_social": "Librería El Estudiante", "documento": "20334455662", "telefono": "016667777", "direccion": "Av. Universitaria 1500"},
        {"tipo": "persona", "nombre_razon_social": "Carmen Silva Flores", "documento": "66778899", "telefono": "966778899", "direccion": "Jr. Unión 450"},
        {"tipo": "empresa", "nombre_razon_social": "Transportes Rápidos SAC", "documento": "20112233445", "telefono": "017778888", "direccion": "Av. Argentina 3000"},
        {"tipo": "persona", "nombre_razon_social": "Jorge Castillo Ramos", "documento": "77889900", "telefono": "977889900", "direccion": "Av. Salaverry 1200"},
        {"tipo": "empresa", "nombre_razon_social": "Minimarket Los Amigos", "documento": "20889900113", "telefono": "018889999", "direccion": "Calle Los Pinos 234"},
        {"tipo": "persona", "nombre_razon_social": "Elena Quispe Mamani", "documento": "88990011", "telefono": "988990011", "direccion": "Av. Venezuela 900"},
        {"tipo": "empresa", "nombre_razon_social": "Panadería El Trigal", "documento": "20990011224", "telefono": "019990000", "direccion": "Jr. Huallaga 567"},
        {"tipo": "persona", "nombre_razon_social": "Miguel Angel Romero", "documento": "99001122", "telefono": "999001122", "direccion": "Av. Abancay 400"},
        {"tipo": "empresa", "nombre_razon_social": "Ferretería El Martillo", "documento": "20101112135", "telefono": "012223333", "direccion": "Av. Colonial 2500"},
        {"tipo": "persona", "nombre_razon_social": "Rosa Medina Torres", "documento": "00112233", "telefono": "900112233", "direccion": "Jr. Ica 123"},
        {"tipo": "empresa", "nombre_razon_social": "Grifo El Volante", "documento": "20212223246", "telefono": "014445555", "direccion": "Panamericana Norte Km 25"},
    ]
    
    clients_added = 0
    for cliente in clientes:
        exists = await db.clientes.find_one({"documento": cliente["documento"]})
        if not exists:
            cliente["id"] = str(uuid.uuid4())
            cliente["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.clientes.insert_one(cliente)
            clients_added += 1
    
    # Create sample proveedor
    proveedores = [
        {"razon_social": "Distribuidora Purina SAC", "ruc": "20123456789", "telefono": "016543210", "contacto": "Carlos López", "direccion": "Av. Industrial 123", "email": "ventas@purina.com"},
        {"razon_social": "Alimentos del Norte EIRL", "ruc": "20987654321", "telefono": "016789012", "contacto": "María Gonzales", "direccion": "Calle Fabril 456", "email": "contacto@alnorte.com"},
        {"razon_social": "Alicorp SAA", "ruc": "20100055237", "telefono": "013150800", "contacto": "Ventas Corporativas", "direccion": "Av. Argentina 4793", "email": "ventas@alicorp.com.pe"},
        {"razon_social": "Gloria SA", "ruc": "20100190797", "telefono": "014707170", "contacto": "Distribución Lima", "direccion": "Av. República de Panamá 2461", "email": "pedidos@gloria.com.pe"},
        {"razon_social": "Procter & Gamble Perú", "ruc": "20100127165", "telefono": "012135000", "contacto": "Ejecutivo de Cuentas", "direccion": "Av. Materiales 2805", "email": "ventas@pg.com"},
        {"razon_social": "Unilever Andina", "ruc": "20100006295", "telefono": "014118300", "contacto": "Gerente Comercial", "direccion": "Av. Paseo de la República 5895", "email": "contacto.peru@unilever.com"},
        {"razon_social": "Nestlé Perú", "ruc": "20263322496", "telefono": "012133333", "contacto": "Centro de Distribución", "direccion": "Calle Los Frutales 451", "email": "servicios@nestle.com.pe"},
        {"razon_social": "Kimberly-Clark Perú", "ruc": "20100152941", "telefono": "016184000", "contacto": "Departamento de Ventas", "direccion": "Av. Paseo de la República 3755", "email": "ventas@kcc.com"},
        {"razon_social": "Molitalia SA", "ruc": "20100035121", "telefono": "015136262", "contacto": "Pedidos Mayoristas", "direccion": "Av. Venezuela 2850", "email": "pedidos@molitalia.com"},
        {"razon_social": "Backus y Johnston", "ruc": "20100113610", "telefono": "013113000", "contacto": "Canal Tradicional", "direccion": "Av. Nicolás Ayllón 3986", "email": "atencion@backus.com.pe"},
        {"razon_social": "San Fernando SA", "ruc": "20100154308", "telefono": "012135300", "contacto": "Ventas Pollo/Cerdo", "direccion": "Av. República de Panamá 4295", "email": "ventas@san-fernando.com.pe"},
        {"razon_social": "Laive SA", "ruc": "20100095450", "telefono": "016187600", "contacto": "Distribución Lácteos", "direccion": "Av. Nicolás de Piérola 601", "email": "pedidos@laive.com.pe"},
        {"razon_social": "Costeño Alimentos SAC", "ruc": "20251648906", "telefono": "016164200", "contacto": "Ventas Arroz/Menestras", "direccion": "Av. Santa Anita 240", "email": "ventas@costeno.com.pe"},
        {"razon_social": "Colgate-Palmolive Perú", "ruc": "20100030595", "telefono": "014115000", "contacto": "Cuidado Personal", "direccion": "Av. Rivera Navarrete 501", "email": "contacto@colgate.com"},
        {"razon_social": "Clorox Perú SA", "ruc": "20336208641", "telefono": "016144600", "contacto": "Limpieza Hogar", "direccion": "Av. Néstor Gambetta 6555", "email": "ventas@clorox.com"},
        {"razon_social": "Coca-Cola Servicios Perú", "ruc": "20415932376", "telefono": "080014400", "contacto": "Preventa", "direccion": "Av. República de Panamá 4050", "email": "pedidos@coca-cola.com"},
        {"razon_social": "PepsiCo Alimentos Perú", "ruc": "20502758117", "telefono": "013170400", "contacto": "Snacks y Bebidas", "direccion": "Av. Francisco Bolognesi 401", "email": "ventas@pepsico.com"},
        {"razon_social": "Intradevco Industrial", "ruc": "20100030919", "telefono": "012151000", "contacto": "Sapolio/Aval", "direccion": "Av. Producción Nacional 188", "email": "ventas@intradevco.com"},
        {"razon_social": "Softys Perú", "ruc": "20100132592", "telefono": "013192300", "contacto": "Papel y Pañales", "direccion": "Av. Elmer Faucett 3260", "email": "contacto@softys.com"},
        {"razon_social": "Mondelez Perú SA", "ruc": "20100049938", "telefono": "016113000", "contacto": "Galletas y Dulces", "direccion": "Av. Venezuela 2470", "email": "ventas@mondelez.com"},
    ]
    
    providers_added = 0
    for prov in proveedores:
        exists = await db.proveedores.find_one({"ruc": prov["ruc"]})
        if not exists:
            prov["id"] = str(uuid.uuid4())
            prov["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.proveedores.insert_one(prov)
            providers_added += 1
    
    return {
        "message": f"Datos inyectados exitosamente. Productos: {products_added}, Clientes: {clients_added}, Proveedores: {providers_added}"
    }

# ===================
# ROOT
# ===================
@api_router.get("/")
async def root():
    return {"message": "ERP API", "version": "1.0.0"}  # Inversiones Svan ERP API

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

async def init_sequences():
    """Inicializa los contadores de secuencias si no existen"""
    sequences = [
        {"_id": "orden_compra", "seq": 0},
        {"_id": "comprobante_B001", "seq": 0},
        {"_id": "comprobante_F001", "seq": 0}
    ]
    for seq in sequences:
        await db.sequences.update_one(
            {"_id": seq["_id"]},
            {"$setOnInsert": {"seq": seq["seq"]}},
            upsert=True
        )

async def create_indexes():
    """Crea índices en las colecciones de MongoDB para optimizar búsquedas"""
    try:
        # Users
        await db.users.create_index("email", unique=True, background=True)
        
        # Productos
        await db.productos.create_index([("nombre", "text")], background=True)
        await db.productos.create_index("categoria", background=True)
        await db.productos.create_index("stock", background=True)
        
        # Clientes
        await db.clientes.create_index("documento", unique=True, background=True)
        await db.clientes.create_index("nombre_razon_social", background=True)
        
        # Proveedores
        await db.proveedores.create_index("ruc", unique=True, background=True)
        
        # Ventas
        await db.ventas.create_index("fecha", background=True)
        await db.ventas.create_index("tipo_comprobante", background=True)
        await db.ventas.create_index("cliente_id", background=True)
        await db.ventas.create_index("vendedor_id", background=True)
        
        # Compras
        await db.compras.create_index("fecha", background=True)
        await db.compras.create_index("estado", background=True)
        await db.compras.create_index("proveedor_id", background=True)
        
        # Movimientos
        await db.movimientos.create_index("producto_id", background=True)
        await db.movimientos.create_index("fecha", background=True)
        await db.movimientos.create_index("tipo", background=True)
        
    except Exception as e:
        logger.warning(f"Indexes: {e}")

@app.on_event("startup")
async def startup_event():
    await init_sequences()
    await create_indexes()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
