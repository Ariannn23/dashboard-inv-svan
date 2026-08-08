from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from core.database import Base

class NotaCredito(Base):
    __tablename__ = "notas_credito"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    venta_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ventas.id"), nullable=False
    )
    cliente_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clientes.id"), nullable=True
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    numero_nota: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    motivo: Mapped[str] = mapped_column(String(100), nullable=False) # e.g., "Devolución total", "Error en precio"
    
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    igv: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    venta: Mapped["Venta"] = relationship("Venta", lazy="selectin")
    cliente: Mapped["Cliente | None"] = relationship("Cliente", lazy="selectin")
    usuario: Mapped["User"] = relationship("User", lazy="selectin")
    items: Mapped[list["NotaCreditoItem"]] = relationship(
        "NotaCreditoItem", back_populates="nota_credito", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<NotaCredito {self.numero_nota} - Total: {self.total}>"


class NotaCreditoItem(Base):
    __tablename__ = "nota_credito_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nota_credito_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notas_credito.id"), nullable=False
    )
    producto_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("productos.id"), nullable=False
    )
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    nota_credito: Mapped["NotaCredito"] = relationship("NotaCredito", back_populates="items")
    producto: Mapped["Producto"] = relationship("Producto", lazy="selectin")

    def __repr__(self) -> str:
        return f"<NotaCreditoItem {self.producto_id} x {self.cantidad}>"
