from sqlalchemy import String, ForeignKey, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # NEW: one-to-many relationship with columns
    columns: Mapped[list["Column"]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="Column.position",
    )


class Column(Base):
    __tablename__ = "columns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Points to the board that owns this column
    board_id: Mapped[int] = mapped_column(
        ForeignKey("boards.id", ondelete="CASCADE"),
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255))

    # Position controls ordering inside the board (1,2,3,...)
    position: Mapped[int] = mapped_column(Integer, default=1)

    # Relationship back to the board
    board: Mapped["Board"] = relationship(back_populates="columns")

