import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

__version__ = "1"
app = FastAPI(
    title="ChatProvider",
    description="A ChatProvider Based on WebSocket",
    version=__version__,
)

origins = [
    "http://localhost:5173", "http://3.1.202.234:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger = logging.getLogger("uvicorn.error")
