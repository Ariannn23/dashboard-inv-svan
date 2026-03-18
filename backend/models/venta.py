from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM
import uuid
from datetime import datetime
from core.database import Base


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    numero_comprobante: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    tipo_comprobante: Mapped[str] = mapped_column(
        ENUM("boleta", "factura", name="tipo_comprobante", create_type=False),
        nullable=False
    )
    cliente_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clientes.id"), nullable=True
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    igv: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="completada", nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    cliente: Mapped["Cliente | None"] = relationship("Cliente", lazy="selectin")
    usuario: Mapped["User"] = relationship("User", lazy="selectin")
    items: Mapped[list["VentaItem"]] = relationship(
        "VentaItem", back_populates="venta", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Venta {self.numero_comprobante} - Total: {self.total}>"


class VentaItem(Base):
    __tablename__ = "venta_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    venta_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ventas.id"), nullable=False
    )
    producto_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("productos.id"), nullable=False
    )
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    venta: Mapped["Venta"] = relationship("Venta", back_populates="items")
    producto: Mapped["Producto"] = relationship("Producto", back_populates="venta_items", lazy="selectin")

    def __repr__(self) -> str:
        return f"<VentaItem {self.producto_id} x {self.cantidad}>"