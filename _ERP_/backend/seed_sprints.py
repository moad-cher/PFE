import asyncio
import random
import sys
import os

# Add the current directory to sys.path so we can import the app
sys.path.append(os.getcwd())

from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.projects.models import Project, Sprint, Story, Task, SprintStatus, TaskStatus
from app.users.models import User

async def seed_historical_data():
    async with AsyncSessionLocal() as db:
        print("Starting seed process...")
        
        # 1. Get a manager
        res = await db.execute(select(User).limit(1))
        manager = res.scalar()
        if not manager:
            print("No users found. Please register a user first via the UI or another script.")
            return

        # 2. Create Project
        project_name = f"Analytics Demo {random.randint(100, 999)}"
        project = Project(
            name=project_name,
            description="A project with historical data for burndown and velocity visualization.",
            manager_id=manager.id
        )
        db.add(project)
        await db.flush()
        print(f"Created project: {project_name}")

        # 3. Ensure Statuses
        statuses = [
            TaskStatus(project_id=project.id, name="To do", slug="todo", order=0, color="#e74c3c"),
            TaskStatus(project_id=project.id, name="In progress", slug="in_progress", order=1, color="#f39c12"),
            TaskStatus(project_id=project.id, name="Review", slug="review", order=2, color="#3498db"),
            TaskStatus(project_id=project.id, name="Done", slug="done", order=3, color="#2ecc71"),
        ]
        db.add_all(statuses)
        
        # 4. Create 3 Sprints
        today_date = date.today()
        sprint_duration = 14
        
        sprint_configs = [
            {
                "name": "Sprint 1: The Foundation",
                "start": today_date - timedelta(days=37),
                "end": today_date - timedelta(days=23),
                "status": SprintStatus.completed,
                "committed": 25,
                "stories": [
                    {"title": "Setup Base Architecture", "points": 13, "done": True},
                    {"title": "Implement Auth Flow", "points": 8, "done": True},
                    {"title": "Design Database Schema", "points": 5, "done": True},
                ]
            },
            {
                "name": "Sprint 2: User Experience",
                "start": today_date - timedelta(days=22),
                "end": today_date - timedelta(days=8),
                "status": SprintStatus.completed,
                "committed": 35,
                "stories": [
                    {"title": "User Profile Management", "points": 5, "done": True},
                    {"title": "Responsive Dashboard", "points": 8, "done": True},
                    {"title": "Rich Text Editor", "points": 13, "done": False}, # Unfinished
                    {"title": "Notification System", "points": 5, "done": True},
                ]
            },
            {
                "name": "Sprint 3: Data Visuals",
                "start": today_date - timedelta(days=7),
                "end": today_date + timedelta(days=7),
                "status": SprintStatus.active,
                "committed": 40,
                "stories": [
                    {"title": "Burndown Component", "points": 13, "done": True},
                    {"title": "Velocity Tracking", "points": 8, "done": True},
                    {"title": "Export to CSV", "points": 8, "done": False}, # In progress
                    {"title": "Mobile View Optimization", "points": 5, "done": False}, # To do
                ]
            }
        ]

        for cfg in sprint_configs:
            sprint = Sprint(
                project_id=project.id,
                name=cfg["name"],
                goal=f"Complete {cfg['name']} goals",
                start_date=cfg["start"],
                end_date=cfg["end"],
                status=cfg["status"],
                committed_points=cfg["committed"]
            )
            db.add(sprint)
            await db.flush()
            print(f"  Created {sprint.status.value} sprint: {sprint.name}")

            for s_cfg in cfg["stories"]:
                story = Story(
                    project_id=project.id,
                    sprint_id=sprint.id,
                    title=s_cfg["title"],
                    points=s_cfg["points"],
                    status="done" if s_cfg["done"] else "todo"
                )
                db.add(story)
                await db.flush()

                # Add tasks for the story
                num_tasks = 2
                for i in range(num_tasks):
                    task_status = "done" if s_cfg["done"] else ( "in_progress" if (sprint.status == SprintStatus.active and i == 0 and "In progress" in s_cfg.get("title", "")) else "todo" )
                    
                    if sprint.status == SprintStatus.active and not s_cfg["done"] and "CSV" in s_cfg["title"] and i == 0:
                        task_status = "in_progress"

                    comp_date = None
                    if task_status == "done":
                        # Random day within the sprint window
                        # For Sprint 3 (Active), we only complete tasks up to "yesterday"
                        limit = sprint_duration - 1
                        if sprint.status == SprintStatus.active:
                            days_passed = (date.today() - cfg["start"]).days
                            limit = max(1, days_passed)
                        
                        days_into_sprint = random.randint(1, limit)
                        comp_dt = datetime.combine(cfg["start"] + timedelta(days=days_into_sprint), datetime.min.time())
                        comp_date = comp_dt.replace(tzinfo=timezone.utc)

                    task = Task(
                        project_id=project.id,
                        story_id=story.id,
                        title=f"Task {i+1} for {story.title}",
                        status=task_status,
                        points=story.points // num_tasks,
                        completed_at=comp_date
                    )
                    db.add(task)
        
        await db.commit()
        print(f"\nSuccessfully seeded project '{project.name}'")
        print("You can now refresh the dashboard to see the charts.")

if __name__ == "__main__":
    asyncio.run(seed_historical_data())
