from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM
import uuid
from datetime import datetime
from core.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    categoria: Mapped[str] = mapped_column(
        ENUM("Alimento para Animales", "Abarrotes", name="categoria_producto", create_type=False),
        nullable=False
    )
    precio_compra: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    precio_venta: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stock_minimo: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(20), default="unidad", nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    venta_items: Mapped[list["VentaItem"]] = relationship("VentaItem", back_populates="producto", lazy="selectin")
    compra_items: Mapped[list["CompraItem"]] = relationship("CompraItem", back_populates="producto", lazy="selectin")
    movimientos: Mapped[list["Movimiento"]] = relationship("Movimiento", back_populates="producto", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Producto {self.codigo} - {self.nombre}>"