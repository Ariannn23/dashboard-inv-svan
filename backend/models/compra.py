from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM
import uuid
from datetime import datetime
from core.database import Base


class Compra(Base):
    __tablename__ = "compras"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    numero_orden: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    proveedor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proveedores.id"), nullable=False
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    estado: Mapped[str] = mapped_column(
        ENUM("pendiente", "recibida", "cancelada", name="estado_compra", create_type=False),
        nullable=False,
        default="pendiente"
    )
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    fecha_recepcion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    proveedor: Mapped["Proveedor"] = relationship("Proveedor", lazy="selectin")
    usuario: Mapped["User"] = relationship("User", lazy="selectin")
    items: Mapped[list["CompraItem"]] = relationship(
        "CompraItem", back_populates="compra", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Compra {self.numero_orden}>"


class CompraItem(Base):
    __tablename__ = "compra_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    compra_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("compras.id"), nullable=False
    )
    producto_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("productos.id"), nullable=False
    )
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    compra: Mapped["Compra"] = relationship("Compra", back_populates="items")
    producto: Mapped["Producto"] = relationship("Producto", back_populates="compra_items", lazy="selectin")

    def __repr__(self) -> str:
        return f"<CompraItem {self.producto_id} x {self.cantidad}>"