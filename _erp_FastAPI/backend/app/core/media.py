"""
Media file handling utilities.
Provides centralized path management for all media files (avatars, resumes, etc.)
"""
import os
import pathlib

from app.core.config import settings

# Base directory is the backend root (parent of app/)
BASE_DIR = pathlib.Path(__file__).parent.parent

# Absolute path to media directory
MEDIA_ROOT = BASE_DIR / settings.MEDIA_DIR


def get_media_path(*paths: str) -> pathlib.Path:
    """
    Get absolute path for a media file.
    
    Example:
        get_media_path("avatars", "1.png") -> /path/to/backend/media/avatars/1.png
    """
    return MEDIA_ROOT.joinpath(*paths)


def get_media_url(*paths: str) -> str:
    """
    Get URL path for a media file (for frontend consumption).
    
    Example:
        get_media_url("avatars", "1.png") -> "/media/avatars/1.png"
    """
    return "/media/" + "/".join(paths)


def ensure_media_dir(*paths: str) -> pathlib.Path:
    """
    Ensure a media subdirectory exists and return its absolute path.
    
    Example:
        ensure_media_dir("avatars") -> creates and returns /path/to/backend/media/avatars/
    """
    dir_path = get_media_path(*paths)
    os.makedirs(dir_path, exist_ok=True)
    return dir_path


# Pre-defined directories
AVATARS_DIR = "avatars"
RESUMES_DIR = "resumes"
