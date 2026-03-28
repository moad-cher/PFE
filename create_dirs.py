import os

base_path = r"c:\Users\acer\Desktop\stage\_erp_FastAPI\backend\backend_by_domain\app"

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

for dir_name in directories:
    dir_path = os.path.join(base_path, dir_name)
    os.makedirs(dir_path, exist_ok=True)
    print(f"Created: {dir_path}")

print("\nAll directories created successfully!")
