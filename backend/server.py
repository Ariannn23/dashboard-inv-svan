"""
SVAN ERP — Backend v1.1.0
Migrado de MongoDB/Motor → PostgreSQL/SQLAlchemy async
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from io import BytesIO
from collections import defaultdict
import uuid

# SQLAlchemy
from sqlalchemy import select, update, delete, func, text, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

# ReportLab
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import xlsxwriter

# Auth
from passlib.context import CryptContext
from jose import JWTError, jwt

# Internos
from core.config import settings
from core.database import engine, Base, get_db
from models import User, Producto, Cliente, Proveedor, Venta, VentaItem, Compra, CompraItem, Movimiento

import uvicorn

# =============================================
# APP
# =============================================
app = FastAPI(
    title="SVAN ERP - Backend",
    description="Sistema ERP para compra y venta de alimento para animales",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(o) for o in settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================
# AUTH HELPERS
# =============================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise exc
    except JWTError:
        raise exc

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise exc
    return user


async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requieren permisos de administrador")
    return current_user


# =============================================
# PYDANTIC SCHEMAS
# =============================================

# Auth
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    nombre: str
    role: str = "vendedor"
    password: str

# Producto
class ProductoCreate(BaseModel):
    nombre: str
    categoria: str
    precio_compra: float
    precio_venta: float
    stock: int = 0
    stock_minimo: int = 5
    unidad_medida: str = "unidad"
    descripcion: Optional[str] = None

# Cliente
class ClienteCreate(BaseModel):
    tipo: str
    nombre: str
    documento: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

# Proveedor
class ProveedorCreate(BaseModel):
    nombre: str
    ruc: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

# Venta
class VentaItemSchema(BaseModel):
    producto_id: str
    cantidad: int
    precio_unitario: float

class VentaCreate(BaseModel):
    cliente_id: Optional[str] = None
    items: List[VentaItemSchema]
    tipo_comprobante: str = "boleta"
    notas: Optional[str] = None

# Compra
class CompraItemSchema(BaseModel):
    producto_id: str
    cantidad: int
    precio_unitario: float

class CompraCreate(BaseModel):
    proveedor_id: str
    items: List[CompraItemSchema]
    notas: Optional[str] = None

# Movimiento manual
class MovimientoCreate(BaseModel):
    producto_id: str
    tipo: str  # "entrada" | "salida"
    cantidad: int
    notas: Optional[str] = None

# Reportes
class ReporteVentasRequest(BaseModel):
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    tipo_comprobante: Optional[str] = None


# =============================================
# HELPERS ORM → DICT
# =============================================

def user_to_dict(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "nombre": u.nombre,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }

def producto_to_dict(p: Producto) -> dict:
    return {
        "id": str(p.id),
        "codigo": p.codigo,
        "nombre": p.nombre,
        "descripcion": p.descripcion,
        "categoria": p.categoria,
        "precio_compra": float(p.precio_compra),
        "precio_venta": float(p.precio_venta),
        "stock": p.stock,
        "stock_minimo": p.stock_minimo,
        "unidad_medida": p.unidad_medida,
        "activo": p.activo,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }

def cliente_to_dict(c: Cliente) -> dict:
    return {
        "id": str(c.id),
        "tipo": c.tipo,
        "nombre": c.nombre,
        "documento": c.documento,
        "direccion": c.direccion,
        "telefono": c.telefono,
        "email": c.email,
        "activo": c.activo,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }

def proveedor_to_dict(p: Proveedor) -> dict:
    return {
        "id": str(p.id),
        "nombre": p.nombre,
        "ruc": p.ruc,
        "direccion": p.direccion,
        "telefono": p.telefono,
        "email": p.email,
        "activo": p.activo,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }

def venta_item_to_dict(vi: VentaItem) -> dict:
    return {
        "id": str(vi.id),
        "producto_id": str(vi.producto_id),
        "producto_nombre": vi.producto.nombre if vi.producto else None,
        "cantidad": vi.cantidad,
        "precio_unitario": float(vi.precio_unitario),
        "subtotal": float(vi.subtotal),
    }

def venta_to_dict(v: Venta) -> dict:
    return {
        "id": str(v.id),
        "numero_comprobante": v.numero_comprobante,
        "tipo_comprobante": v.tipo_comprobante,
        "cliente_id": str(v.cliente_id) if v.cliente_id else None,
        "cliente_nombre": v.cliente.nombre if v.cliente else None,
        "usuario_id": str(v.usuario_id),
        "vendedor_nombre": v.usuario.nombre if v.usuario else None,
        "subtotal": float(v.subtotal),
        "igv": float(v.igv),
        "total": float(v.total),
        "estado": v.estado,
        "fecha": v.fecha.isoformat() if v.fecha else None,
        "notas": v.notas,
        "items": [venta_item_to_dict(i) for i in v.items] if v.items else [],
    }

def compra_item_to_dict(ci: CompraItem) -> dict:
    return {
        "id": str(ci.id),
        "producto_id": str(ci.producto_id),
        "producto_nombre": ci.producto.nombre if ci.producto else None,
        "cantidad": ci.cantidad,
        "precio_unitario": float(ci.precio_unitario),
        "subtotal": float(ci.subtotal),
    }

def compra_to_dict(c: Compra) -> dict:
    return {
        "id": str(c.id),
        "numero_orden": c.numero_orden,
        "proveedor_id": str(c.proveedor_id),
        "proveedor_nombre": c.proveedor.nombre if c.proveedor else None,
        "usuario_id": str(c.usuario_id),
        "usuario_nombre": c.usuario.nombre if c.usuario else None,
        "subtotal": float(c.subtotal),
        "total": float(c.total),
        "estado": c.estado,
        "fecha": c.fecha.isoformat() if c.fecha else None,
        "fecha_recepcion": c.fecha_recepcion.isoformat() if c.fecha_recepcion else None,
        "notas": c.notas,
        "items": [compra_item_to_dict(i) for i in c.items] if c.items else [],
    }

def movimiento_to_dict(m: Movimiento) -> dict:
    return {
        "id": str(m.id),
        "producto_id": str(m.producto_id),
        "producto_nombre": m.producto.nombre if m.producto else None,
        "tipo": m.tipo,
        "cantidad": m.cantidad,
        "stock_anterior": m.stock_anterior,
        "stock_nuevo": m.stock_nuevo,
        "referencia": m.referencia,
        "usuario_id": str(m.usuario_id) if m.usuario_id else None,
        "usuario_nombre": m.usuario.nombre if m.usuario else None,
        "notas": m.notas,
        "fecha": m.fecha.isoformat() if m.fecha else None,
    }


# =============================================
# SEQUENCES (PostgreSQL nativas)
# =============================================

async def get_next_orden_number(db: AsyncSession) -> str:
    result = await db.execute(text("SELECT nextval('seq_orden_compra')"))
    num = result.scalar()
    return f"OC-{num:08d}"

async def get_next_comprobante_number(tipo: str, db: AsyncSession) -> str:
    if tipo == "boleta":
        result = await db.execute(text("SELECT nextval('seq_boleta')"))
        num = result.scalar()
        return f"B001-{num:08d}"
    else:
        result = await db.execute(text("SELECT nextval('seq_factura')"))
        num = result.scalar()
        return f"F001-{num:08d}"


# =============================================
# STARTUP / SHUTDOWN
# =============================================

@app.on_event("startup")
async def startup_event():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Base de datos conectada y tablas verificadas")
        print(f"🌍 Entorno: {settings.ENVIRONMENT}")
    except Exception as e:
        print(f"❌ Error al conectar con PostgreSQL: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    await engine.dispose()
    print("🛑 Servidor cerrado correctamente")


# =============================================
# HEALTH
# =============================================

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow(),
        "environment": settings.ENVIRONMENT,
        "database": "postgresql",
    }

@app.get("/")
async def root():
    return {"message": "🚀 SVAN ERP Backend está corriendo", "version": app.version, "docs": "/docs"}


# =============================================
# AUTH ENDPOINTS
# =============================================

@api_router.post("/auth/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contraseña incorrectos")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario desactivado")

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_to_dict(user),
    }


@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return user_to_dict(current_user)

class RefreshRequest(BaseModel):
    refresh_token: str

@api_router.post("/auth/refresh")
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido o expirado")
    try:
        payload = jwt.decode(request.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise exc
        user_id = payload.get("sub")
        if not user_id:
            raise exc
    except JWTError:
        raise exc
    user = await db.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise exc
    new_access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@api_router.post("/auth/register")
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    user = User(
        email=user_in.email,
        nombre=user_in.nombre,
        role=user_in.role,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"message": "Usuario creado exitosamente", "id": str(user.id)}


# =============================================
# PRODUCTOS ENDPOINTS
# =============================================

@api_router.get("/productos")
async def get_productos(
    categoria: Optional[str] = None,
    search: Optional[str] = None,
    stock_bajo: Optional[bool] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    limit = min(limit, 200)
    skip = (page - 1) * limit
    q = select(Producto)
    if categoria:
        q = q.where(Producto.categoria == categoria)
    if search:
        q = q.where(Producto.nombre.ilike(f"%{search}%"))
    if stock_bajo:
        q = q.where(Producto.stock <= Producto.stock_minimo)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar()
    result = await db.execute(q.offset(skip).limit(limit))
    return {
        "data": [producto_to_dict(p) for p in result.scalars().all()],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
    }

@api_router.get("/productos/{producto_id}")
async def get_producto(
    producto_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = await db.get(Producto, uuid.UUID(producto_id))
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto_to_dict(p)


@api_router.post("/productos")
async def create_producto(
    producto: ProductoCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Generar código automático
    result = await db.execute(select(func.count()).select_from(Producto))
    count = result.scalar()
    codigo = f"PROD-{(count + 1):05d}"

    p = Producto(
        codigo=codigo,
        nombre=producto.nombre,
        categoria=producto.categoria,
        precio_compra=producto.precio_compra,
        precio_venta=producto.precio_venta,
        stock=producto.stock,
        stock_minimo=producto.stock_minimo,
        unidad_medida=producto.unidad_medida,
        descripcion=producto.descripcion,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"message": "Producto creado", "id": str(p.id)}


@api_router.put("/productos/{producto_id}")
async def update_producto(
    producto_id: str,
    producto: ProductoCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    p = await db.get(Producto, uuid.UUID(producto_id))
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    p.nombre = producto.nombre
    p.categoria = producto.categoria
    p.precio_compra = producto.precio_compra
    p.precio_venta = producto.precio_venta
    p.stock = producto.stock
    p.stock_minimo = producto.stock_minimo
    p.unidad_medida = producto.unidad_medida
    p.descripcion = producto.descripcion
    p.updated_at = datetime.utcnow()

    await db.commit()
    return {"message": "Producto actualizado"}


@api_router.delete("/productos/{producto_id}")
async def delete_producto(
    producto_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    p = await db.get(Producto, uuid.UUID(producto_id))
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    await db.delete(p)
    await db.commit()
    return {"message": "Producto eliminado"}


# =============================================
# CLIENTES ENDPOINTS
# =============================================

@api_router.get("/clientes")
async def get_clientes(
    search: Optional[str] = None,
    tipo: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Cliente)
    if tipo:
        q = q.where(Cliente.tipo == tipo)
    if search:
        q = q.where(
            or_(
                Cliente.nombre.ilike(f"%{search}%"),
                Cliente.documento.ilike(f"%{search}%"),
            )
        )
    limit = min(limit, 200)
    skip = (page - 1) * limit
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar()
    result = await db.execute(q.offset(skip).limit(limit))
    return {
        "data": [cliente_to_dict(c) for c in result.scalars().all()],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
    }


@api_router.get("/clientes/{cliente_id}")
async def get_cliente(
    cliente_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await db.get(Cliente, uuid.UUID(cliente_id))
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente_to_dict(c)


@api_router.post("/clientes")
async def create_cliente(
    cliente: ClienteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = Cliente(
        tipo=cliente.tipo,
        nombre=cliente.nombre,
        documento=cliente.documento,
        telefono=cliente.telefono,
        email=cliente.email,
        direccion=cliente.direccion,
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return {"message": "Cliente creado", "id": str(c.id)}


@api_router.put("/clientes/{cliente_id}")
async def update_cliente(
    cliente_id: str,
    cliente: ClienteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await db.get(Cliente, uuid.UUID(cliente_id))
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    c.tipo = cliente.tipo
    c.nombre = cliente.nombre
    c.documento = cliente.documento
    c.telefono = cliente.telefono
    c.email = cliente.email
    c.direccion = cliente.direccion

    await db.commit()
    return {"message": "Cliente actualizado"}


@api_router.delete("/clientes/{cliente_id}")
async def delete_cliente(
    cliente_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    c = await db.get(Cliente, uuid.UUID(cliente_id))
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    await db.delete(c)
    await db.commit()
    return {"message": "Cliente eliminado"}


# =============================================
# PROVEEDORES ENDPOINTS
# =============================================

@api_router.get("/proveedores")
async def get_proveedores(
    search: Optional[str] = None,
    page: int = 1,
limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Proveedor)
    if search:
        q = q.where(
            or_(
                Proveedor.nombre.ilike(f"%{search}%"),
                Proveedor.ruc.ilike(f"%{search}%"),
            )
        )
    limit = min(limit, 200)
    skip = (page - 1) * limit
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar()
    result = await db.execute(q.offset(skip).limit(limit))
    return {
        "data": [proveedor_to_dict(p) for p in result.scalars().all()],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
    }


@api_router.get("/proveedores/{proveedor_id}")
async def get_proveedor(
    proveedor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = await db.get(Proveedor, uuid.UUID(proveedor_id))
    if not p:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return proveedor_to_dict(p)


@api_router.post("/proveedores")
async def create_proveedor(
    proveedor: ProveedorCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    p = Proveedor(
        nombre=proveedor.nombre,
        ruc=proveedor.ruc,
        telefono=proveedor.telefono,
        email=proveedor.email,
        direccion=proveedor.direccion,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"message": "Proveedor creado", "id": str(p.id)}


@api_router.put("/proveedores/{proveedor_id}")
async def update_proveedor(
    proveedor_id: str,
    proveedor: ProveedorCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    p = await db.get(Proveedor, uuid.UUID(proveedor_id))
    if not p:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    p.nombre = proveedor.nombre
    p.ruc = proveedor.ruc
    p.telefono = proveedor.telefono
    p.email = proveedor.email
    p.direccion = proveedor.direccion

    await db.commit()
    return {"message": "Proveedor actualizado"}


@api_router.delete("/proveedores/{proveedor_id}")
async def delete_proveedor(
    proveedor_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    p = await db.get(Proveedor, uuid.UUID(proveedor_id))
    if not p:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    await db.delete(p)
    await db.commit()
    return {"message": "Proveedor eliminado"}


# =============================================
# VENTAS ENDPOINTS
# =============================================

@api_router.post("/ventas")
async def create_venta(
    venta: VentaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        # Generar número de comprobante
        numero_comprobante = await get_next_comprobante_number(venta.tipo_comprobante, db)

        subtotal = 0.0
        items_data = []

        for item in venta.items:
            prod_id = uuid.UUID(item.producto_id)

            # Obtener el producto actual para verificar stock y nombre
            prod = await db.get(Producto, prod_id)
            if not prod:
                raise HTTPException(status_code=400, detail=f"Producto {item.producto_id} no encontrado")
            if prod.stock < item.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para '{prod.nombre}'. Disponible: {prod.stock}",
                )

            stock_anterior = prod.stock
            stock_nuevo = prod.stock - item.cantidad

            # Aplicar descuento de stock directamente en el objeto ORM
            prod.stock = stock_nuevo
            prod.updated_at = datetime.utcnow()

            item_subtotal = item.cantidad * item.precio_unitario
            subtotal += item_subtotal
            items_data.append({
                "producto_id": prod_id,
                "producto_nombre": prod.nombre,
                "cantidad": item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal": item_subtotal,
                "stock_anterior": stock_anterior,
                "stock_nuevo": stock_nuevo,
            })

        igv = round(subtotal * 0.18, 2)
        total = round(subtotal + igv, 2)

        # Crear venta
        nueva_venta = Venta(
            numero_comprobante=numero_comprobante,
            tipo_comprobante=venta.tipo_comprobante,
            cliente_id=uuid.UUID(venta.cliente_id) if venta.cliente_id else None,
            usuario_id=current_user.id,
            subtotal=subtotal,
            igv=igv,
            total=total,
            notas=venta.notas,
        )
        db.add(nueva_venta)
        await db.flush()  # Obtener el ID antes de insertar items

        # Crear items y movimientos
        for item_d in items_data:
            vi = VentaItem(
                venta_id=nueva_venta.id,
                producto_id=item_d["producto_id"],
                cantidad=item_d["cantidad"],
                precio_unitario=item_d["precio_unitario"],
                subtotal=item_d["subtotal"],
            )
            db.add(vi)

            mov = Movimiento(
                producto_id=item_d["producto_id"],
                tipo="salida",
                cantidad=item_d["cantidad"],
                stock_anterior=item_d["stock_anterior"],
                stock_nuevo=item_d["stock_nuevo"],
                referencia=str(nueva_venta.id),
                usuario_id=current_user.id,
                notas=f"Venta {numero_comprobante}",
            )
            db.add(mov)

        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar venta: {str(e)}")

    return {
        "message": "Venta registrada",
        "id": str(nueva_venta.id),
        "numero_comprobante": numero_comprobante,
    }


@api_router.get("/ventas")
async def get_ventas(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    tipo_comprobante: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Venta).order_by(Venta.fecha.desc())
    if tipo_comprobante:
        q = q.where(Venta.tipo_comprobante == tipo_comprobante)
    if fecha_inicio:
        q = q.where(Venta.fecha >= datetime.fromisoformat(fecha_inicio))
    if fecha_fin:
        q = q.where(Venta.fecha <= datetime.fromisoformat(fecha_fin + "T23:59:59"))

    limit = min(limit, 200)
    skip = (page - 1) * limit
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar()
    result = await db.execute(q.offset(skip).limit(limit))
    return {
        "data": [venta_to_dict() for v in result.scalars().all()],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
    }


@api_router.get("/ventas/{venta_id}")
async def get_venta(
    venta_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    v = await db.get(Venta, uuid.UUID(venta_id))
    if not v:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta_to_dict(v)


@api_router.get("/ventas/{venta_id}/pdf")
async def get_venta_pdf(
    venta_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    v = await db.get(Venta, uuid.UUID(venta_id))
    if not v:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    venta = venta_to_dict(v)
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("CustomTitle", parent=styles["Heading1"], fontSize=18, spaceAfter=6, textColor=colors.HexColor("#0F766E"))
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#64748B"))

    elements = []
    elements.append(Paragraph("RUC: 20123456789", subtitle_style))
    elements.append(Paragraph("Av. Principal 123, Lima, Perú", subtitle_style))
    elements.append(Spacer(1, 20))

    tipo_text = "BOLETA DE VENTA" if venta["tipo_comprobante"] == "boleta" else "FACTURA"
    elements.append(Paragraph(f"<b>{tipo_text}</b>", styles["Heading2"]))
    elements.append(Paragraph(f"N° {venta['numero_comprobante']}", styles["Normal"]))
    fecha_str = venta["fecha"][:10] if venta["fecha"] else ""
    elements.append(Paragraph(f"Fecha: {fecha_str}", styles["Normal"]))
    elements.append(Spacer(1, 10))

    if venta.get("cliente_nombre"):
        elements.append(Paragraph(f"<b>Cliente:</b> {venta['cliente_nombre']}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    table_data = [["Producto", "Cant.", "P. Unit.", "Subtotal"]]
    for item in venta["items"]:
        table_data.append([
            item["producto_nombre"] or "",
            str(item["cantidad"]),
            f"S/ {item['precio_unitario']:.2f}",
            f"S/ {item['subtotal']:.2f}",
        ])

    table_data.append(["", "", "Subtotal:", f"S/ {venta['subtotal']:.2f}"])
    table_data.append(["", "", "IGV (18%):", f"S/ {venta['igv']:.2f}"])
    table_data.append(["", "", "TOTAL:", f"S/ {venta['total']:.2f}"])

    table = Table(table_data, colWidths=[3 * inch, 0.8 * inch, 1.2 * inch, 1.2 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F766E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 1), (0, -4), "LEFT"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
        ("BACKGROUND", (0, 1), (-1, -4), colors.white),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
        ("FONTNAME", (0, -3), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -4), 1, colors.HexColor("#E2E8F0")),
        ("LINEABOVE", (2, -3), (-1, -3), 1, colors.HexColor("#0F766E")),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("¡Gracias por su compra!", ParagraphStyle("Footer", parent=styles["Normal"], fontSize=12, textColor=colors.HexColor("#0F766E"), alignment=1)))
    elements.append(Paragraph("Este documento es un comprobante simulado para fines internos.", ParagraphStyle("Disclaimer", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#94A3B8"), alignment=1)))

    doc.build(elements)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=comprobante_{venta['numero_comprobante']}.pdf"},
    )


# =============================================
# COMPRAS ENDPOINTS
# =============================================

@api_router.post("/compras")
async def create_compra(
    compra: CompraCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    proveedor = await db.get(Proveedor, uuid.UUID(compra.proveedor_id))
    if not proveedor:
        raise HTTPException(status_code=400, detail="Proveedor no encontrado")

    numero_orden = await get_next_orden_number(db)

    subtotal = 0.0
    items_data = []
    for item in compra.items:
        producto = await db.get(Producto, uuid.UUID(item.producto_id))
        if not producto:
            raise HTTPException(status_code=400, detail=f"Producto {item.producto_id} no encontrado")
        item_subtotal = item.cantidad * item.precio_unitario
        subtotal += item_subtotal
        items_data.append({
            "producto_id": uuid.UUID(item.producto_id),
            "cantidad": item.cantidad,
            "precio_unitario": item.precio_unitario,
            "subtotal": item_subtotal,
        })

    total = round(subtotal, 2)

    nueva_compra = Compra(
        numero_orden=numero_orden,
        proveedor_id=proveedor.id,
        usuario_id=current_user.id,
        subtotal=subtotal,
        total=total,
        estado="pendiente",
        notas=compra.notas,
    )
    db.add(nueva_compra)
    await db.flush()

    for item_d in items_data:
        ci = CompraItem(
            compra_id=nueva_compra.id,
            producto_id=item_d["producto_id"],
            cantidad=item_d["cantidad"],
            precio_unitario=item_d["precio_unitario"],
            subtotal=item_d["subtotal"],
        )
        db.add(ci)

    await db.commit()
    return {"message": "Orden de compra creada", "id": str(nueva_compra.id), "numero_orden": numero_orden}


@api_router.get("/compras")
async def get_compras(
    estado: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    proveedor_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Compra).order_by(Compra.fecha.desc())
    if estado and estado != "all":
        q = q.where(Compra.estado == estado)
    if proveedor_id:
        q = q.where(Compra.proveedor_id == uuid.UUID(proveedor_id))

    limit = min(limit, 200)
    skip = (page - 1) * limit
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar()
    result = await db.execute(q.offset(skip).limit(limit))
    return {
        "data": [compra_to_dict(c) for c in result.scalars().all()],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
    }


@api_router.get("/compras/stats/resumen")
async def get_compras_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)

    result_mes = await db.execute(
        select(func.sum(Compra.total), func.count(Compra.id))
        .where(and_(Compra.estado == "recibida", Compra.fecha >= month_start))
    )
    total_mes, count_mes = result_mes.one()

    result_pend = await db.execute(select(func.count(Compra.id)).where(Compra.estado == "pendiente"))
    compras_pendientes = result_pend.scalar()

    result_hist = await db.execute(select(func.sum(Compra.total)).where(Compra.estado == "recibida"))
    total_historico = result_hist.scalar()

    return {
        "compras_mes": float(total_mes or 0),
        "compras_mes_count": count_mes or 0,
        "compras_pendientes": compras_pendientes or 0,
        "total_historico": float(total_historico or 0),
    }


@api_router.get("/compras/{compra_id}")
async def get_compra(
    compra_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await db.get(Compra, uuid.UUID(compra_id))
    if not c:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    return compra_to_dict(c)


@api_router.post("/compras/{compra_id}/recibir")
async def recibir_compra(
    compra_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    async with db.begin():
        c = await db.get(Compra, uuid.UUID(compra_id))
        if not c:
            raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
        if c.estado == "recibida":
            raise HTTPException(status_code=400, detail="Esta compra ya fue recibida")
        if c.estado == "cancelada":
            raise HTTPException(status_code=400, detail="No se puede recibir una compra cancelada")

        c.estado = "recibida"
        c.fecha_recepcion = datetime.now(timezone.utc)

        for item in c.items:
            # Obtener stock actual antes del incremento
            prod = await db.get(Producto, item.producto_id)
            if prod:
                stock_anterior = prod.stock
                prod.stock = prod.stock + item.cantidad
                prod.precio_compra = item.precio_unitario
                prod.updated_at = datetime.utcnow()

                mov = Movimiento(
                    producto_id=item.producto_id,
                    tipo="entrada",
                    cantidad=item.cantidad,
                    stock_anterior=stock_anterior,
                    stock_nuevo=prod.stock,
                    referencia=str(c.id),
                    usuario_id=current_user.id,
                    notas=f"Compra {c.numero_orden} - {c.proveedor.nombre if c.proveedor else ''}",
                )
                db.add(mov)

    return {"message": "Compra recibida y stock actualizado", "productos_actualizados": len(c.items)}


@api_router.post("/compras/{compra_id}/cancelar")
async def cancelar_compra(
    compra_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    c = await db.get(Compra, uuid.UUID(compra_id))
    if not c:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    if c.estado == "recibida":
        raise HTTPException(status_code=400, detail="No se puede cancelar una compra ya recibida")

    c.estado = "cancelada"
    await db.commit()
    return {"message": "Orden de compra cancelada"}


@api_router.delete("/compras/{compra_id}")
async def delete_compra(
    compra_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    c = await db.get(Compra, uuid.UUID(compra_id))
    if not c:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    if c.estado == "recibida":
        raise HTTPException(status_code=400, detail="No se puede eliminar una compra recibida")

    await db.delete(c)
    await db.commit()
    return {"message": "Orden de compra eliminada"}


# =============================================
# INVENTARIO / KARDEX
# =============================================

@api_router.get("/inventario/movimientos")
async def get_movimientos(
    producto_id: Optional[str] = None,
    tipo: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Movimiento).order_by(Movimiento.fecha.desc())
    if producto_id:
        q = q.where(Movimiento.producto_id == uuid.UUID(producto_id))
    if tipo:
        q = q.where(Movimiento.tipo == tipo)

    limit = min(limit, 200)
    skip = (page - 1) * limit
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar()
    result = await db.execute(q.offset(skip).limit(limit))
    return {
        "data": [movimiento_to_dict(m) for m in result.scalars().all()],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
    }


@api_router.post("/inventario/entrada")
async def registrar_entrada(
    mov: MovimientoCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    producto = await db.get(Producto, uuid.UUID(mov.producto_id))
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    stock_anterior = producto.stock
    producto.stock = producto.stock + mov.cantidad
    producto.updated_at = datetime.utcnow()

    movimiento = Movimiento(
        producto_id=producto.id,
        tipo="entrada",
        cantidad=mov.cantidad,
        stock_anterior=stock_anterior,
        stock_nuevo=producto.stock,
        notas=mov.notas,
        usuario_id=current_user.id,
    )
    db.add(movimiento)
    await db.commit()

    return {"message": "Entrada registrada", "nuevo_stock": producto.stock}


@api_router.post("/inventario/salida")
async def registrar_salida(
    mov: MovimientoCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    producto = await db.get(Producto, uuid.UUID(mov.producto_id))
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if producto.stock < mov.cantidad:
        raise HTTPException(status_code=400, detail="Stock insuficiente")

    stock_anterior = producto.stock
    producto.stock = producto.stock - mov.cantidad
    producto.updated_at = datetime.utcnow()

    movimiento = Movimiento(
        producto_id=producto.id,
        tipo="salida",
        cantidad=mov.cantidad,
        stock_anterior=stock_anterior,
        stock_nuevo=producto.stock,
        notas=mov.notas,
        usuario_id=current_user.id,
    )
    db.add(movimiento)
    await db.commit()

    return {"message": "Salida registrada", "nuevo_stock": producto.stock}


# =============================================
# DASHBOARD
# =============================================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)

    r_hoy = await db.execute(
        select(func.sum(Venta.total), func.count(Venta.id)).where(Venta.fecha >= today)
    )
    total_hoy, count_hoy = r_hoy.one()

    r_mes = await db.execute(
        select(func.sum(Venta.total), func.count(Venta.id)).where(Venta.fecha >= month_start)
    )
    total_mes, count_mes = r_mes.one()

    r_stock_bajo = await db.execute(
        select(func.count(Producto.id)).where(Producto.stock <= Producto.stock_minimo)
    )
    productos_stock_bajo = r_stock_bajo.scalar()

    r_total_prod = await db.execute(select(func.count(Producto.id)))
    total_productos = r_total_prod.scalar()

    r_total_cli = await db.execute(select(func.count(Cliente.id)))
    total_clientes = r_total_cli.scalar()

    r_inv = await db.execute(select(Producto.stock, Producto.precio_compra))
    valor_inventario = sum(row.stock * float(row.precio_compra) for row in r_inv.all())

    return {
        "ventas_hoy": float(total_hoy or 0),
        "ventas_hoy_count": count_hoy or 0,
        "ventas_mes": float(total_mes or 0),
        "ventas_mes_count": count_mes or 0,
        "productos_stock_bajo": productos_stock_bajo or 0,
        "total_productos": total_productos or 0,
        "total_clientes": total_clientes or 0,
        "valor_inventario": round(valor_inventario, 2),
    }


@api_router.get("/dashboard/ventas-recientes")
async def get_ventas_recientes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Venta).order_by(Venta.fecha.desc()).limit(10))
    return [venta_to_dict(v) for v in result.scalars().all()]


@api_router.get("/dashboard/productos-top")
async def get_productos_top(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            VentaItem.producto_id,
            Producto.nombre,
            func.sum(VentaItem.cantidad).label("cantidad_vendida"),
            func.sum(VentaItem.subtotal).label("total_ventas"),
        )
        .join(Producto, VentaItem.producto_id == Producto.id)
        .group_by(VentaItem.producto_id, Producto.nombre)
        .order_by(func.sum(VentaItem.cantidad).desc())
        .limit(5)
    )
    return [
        {
            "_id": str(row.producto_id),
            "nombre": row.nombre,
            "cantidad_vendida": int(row.cantidad_vendida),
            "total_ventas": float(row.total_ventas),
        }
        for row in result.all()
    ]


@api_router.get("/dashboard/ventas-por-periodo")
async def get_ventas_por_periodo(
    dias: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.now(timezone.utc)
    start_date = today - timedelta(days=dias)

    result = await db.execute(
        select(Venta.fecha, Venta.total).where(Venta.fecha >= start_date)
    )
    ventas = result.all()

    ventas_por_dia: dict = {}
    for v in ventas:
        fecha_str = v.fecha.strftime("%Y-%m-%d")
        ventas_por_dia[fecha_str] = ventas_por_dia.get(fecha_str, 0) + float(v.total)

    result_list = []
    for i in range(dias):
        fecha = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        result_list.append({"fecha": fecha, "total": ventas_por_dia.get(fecha, 0)})

    return result_list


# =============================================
# REPORTES EXCEL
# =============================================

@api_router.post("/reportes/ventas/excel")
async def exportar_ventas_excel(
    request: ReporteVentasRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Venta).order_by(Venta.fecha.desc())
    if request.tipo_comprobante and request.tipo_comprobante != "all":
        q = q.where(Venta.tipo_comprobante == request.tipo_comprobante)
    if request.fecha_inicio:
        q = q.where(Venta.fecha >= datetime.fromisoformat(request.fecha_inicio))
    if request.fecha_fin:
        q = q.where(Venta.fecha <= datetime.fromisoformat(request.fecha_fin + "T23:59:59"))

    result = await db.execute(q)
    ventas = [venta_to_dict(v) for v in result.scalars().all()]

    buffer = BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})

    header_format = workbook.add_format({"bold": True, "bg_color": "#0F766E", "font_color": "white", "border": 1, "align": "center", "valign": "vcenter"})
    money_format = workbook.add_format({"num_format": "S/ #,##0.00", "border": 1})
    cell_format = workbook.add_format({"border": 1})
    total_format = workbook.add_format({"bold": True, "bg_color": "#E2E8F0", "num_format": "S/ #,##0.00", "border": 1})

    ws = workbook.add_worksheet("Resumen Ventas")
    ws.set_column("A:A", 20)
    ws.set_column("B:G", 15)

    headers = ["N° Comprobante", "Fecha", "Cliente", "Tipo", "Subtotal", "IGV", "Total"]
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_format)

    total_ventas = total_igv = 0
    for row, v in enumerate(ventas, 1):
        ws.write(row, 0, v.get("numero_comprobante", ""), cell_format)
        ws.write(row, 1, (v.get("fecha") or "")[:16].replace("T", " "), cell_format)
        ws.write(row, 2, v.get("cliente_nombre") or "Cliente General", cell_format)
        ws.write(row, 3, "Boleta" if v.get("tipo_comprobante") == "boleta" else "Factura", cell_format)
        ws.write(row, 4, v.get("subtotal", 0), money_format)
        ws.write(row, 5, v.get("igv", 0), money_format)
        ws.write(row, 6, v.get("total", 0), money_format)
        total_ventas += v.get("total", 0)
        total_igv += v.get("igv", 0)

    last_row = len(ventas) + 1
    ws.write(last_row, 3, "TOTALES:", header_format)
    ws.write(last_row, 4, total_ventas - total_igv, total_format)
    ws.write(last_row, 5, total_igv, total_format)
    ws.write(last_row, 6, total_ventas, total_format)

    # Detalle por producto
    ws2 = workbook.add_worksheet("Detalle Productos")
    ws2.set_column("A:A", 30)
    ws2.set_column("B:E", 15)
    for col, h in enumerate(["Producto", "Cantidad Vendida", "Precio Promedio", "Total Ventas"]):
        ws2.write(0, col, h, header_format)

    productos_vendidos: dict = defaultdict(lambda: {"cantidad": 0, "total": 0, "precios": []})
    for v in ventas:
        for item in v.get("items", []):
            nombre = item.get("producto_nombre") or "Sin nombre"
            productos_vendidos[nombre]["cantidad"] += item.get("cantidad", 0)
            productos_vendidos[nombre]["total"] += item.get("subtotal", 0)
            productos_vendidos[nombre]["precios"].append(item.get("precio_unitario", 0))

    for row, (nombre, data) in enumerate(sorted(productos_vendidos.items(), key=lambda x: x[1]["total"], reverse=True), 1):
        precio_prom = sum(data["precios"]) / len(data["precios"]) if data["precios"] else 0
        ws2.write(row, 0, nombre, cell_format)
        ws2.write(row, 1, data["cantidad"], cell_format)
        ws2.write(row, 2, precio_prom, money_format)
        ws2.write(row, 3, data["total"], money_format)

    workbook.close()
    buffer.seek(0)
    fecha_rep = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=reporte_ventas_{fecha_rep}.xlsx"},
    )


@api_router.get("/reportes/inventario/excel")
async def exportar_inventario_excel(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r_prod = await db.execute(select(Producto))
    productos = [producto_to_dict(p) for p in r_prod.scalars().all()]

    r_mov = await db.execute(select(Movimiento).order_by(Movimiento.fecha.desc()))
    movimientos = [movimiento_to_dict(m) for m in r_mov.scalars().all()]

    buffer = BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})

    header_format = workbook.add_format({"bold": True, "bg_color": "#0F766E", "font_color": "white", "border": 1, "align": "center", "valign": "vcenter"})
    money_format = workbook.add_format({"num_format": "S/ #,##0.00", "border": 1})
    cell_format = workbook.add_format({"border": 1})
    warning_format = workbook.add_format({"border": 1, "bg_color": "#FEF3C7"})
    danger_format = workbook.add_format({"border": 1, "bg_color": "#FEE2E2"})
    total_format = workbook.add_format({"bold": True, "bg_color": "#E2E8F0", "num_format": "S/ #,##0.00", "border": 1})

    ws_inv = workbook.add_worksheet("Inventario Actual")
    ws_inv.set_column("A:A", 30)
    ws_inv.set_column("B:H", 15)
    for col, h in enumerate(["Producto", "Categoría", "Stock", "Stock Mín", "Unidad", "P. Compra", "P. Venta", "Valor Stock"]):
        ws_inv.write(0, col, h, header_format)

    valor_total = 0
    for row, prod in enumerate(productos, 1):
        stock = prod.get("stock", 0)
        stock_min = prod.get("stock_minimo", 0)
        valor = stock * prod.get("precio_compra", 0)
        valor_total += valor
        fmt = danger_format if stock == 0 else (warning_format if stock <= stock_min else cell_format)
        ws_inv.write(row, 0, prod.get("nombre", ""), fmt)
        ws_inv.write(row, 1, prod.get("categoria", ""), fmt)
        ws_inv.write(row, 2, stock, fmt)
        ws_inv.write(row, 3, stock_min, fmt)
        ws_inv.write(row, 4, prod.get("unidad_medida", ""), fmt)
        ws_inv.write(row, 5, prod.get("precio_compra", 0), money_format)
        ws_inv.write(row, 6, prod.get("precio_venta", 0), money_format)
        ws_inv.write(row, 7, valor, money_format)

    last_row = len(productos) + 1
    ws_inv.write(last_row, 6, "VALOR TOTAL:", header_format)
    ws_inv.write(last_row, 7, valor_total, total_format)

    # Kardex
    ws_kardex = workbook.add_worksheet("Kardex Movimientos")
    ws_kardex.set_column("A:A", 20)
    ws_kardex.set_column("B:B", 30)
    ws_kardex.set_column("C:G", 15)
    for col, h in enumerate(["Fecha", "Producto", "Tipo", "Cantidad", "Stock Ant.", "Stock Nuevo", "Usuario"]):
        ws_kardex.write(0, col, h, header_format)

    entrada_format = workbook.add_format({"border": 1, "bg_color": "#D1FAE5"})
    salida_format = workbook.add_format({"border": 1, "bg_color": "#FEF3C7"})
    for row, mov in enumerate(movimientos, 1):
        fmt = entrada_format if mov.get("tipo") == "entrada" else salida_format
        ws_kardex.write(row, 0, (mov.get("fecha") or "")[:16].replace("T", " "), fmt)
        ws_kardex.write(row, 1, mov.get("producto_nombre") or "", fmt)
        ws_kardex.write(row, 2, "Entrada" if mov.get("tipo") == "entrada" else "Salida", fmt)
        ws_kardex.write(row, 3, mov.get("cantidad", 0), fmt)
        ws_kardex.write(row, 4, mov.get("stock_anterior", 0), fmt)
        ws_kardex.write(row, 5, mov.get("stock_nuevo", 0), fmt)
        ws_kardex.write(row, 6, mov.get("usuario_nombre") or "", fmt)

    # Stock bajo
    ws_bajo = workbook.add_worksheet("Stock Bajo - Alertas")
    ws_bajo.set_column("A:A", 30)
    ws_bajo.set_column("B:E", 15)
    for col, h in enumerate(["Producto", "Stock Actual", "Stock Mínimo", "Faltan", "Estado"]):
        ws_bajo.write(0, col, h, header_format)

    row = 1
    for prod in productos:
        stock = prod.get("stock", 0)
        stock_min = prod.get("stock_minimo", 0)
        if stock <= stock_min:
            faltan = stock_min - stock
            estado = "AGOTADO" if stock == 0 else "BAJO"
            fmt = danger_format if stock == 0 else warning_format
            ws_bajo.write(row, 0, prod.get("nombre", ""), fmt)
            ws_bajo.write(row, 1, stock, fmt)
            ws_bajo.write(row, 2, stock_min, fmt)
            ws_bajo.write(row, 3, faltan, fmt)
            ws_bajo.write(row, 4, estado, fmt)
            row += 1

    workbook.close()
    buffer.seek(0)
    fecha_rep = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=reporte_inventario_{fecha_rep}.xlsx"},
    )


@api_router.get("/reportes/clientes/excel")
async def exportar_clientes_excel(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r_cli = await db.execute(select(Cliente))
    clientes = [cliente_to_dict(c) for c in r_cli.scalars().all()]

    r_ven = await db.execute(select(Venta.cliente_id, Venta.total).where(Venta.cliente_id.isnot(None)))
    ventas_por_cliente: dict = defaultdict(lambda: {"count": 0, "total": 0})
    for row in r_ven.all():
        cid = str(row.cliente_id)
        ventas_por_cliente[cid]["count"] += 1
        ventas_por_cliente[cid]["total"] += float(row.total)

    buffer = BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})
    header_format = workbook.add_format({"bold": True, "bg_color": "#0F766E", "font_color": "white", "border": 1, "align": "center"})
    money_format = workbook.add_format({"num_format": "S/ #,##0.00", "border": 1})
    cell_format = workbook.add_format({"border": 1})

    ws = workbook.add_worksheet("Clientes")
    ws.set_column("A:A", 30)
    ws.set_column("B:G", 18)
    for col, h in enumerate(["Cliente", "Tipo", "Documento", "Teléfono", "Email", "N° Compras", "Total Compras"]):
        ws.write(0, col, h, header_format)

    for row, c in enumerate(clientes, 1):
        stats = ventas_por_cliente.get(c.get("id", ""), {"count": 0, "total": 0})
        ws.write(row, 0, c.get("nombre", ""), cell_format)
        ws.write(row, 1, "Persona" if c.get("tipo") == "persona" else "Empresa", cell_format)
        ws.write(row, 2, c.get("documento") or "", cell_format)
        ws.write(row, 3, c.get("telefono") or "", cell_format)
        ws.write(row, 4, c.get("email") or "", cell_format)
        ws.write(row, 5, stats["count"], cell_format)
        ws.write(row, 6, stats["total"], money_format)

    workbook.close()
    buffer.seek(0)
    fecha_rep = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=reporte_clientes_{fecha_rep}.xlsx"},
    )


@api_router.get("/reportes/rentabilidad")
async def get_reporte_rentabilidad(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r_prod = await db.execute(select(Producto))
    productos = r_prod.scalars().all()

    r_items = await db.execute(
        select(
            VentaItem.producto_id,
            func.sum(VentaItem.cantidad).label("cantidad"),
            func.sum(VentaItem.subtotal).label("ingresos"),
        ).group_by(VentaItem.producto_id)
    )
    ventas_por_producto = {str(row.producto_id): {"cantidad": int(row.cantidad), "ingresos": float(row.ingresos)} for row in r_items.all()}

    resultado = []
    for prod in productos:
        pid = str(prod.id)
        ventas_data = ventas_por_producto.get(pid, {"cantidad": 0, "ingresos": 0})
        precio_compra = float(prod.precio_compra)
        precio_venta = float(prod.precio_venta)
        margen = precio_venta - precio_compra
        margen_porcentaje = (margen / precio_compra * 100) if precio_compra > 0 else 0
        ganancia_total = margen * ventas_data["cantidad"]
        resultado.append({
            "id": pid,
            "nombre": prod.nombre,
            "categoria": prod.categoria,
            "precio_compra": precio_compra,
            "precio_venta": precio_venta,
            "margen": margen,
            "margen_porcentaje": round(margen_porcentaje, 1),
            "cantidad_vendida": ventas_data["cantidad"],
            "ingresos": ventas_data["ingresos"],
            "ganancia_total": ganancia_total,
            "stock": prod.stock,
        })

    resultado.sort(key=lambda x: x["ganancia_total"], reverse=True)
    total_ingresos = sum(r["ingresos"] for r in resultado)
    total_ganancia = sum(r["ganancia_total"] for r in resultado)
    total_costo = total_ingresos - total_ganancia
    margen_global = (total_ganancia / total_costo * 100) if total_costo > 0 else 0

    return {
        "productos": resultado,
        "resumen": {
            "total_ingresos": round(total_ingresos, 2),
            "total_costo": round(total_costo, 2),
            "total_ganancia": round(total_ganancia, 2),
            "margen_global": round(margen_global, 1),
        },
    }


@api_router.get("/reportes/ventas-por-categoria")
async def get_ventas_por_categoria(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Producto.categoria,
            func.sum(VentaItem.cantidad).label("cantidad"),
            func.sum(VentaItem.subtotal).label("total"),
        )
        .join(Producto, VentaItem.producto_id == Producto.id)
        .group_by(Producto.categoria)
        .order_by(func.sum(VentaItem.subtotal).desc())
    )
    return [
        {"categoria": row.categoria, "cantidad": int(row.cantidad), "total": round(float(row.total), 2)}
        for row in result.all()
    ]


@api_router.get("/reportes/ventas-por-vendedor")
async def get_ventas_por_vendedor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            User.nombre,
            func.count(Venta.id).label("ventas"),
            func.sum(Venta.total).label("total"),
        )
        .join(User, Venta.usuario_id == User.id)
        .group_by(User.nombre)
        .order_by(func.sum(Venta.total).desc())
    )
    return [
        {"vendedor": row.nombre, "ventas": int(row.ventas), "total": round(float(row.total), 2)}
        for row in result.all()
    ]


# =============================================
# SEED
# =============================================

@api_router.post("/seed")
async def seed_data(db: AsyncSession = Depends(get_db)):
    if settings.ENVIRONMENT != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida en este entorno. Solo disponible en 'development'.",
        )

    # ── USUARIOS ──────────────────────────────────────────────
    r = await db.execute(select(func.count()).select_from(User))
    if r.scalar() == 0:
        for u in [
            {"email": "admin@svan.com", "nombre": "Administrador", "role": "admin", "password": "admin123"},
            {"email": "vendedor@svan.com", "nombre": "Vendedor", "role": "vendedor", "password": "vendedor123"},
        ]:
            db.add(User(
                email=u["email"], nombre=u["nombre"], role=u["role"],
                hashed_password=get_password_hash(u["password"]),
            ))
        await db.commit()

    # ── PRODUCTOS ─────────────────────────────────────────────
    productos_seed = [
        # PET FOOD
        {"nombre": "Dog Chow Adulto 15kg", "categoria": "Alimento para Animales", "precio_compra": 85.00, "precio_venta": 115.00, "stock": 25, "stock_minimo": 5, "unidad_medida": "bolsa"},
        {"nombre": "Cat Chow Gatitos 8kg", "categoria": "Alimento para Animales", "precio_compra": 65.00, "precio_venta": 89.00, "stock": 18, "stock_minimo": 5, "unidad_medida": "bolsa"},
        {"nombre": "Ricocan Carne 15kg", "categoria": "Alimento para Animales", "precio_compra": 72.00, "precio_venta": 98.00, "stock": 30, "stock_minimo": 8, "unidad_medida": "bolsa"},
        {"nombre": "Mimaskot Adulto 15kg", "categoria": "Alimento para Animales", "precio_compra": 68.00, "precio_venta": 92.00, "stock": 3, "stock_minimo": 5, "unidad_medida": "bolsa"},
        {"nombre": "Whiskas Atún 1.5kg", "categoria": "Alimento para Animales", "precio_compra": 22.00, "precio_venta": 32.00, "stock": 40, "stock_minimo": 10, "unidad_medida": "bolsa"},
        {"nombre": "Pro Plan Adulto 3kg", "categoria": "Alimento para Animales", "precio_compra": 45.00, "precio_venta": 65.00, "stock": 12, "stock_minimo": 3, "unidad_medida": "bolsa"},
        {"nombre": "Hills Science Diet 2kg", "categoria": "Alimento para Animales", "precio_compra": 55.00, "precio_venta": 78.00, "stock": 8, "stock_minimo": 2, "unidad_medida": "bolsa"},
        {"nombre": "Pedigree Cachorro 10kg", "categoria": "Alimento para Animales", "precio_compra": 60.00, "precio_venta": 82.00, "stock": 15, "stock_minimo": 5, "unidad_medida": "bolsa"},
        {"nombre": "Cambo Adulto Cordero 15kg", "categoria": "Alimento para Animales", "precio_compra": 90.00, "precio_venta": 125.00, "stock": 10, "stock_minimo": 3, "unidad_medida": "bolsa"},
        {"nombre": "Ricocat Pescado 9kg", "categoria": "Alimento para Animales", "precio_compra": 58.00, "precio_venta": 79.00, "stock": 20, "stock_minimo": 5, "unidad_medida": "bolsa"},
        # ABARROTES
        {"nombre": "Arroz Costeño 5kg", "categoria": "Abarrotes", "precio_compra": 18.50, "precio_venta": 24.00, "stock": 50, "stock_minimo": 15, "unidad_medida": "bolsa"},
        {"nombre": "Aceite Primor 1L", "categoria": "Abarrotes", "precio_compra": 8.50, "precio_venta": 11.50, "stock": 60, "stock_minimo": 20, "unidad_medida": "botella"},
        {"nombre": "Azúcar Rubia 1kg", "categoria": "Abarrotes", "precio_compra": 3.80, "precio_venta": 5.20, "stock": 80, "stock_minimo": 25, "unidad_medida": "bolsa"},
        {"nombre": "Leche Gloria 400g", "categoria": "Abarrotes", "precio_compra": 3.20, "precio_venta": 4.50, "stock": 100, "stock_minimo": 30, "unidad_medida": "lata"},
        {"nombre": "Fideos Don Vittorio 500g", "categoria": "Abarrotes", "precio_compra": 2.80, "precio_venta": 4.00, "stock": 45, "stock_minimo": 20, "unidad_medida": "paquete"},
        {"nombre": "Atún Florida Trozos", "categoria": "Abarrotes", "precio_compra": 4.50, "precio_venta": 6.50, "stock": 70, "stock_minimo": 15, "unidad_medida": "lata"},
        {"nombre": "Menestra Lentejas 500g", "categoria": "Abarrotes", "precio_compra": 3.50, "precio_venta": 5.00, "stock": 35, "stock_minimo": 10, "unidad_medida": "bolsa"},
        {"nombre": "Avena 3 Ositos 300g", "categoria": "Abarrotes", "precio_compra": 2.20, "precio_venta": 3.50, "stock": 40, "stock_minimo": 10, "unidad_medida": "bolsa"},
        {"nombre": "Chocolate Sol del Cusco", "categoria": "Abarrotes", "precio_compra": 1.50, "precio_venta": 2.50, "stock": 90, "stock_minimo": 20, "unidad_medida": "barra"},
        {"nombre": "Mermelada Gloria 300g", "categoria": "Abarrotes", "precio_compra": 4.20, "precio_venta": 6.00, "stock": 25, "stock_minimo": 5, "unidad_medida": "frasco"},
        # LIMPIEZA
        {"nombre": "Detergente Ariel 1kg", "categoria": "Abarrotes", "precio_compra": 12.00, "precio_venta": 16.50, "stock": 30, "stock_minimo": 8, "unidad_medida": "bolsa"},
        {"nombre": "Lejía Clorox 1L", "categoria": "Abarrotes", "precio_compra": 3.50, "precio_venta": 5.00, "stock": 40, "stock_minimo": 10, "unidad_medida": "botella"},
        {"nombre": "Jabón Bolivar Barra", "categoria": "Abarrotes", "precio_compra": 2.50, "precio_venta": 3.80, "stock": 60, "stock_minimo": 15, "unidad_medida": "barra"},
        {"nombre": "Ayudín Pasta 400g", "categoria": "Abarrotes", "precio_compra": 3.20, "precio_venta": 4.80, "stock": 35, "stock_minimo": 10, "unidad_medida": "pote"},
        {"nombre": "Suavizante Downy 1L", "categoria": "Abarrotes", "precio_compra": 9.00, "precio_venta": 13.50, "stock": 15, "stock_minimo": 5, "unidad_medida": "botella"},
    ]

    products_added = 0
    for idx, prod in enumerate(productos_seed, 1):
        r = await db.execute(select(Producto).where(Producto.nombre == prod["nombre"]))
        if not r.scalar_one_or_none():
            db.add(Producto(
                codigo=f"PROD-{idx:05d}",
                nombre=prod["nombre"],
                categoria=prod["categoria"],
                precio_compra=prod["precio_compra"],
                precio_venta=prod["precio_venta"],
                stock=prod["stock"],
                stock_minimo=prod["stock_minimo"],
                unidad_medida=prod["unidad_medida"],
            ))
            products_added += 1
    await db.commit()

    # ── CLIENTES ──────────────────────────────────────────────
    clientes_seed = [
        {"tipo": "persona", "nombre": "Juan Pérez García", "documento": "12345678", "telefono": "999888777", "direccion": "Av. Lima 123"},
        {"tipo": "empresa", "nombre": "Veterinaria San Roque SAC", "documento": "20512345678", "telefono": "014567890", "direccion": "Av. Los Olivos 456"},
        {"tipo": "persona", "nombre": "María Rodríguez López", "documento": "87654321", "telefono": "987654321", "direccion": "Jr. Puno 789"},
        {"tipo": "empresa", "nombre": "Bodega El Tío Juan", "documento": "20601234567", "telefono": "012345678", "direccion": "Calle Real 101"},
        {"tipo": "persona", "nombre": "Carlos Sánchez Vega", "documento": "11223344", "telefono": "911223344", "direccion": "Av. Arequipa 555"},
        {"tipo": "empresa", "nombre": "Restaurante Sabor Peruano", "documento": "20556677889", "telefono": "013334444", "direccion": "Av. Brasil 2020"},
        {"tipo": "persona", "nombre": "Ana Torres Díaz", "documento": "44332211", "telefono": "944332211", "direccion": "Jr. Cusco 321"},
        {"tipo": "empresa", "nombre": "Farmacia Salud Total", "documento": "20445566771", "telefono": "015556666", "direccion": "Av. Tacna 888"},
        {"tipo": "persona", "nombre": "Luis Mendoza Ruiz", "documento": "55667788", "telefono": "955667788", "direccion": "Calle La Paz 100"},
        {"tipo": "empresa", "nombre": "Librería El Estudiante", "documento": "20334455662", "telefono": "016667777", "direccion": "Av. Universitaria 1500"},
        {"tipo": "persona", "nombre": "Carmen Silva Flores", "documento": "66778899", "telefono": "966778899", "direccion": "Jr. Unión 450"},
        {"tipo": "empresa", "nombre": "Transportes Rápidos SAC", "documento": "20112233445", "telefono": "017778888", "direccion": "Av. Argentina 3000"},
        {"tipo": "persona", "nombre": "Jorge Castillo Ramos", "documento": "77889900", "telefono": "977889900", "direccion": "Av. Salaverry 1200"},
        {"tipo": "empresa", "nombre": "Minimarket Los Amigos", "documento": "20889900113", "telefono": "018889999", "direccion": "Calle Los Pinos 234"},
        {"tipo": "persona", "nombre": "Elena Quispe Mamani", "documento": "88990011", "telefono": "988990011", "direccion": "Av. Venezuela 900"},
        {"tipo": "empresa", "nombre": "Panadería El Trigal", "documento": "20990011224", "telefono": "019990000", "direccion": "Jr. Huallaga 567"},
        {"tipo": "persona", "nombre": "Miguel Angel Romero", "documento": "99001122", "telefono": "999001122", "direccion": "Av. Abancay 400"},
        {"tipo": "empresa", "nombre": "Ferretería El Martillo", "documento": "20101112135", "telefono": "012223333", "direccion": "Av. Colonial 2500"},
        {"tipo": "persona", "nombre": "Rosa Medina Torres", "documento": "00112233", "telefono": "900112233", "direccion": "Jr. Ica 123"},
        {"tipo": "empresa", "nombre": "Grifo El Volante", "documento": "20212223246", "telefono": "014445555", "direccion": "Panamericana Norte Km 25"},
    ]

    clients_added = 0
    for c in clientes_seed:
        r = await db.execute(select(Cliente).where(Cliente.documento == c["documento"]))
        if not r.scalar_one_or_none():
            db.add(Cliente(**c))
            clients_added += 1
    await db.commit()

    # ── PROVEEDORES ───────────────────────────────────────────
    proveedores_seed = [
        {"nombre": "Distribuidora Purina SAC", "documento": "20123456789", "telefono": "016543210", "direccion": "Av. Industrial 123", "email": "ventas@purina.com"},
        {"nombre": "Alimentos del Norte EIRL", "documento": "20987654321", "telefono": "016789012", "direccion": "Calle Fabril 456", "email": "contacto@alnorte.com"},
        {"nombre": "Alicorp SAA", "documento": "20100055237", "telefono": "013150800", "direccion": "Av. Argentina 4793", "email": "ventas@alicorp.com.pe"},
        {"nombre": "Gloria SA", "documento": "20100190797", "telefono": "014707170", "direccion": "Av. República de Panamá 2461", "email": "pedidos@gloria.com.pe"},
        {"nombre": "Procter & Gamble Perú", "documento": "20100127165", "telefono": "012135000", "direccion": "Av. Materiales 2805", "email": "ventas@pg.com"},
        {"nombre": "Unilever Andina", "documento": "20100006295", "telefono": "014118300", "direccion": "Av. Paseo de la República 5895", "email": "contacto.peru@unilever.com"},
        {"nombre": "Nestlé Perú", "documento": "20263322496", "telefono": "012133333", "direccion": "Calle Los Frutales 451", "email": "servicios@nestle.com.pe"},
        {"nombre": "Kimberly-Clark Perú", "documento": "20100152941", "telefono": "016184000", "direccion": "Av. Paseo de la República 3755", "email": "ventas@kcc.com"},
        {"nombre": "Molitalia SA", "documento": "20100035121", "telefono": "015136262", "direccion": "Av. Venezuela 2850", "email": "pedidos@molitalia.com"},
        {"nombre": "Backus y Johnston", "documento": "20100113610", "telefono": "013113000", "direccion": "Av. Nicolás Ayllón 3986", "email": "atencion@backus.com.pe"},
        {"nombre": "San Fernando SA", "documento": "20100154308", "telefono": "012135300", "direccion": "Av. República de Panamá 4295", "email": "ventas@san-fernando.com.pe"},
        {"nombre": "Laive SA", "documento": "20100095450", "telefono": "016187600", "direccion": "Av. Nicolás de Piérola 601", "email": "pedidos@laive.com.pe"},
        {"nombre": "Costeño Alimentos SAC", "documento": "20251648906", "telefono": "016164200", "direccion": "Av. Santa Anita 240", "email": "ventas@costeno.com.pe"},
        {"nombre": "Colgate-Palmolive Perú", "documento": "20100030595", "telefono": "014115000", "direccion": "Av. Rivera Navarrete 501", "email": "contacto@colgate.com"},
        {"nombre": "Clorox Perú SA", "documento": "20336208641", "telefono": "016144600", "direccion": "Av. Néstor Gambetta 6555", "email": "ventas@clorox.com"},
        {"nombre": "Coca-Cola Servicios Perú", "documento": "20415932376", "telefono": "080014400", "direccion": "Av. República de Panamá 4050", "email": "pedidos@coca-cola.com"},
        {"nombre": "PepsiCo Alimentos Perú", "documento": "20502758117", "telefono": "013170400", "direccion": "Av. Francisco Bolognesi 401", "email": "ventas@pepsico.com"},
        {"nombre": "Intradevco Industrial", "documento": "20100030919", "telefono": "012151000", "direccion": "Av. Producción Nacional 188", "email": "ventas@intradevco.com"},
        {"nombre": "Softys Perú", "documento": "20100132592", "telefono": "013192300", "direccion": "Av. Elmer Faucett 3260", "email": "contacto@softys.com"},
        {"nombre": "Mondelez Perú SA", "documento": "20100049938", "telefono": "016113000", "direccion": "Av. Venezuela 2470", "email": "ventas@mondelez.com"},
    ]

    providers_added = 0
    for p in proveedores_seed:
        r = await db.execute(select(Proveedor).where(Proveedor.ruc == p["ruc"]))
        if not r.scalar_one_or_none():
            db.add(Proveedor(**p))
            providers_added += 1
    await db.commit()

    return {
        "message": f"Datos inyectados exitosamente. Productos: {products_added}, Clientes: {clients_added}, Proveedores: {providers_added}"
    }


# =============================================
# REGISTRAR ROUTER
# =============================================
app.include_router(api_router)


# =============================================
# EJECUCIÓN DEL SERVIDOR
# =============================================
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)