"""
DeLiKet — Vercel Serverless Entry Point
Exposes the FastAPI app for Vercel Python runtime.
"""
from api.main import app

# Vercel ASGI handler
handler = app
