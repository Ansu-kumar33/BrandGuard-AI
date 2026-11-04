from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from analyze import router as analyze_router
from auth import router as authentication_router, validate_auth_config
from database import Base, engine, run_ownership_migrations
from routes import router as persistence_router

logger = logging.getLogger(__name__)

LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def get_frontend_origins() -> list[str]:
    configured_origins = os.getenv("FRONTEND_ORIGINS")
    if configured_origins is None:
        return LOCAL_FRONTEND_ORIGINS

    origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
    if "*" in origins:
        raise ValueError("FRONTEND_ORIGINS must not contain a wildcard origin.")
    return origins


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_auth_config()
    Base.metadata.create_all(bind=engine)
    run_ownership_migrations(engine)
    yield


app = FastAPI(title="BrandGuard AI API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_frontend_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(analyze_router)
app.include_router(authentication_router)
app.include_router(persistence_router)


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(
    _: Request, error: SQLAlchemyError
) -> JSONResponse:
    logger.error(
        "Database operation failed",
        exc_info=(type(error), error, error.__traceback__),
    )
    return JSONResponse(
        status_code=503,
        content={
            "detail": "The database is temporarily unavailable. Please try again."
        },
    )


@app.get("/api/health")
def health_check() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        logger.error(
            "Database health check failed",
            exc_info=(type(error), error, error.__traceback__),
        )
        raise HTTPException(
            status_code=503,
            detail="BrandGuard API is running, but its SQLite database is unavailable.",
        ) from error
    return {
        "status": "ok",
        "service": "BrandGuard AI API",
        "database": "connected",
    }
