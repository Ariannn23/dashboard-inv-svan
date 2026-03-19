from sqlalchemy import Column, String, Numeric, Integer, ForeignKey, DateTime, Date, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from core.database import Base

class EstadoCotizacion(str, enum.Enum):
    borrador = "borrador"
    enviada = "enviada"
    aprobada = "aprobada"
    rechazada = "rechazada"
    vencida = "vencida"

class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    numero_cotizacion = Column(String(20), unique=True, nullable=False)
    fecha = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    venta_id = Column(UUID(as_uuid=True), ForeignKey("ventas.id", ondelete="SET NULL"), nullable=True)
    
    subtotal = Column(Numeric(10, 2), nullable=False)
    igv = Column(Numeric(10, 2), nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    estado = Column(SQLEnum(EstadoCotizacion, name="estado_cotizacion", create_type=False), default=EstadoCotizacion.borrador, nullable=False)
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relaciones
    cliente = relationship("Cliente", lazy="selectin")
    usuario = relationship("User", lazy="selectin")
    items = relationship("CotizacionItem", back_populates="cotizacion", cascade="all, delete-orphan", lazy="selectin")

class CotizacionItem(Base):
    __tablename__ = "cotizacion_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cotizacion_id = Column(UUID(as_uuid=True), ForeignKey("cotizaciones.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(UUID(as_uuid=True), ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    # Relaciones
    cotizacion = relationship("Cotizacion", back_populates="items")
    producto = relationship("Producto", lazy="selectin")
