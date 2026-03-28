"""
Setup script to create the domain-driven backend structure
"""
import os
import shutil

# Base paths
SRC_BASE = r"c:\Users\acer\Desktop\stage\_erp_FastAPI\backend\backend_by_architecture\app"
DEST_BASE = r"c:\Users\acer\Desktop\stage\_erp_FastAPI\backend\backend_by_domain\app"

# Create all domain directories
directories = [
    "core",
    "websockets",
    "auth",
    "users",
    "projects",
    "tasks",
    "hiring",
    "notifications",
    "messaging",
    "ai"
]

print("Creating directory structure...")
for dir_name in directories:
    dir_path = os.path.join(DEST_BASE, dir_name)
    os.makedirs(dir_path, exist_ok=True)
    print(f"  ✓ {dir_name}/")

print("\n" + "="*60)
print("Directory structure created successfully!")
print("="*60)
