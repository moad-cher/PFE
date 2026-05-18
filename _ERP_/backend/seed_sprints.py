import asyncio
import os
import random
import sys

# Add the current directory to sys.path so we can import the app
sys.path.append(os.getcwd())

from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.projects.models import (
    Comment,
    PriorityEnum,
    Project,
    ProjectConfig,
    RewardLog,
    Sprint,
    SprintStatus,
    Story,
    Task,
    TaskStatus,
)
from app.users.models import RoleEnum, User


STORY_TITLES = [
    "Access control cleanup",
    "Risk register workflow",
    "Timesheet export",
    "Team capacity planning",
    "Project health dashboard",
    "Hiring pipeline sync",
    "Interview scheduling flow",
    "Task template library",
    "Email notification retries",
    "Calendar integration",
    "Budget burn tracking",
    "Vendor onboarding",
    "SLA alerts",
    "Cross-project search",
    "File attachments audit",
    "Story grooming checklist",
    "API pagination polish",
    "Sprint review report",
    "Mobile backlog tweaks",
    "Performance profiling",
    "Messaging latency fix",
    "Org chart import",
    "Profile permissions",
    "Activity feed filters",
    "Webhooks for tasks",
    "Dependency mapping",
    "Internal audit log",
    "Resource allocation view",
    "KPI definitions",
    "Status color refresh",
]

STORY_DESC_TEMPLATES = [
    "Deliver {topic} with clear ownership and audit trail.",
    "Stabilize {topic} to reduce manual follow-ups.",
    "Improve {topic} for faster weekly reporting.",
    "Finalize {topic} so the team can adopt it this sprint.",
]

TASK_TITLES = [
    "Draft requirements",
    "Implement core flow",
    "Add validation and edge cases",
    "QA pass and fixes",
    "Update docs and handoff",
]

BLOCKER_REASONS = [
    "Waiting on product sign-off",
    "Dependency API still unstable",
    "Design review pending",
    "Missing test data from HR",
]


def pick_manager(users: list[User]) -> User:
    manager_candidates = [
        u for u in users if u.role in {RoleEnum.project_manager, RoleEnum.admin}
    ]
    return random.choice(manager_candidates or users)


def pick_members(users: list[User], manager: User) -> list[User]:
    if len(users) <= 3:
        members = list(users)
    else:
        size = min(len(users), random.randint(4, 8))
        members = random.sample(users, k=size)

    if manager not in members:
        members[0] = manager
    return members


def pick_priority() -> PriorityEnum:
    priorities = [PriorityEnum.low, PriorityEnum.medium, PriorityEnum.high, PriorityEnum.urgent]
    weights = [0.15, 0.5, 0.25, 0.1]
    return random.choices(priorities, weights=weights, k=1)[0]


def random_time_on(date_value: date) -> datetime:
    hour = random.randint(9, 18)
    minute = random.choice([0, 15, 30, 45])
    dt = datetime.combine(date_value, datetime.min.time())
    return dt.replace(hour=hour, minute=minute, tzinfo=timezone.utc)


def random_day_between(start: date, end: date) -> date:
    if end <= start:
        return start
    delta_days = (end - start).days
    return start + timedelta(days=random.randint(0, delta_days))

async def seed_historical_data():
    async with AsyncSessionLocal() as db:
        print("Starting seed process...")
        
        # 1. Load users
        res = await db.execute(select(User))
        users = res.scalars().all()
        if not users:
            print("No users found. Please register a user first via the UI or another script.")
            return

        manager = pick_manager(users)
        members = pick_members(users, manager)

        # 2. Create Project
        project_name = f"ERP Delivery Hub {random.randint(100, 999)}"
        today_date = date.today()
        start_date = today_date - timedelta(days=45)
        deadline = today_date + timedelta(days=30)
        project = Project(
            name=project_name,
            description=(
                "Active ERP delivery project with ongoing sprints, hiring pipeline work, "
                "and operational dashboard improvements."
            ),
            manager_id=manager.id,
            start_date=start_date,
            deadline=deadline,
            members=members,
        )
        db.add(project)
        await db.flush()
        print(f"Created project: {project_name}")

        db.add(
            ProjectConfig(
                project_id=project.id,
                points_on_time=random.randint(8, 12),
                points_late=random.randint(2, 5),
                notify_deadline_days=random.randint(2, 4),
                sprint_duration_days=14,
            )
        )

        # 3. Ensure Statuses
        statuses = [
            TaskStatus(project_id=project.id, name="To do", slug="todo", order=0, color="#e74c3c"),
            TaskStatus(project_id=project.id, name="In progress", slug="in_progress", order=1, color="#f39c12"),
            TaskStatus(project_id=project.id, name="Review", slug="review", order=2, color="#3498db"),
            TaskStatus(project_id=project.id, name="Done", slug="done", order=3, color="#2ecc71"),
        ]
        db.add_all(statuses)
        
        # 4. Create sprints (completed, active, draft)
        sprint_duration = 14
        active_start = today_date - timedelta(days=random.randint(5, 9))
        active_end = active_start + timedelta(days=sprint_duration - 1)

        sprint_configs = [
            {
                "name": "Sprint 1: Stabilization",
                "start": active_start - timedelta(days=2 * sprint_duration),
                "end": active_start - timedelta(days=sprint_duration + 1),
                "status": SprintStatus.completed,
            },
            {
                "name": "Sprint 2: Flow Improvements",
                "start": active_start - timedelta(days=sprint_duration),
                "end": active_start - timedelta(days=1),
                "status": SprintStatus.completed,
            },
            {
                "name": "Sprint 3: Operational Visibility",
                "start": active_start,
                "end": active_end,
                "status": SprintStatus.active,
            },
            {
                "name": "Sprint 4: Pipeline Hardening",
                "start": active_end + timedelta(days=1),
                "end": active_end + timedelta(days=sprint_duration),
                "status": SprintStatus.draft,
            },
        ]

        used_titles: set[str] = set()

        for cfg in sprint_configs:
            num_stories = random.randint(4, 7) if cfg["status"] != SprintStatus.draft else random.randint(3, 5)
            sprint = Sprint(
                project_id=project.id,
                name=cfg["name"],
                goal=f"Deliver {cfg['name'].split(':', maxsplit=1)[-1].strip().lower()} improvements",
                start_date=cfg["start"],
                end_date=cfg["end"],
                status=cfg["status"],
                committed_points=random.randint(28, 45),
            )
            db.add(sprint)
            await db.flush()
            print(f"  Created {sprint.status.value} sprint: {sprint.name}")

            for _ in range(num_stories):
                title = random.choice(STORY_TITLES)
                if title in used_titles:
                    title = f"{title} v{random.randint(2, 4)}"
                used_titles.add(title)

                story_points = random.choices([3, 5, 8, 13], weights=[2, 3, 3, 2], k=1)[0]
                if sprint.status == SprintStatus.completed:
                    story_target = "done"
                elif sprint.status == SprintStatus.active:
                    roll = random.random()
                    story_target = "done" if roll < 0.35 else "in_progress" if roll < 0.75 else "todo"
                else:
                    story_target = "todo"

                story = Story(
                    project_id=project.id,
                    sprint_id=sprint.id,
                    title=title,
                    description=random.choice(STORY_DESC_TEMPLATES).format(topic=title.lower()),
                    points=story_points,
                    status=story_target,
                )
                db.add(story)
                await db.flush()

                # Add tasks for the story
                num_tasks = random.randint(2, 5)
                task_points = max(1, story_points // num_tasks)
                done_cutoff = min(cfg["end"], today_date - timedelta(days=1))

                status_slots: list[str] = []
                if story_target == "done":
                    status_slots = ["done"] * num_tasks
                elif story_target == "in_progress":
                    status_slots = ["done"] + ["review"] + ["in_progress"]
                    status_slots += ["todo"] * max(0, num_tasks - len(status_slots))
                else:
                    status_slots = ["todo"] * num_tasks
                random.shuffle(status_slots)

                for i in range(num_tasks):
                    task_status = status_slots[i]
                    task_title = f"{TASK_TITLES[i % len(TASK_TITLES)]}: {story.title}"
                    completed_at = None
                    start_time = None
                    end_time = None
                    if task_status == "done":
                        done_day = random_day_between(cfg["start"], done_cutoff)
                        completed_at = random_time_on(done_day)
                        start_time = completed_at - timedelta(hours=random.randint(2, 6))
                        end_time = completed_at
                    elif task_status in {"review", "in_progress"}:
                        start_day = random_day_between(cfg["start"], today_date)
                        start_time = random_time_on(start_day)

                    is_blocked = False
                    blocker_reason = None
                    if task_status in {"todo", "in_progress"} and random.random() < 0.12:
                        is_blocked = True
                        blocker_reason = random.choice(BLOCKER_REASONS)

                    assignees = random.sample(members, k=min(len(members), random.randint(1, 2)))

                    task = Task(
                        project_id=project.id,
                        story_id=story.id,
                        title=task_title,
                        status=task_status,
                        priority=pick_priority(),
                        points=task_points,
                        start_time=start_time,
                        end_time=end_time,
                        completed_at=completed_at,
                        is_blocked=is_blocked,
                        blocker_reason=blocker_reason,
                        assigned_to=assignees,
                    )
                    db.add(task)
                    await db.flush()

                    if task_status == "done" and assignees:
                        db.add(
                            RewardLog(
                                user_id=assignees[0].id,
                                task_id=task.id,
                                points=random.randint(3, 12),
                            )
                        )

                    if random.random() < 0.35 and assignees:
                        db.add(
                            Comment(
                                task_id=task.id,
                                author_id=random.choice(assignees).id,
                                content=random.choice(
                                    [
                                        "Waiting on review feedback.",
                                        "Pushed a fix for edge cases.",
                                        "Aligning with HR on requirements.",
                                        "Will follow up after standup.",
                                    ]
                                ),
                            )
                        )
        
        await db.commit()
        print(f"\nSuccessfully seeded project '{project.name}'")
        print("You can now refresh the dashboard to see the charts.")

if __name__ == "__main__":
    asyncio.run(seed_historical_data())
