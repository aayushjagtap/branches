from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models

router = APIRouter(prefix="/boards", tags=["boards"])


# -----------------------------
# Pydantic schemas
# -----------------------------


class BoardCreate(BaseModel):
    name: str


class BoardOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


class ColumnBase(BaseModel):
    name: str


class ColumnCreate(ColumnBase):
    pass


class ColumnUpdate(ColumnBase):
    pass


class ColumnOut(BaseModel):
    id: int
    board_id: int
    name: str
    position: int

    class Config:
        orm_mode = True


# -----------------------------
# Board endpoints
# -----------------------------


@router.get("/", response_model=List[BoardOut])
def list_boards(db: Session = Depends(get_db)):
    boards = db.query(models.Board).order_by(models.Board.id).all()
    return boards


@router.post("/", response_model=BoardOut, status_code=status.HTTP_201_CREATED)
def create_board(payload: BoardCreate, db: Session = Depends(get_db)):
    board = models.Board(name=payload.name)
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


# -----------------------------
# Column endpoints
# -----------------------------


@router.get("/{board_id}/columns", response_model=List[ColumnOut])
def list_columns(board_id: int, db: Session = Depends(get_db)):
    board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    cols = (
        db.query(models.Column)
        .filter(models.Column.board_id == board_id)
        .order_by(models.Column.position)
        .all()
    )
    return cols


@router.post(
    "/{board_id}/columns",
    response_model=ColumnOut,
    status_code=status.HTTP_201_CREATED,
)
def create_column(board_id: int, payload: ColumnCreate, db: Session = Depends(get_db)):
    board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    # Put new column at the end
    max_pos = (
        db.query(func.max(models.Column.position))
        .filter(models.Column.board_id == board_id)
        .scalar()
    )
    next_pos = (max_pos or 0) + 1

    col = models.Column(
        board_id=board_id,
        name=payload.name,
        position=next_pos,
    )
    db.add(col)
    db.commit()
    db.refresh(col)
    return col


@router.put("/{board_id}/columns/{column_id}", response_model=ColumnOut)
def update_column(
    board_id: int,
    column_id: int,
    payload: ColumnUpdate,
    db: Session = Depends(get_db),
):
    col = (
        db.query(models.Column)
        .filter(
            models.Column.id == column_id,
            models.Column.board_id == board_id,
        )
        .first()
    )
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")

    col.name = payload.name
    db.commit()
    db.refresh(col)
    return col


@router.delete(
    "/{board_id}/columns/{column_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_column(board_id: int, column_id: int, db: Session = Depends(get_db)):
    col = (
        db.query(models.Column)
        .filter(
            models.Column.id == column_id,
            models.Column.board_id == board_id,
        )
        .first()
    )
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")

    db.delete(col)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

