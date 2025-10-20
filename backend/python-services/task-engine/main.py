from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import json
import logging
import uuid
from pathlib import Path
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
import pytz

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VAL Task Engine Service", version="1.0.0")

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Task(BaseModel):
    id: str
    client_id: str
    title: str
    description: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    reminder_enabled: bool = False
    reminder_time: Optional[datetime] = None
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

class TaskCreate(BaseModel):
    client_id: str
    title: str
    description: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    reminder_enabled: bool = False
    reminder_time: Optional[datetime] = None
    tags: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    reminder_enabled: Optional[bool] = None
    reminder_time: Optional[datetime] = None
    tags: Optional[List[str]] = None

class ReminderRequest(BaseModel):
    task_id: str
    reminder_time: datetime
    message: Optional[str] = None
    recipients: List[EmailStr] = []

class TaskFilter(BaseModel):
    client_id: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee: Optional[str] = None
    due_before: Optional[datetime] = None
    due_after: Optional[datetime] = None
    tags: Optional[List[str]] = None

class MockNotificationService:
    """Mock notification service for demonstration"""

    async def send_email(self, to: List[str], subject: str, body: str):
        """Mock email sending"""
        logger.info(f"Sending email to {to}: {subject}")
        await asyncio.sleep(0.5)  # Simulate email sending
        logger.info(f"Email sent successfully to {len(to)} recipients")

    async def send_webhook(self, url: str, data: Dict[str, Any]):
        """Mock webhook notification"""
        logger.info(f"Sending webhook to {url}")
        await asyncio.sleep(0.3)  # Simulate webhook call
        logger.info("Webhook sent successfully")

    async def send_push_notification(self, user_id: str, title: str, message: str):
        """Mock push notification"""
        logger.info(f"Sending push notification to {user_id}: {title}")
        await asyncio.sleep(0.2)  # Simulate push notification
        logger.info("Push notification sent successfully")

class TaskManager:
    """Task management engine"""

    def __init__(self):
        self.tasks = {}  # task_id -> Task
        self.client_tasks = {}  # client_id -> [task_ids]
        self.scheduler = AsyncIOScheduler(timezone=pytz.UTC)
        self.notification_service = MockNotificationService()
        self.storage_dir = Path("task_engine")
        self.storage_dir.mkdir(exist_ok=True)
        self.reminders = {}  # task_id -> reminder_job_id

    async def start_scheduler(self):
        """Start the task scheduler"""
        self.scheduler.start()
        logger.info("Task scheduler started")

    async def shutdown_scheduler(self):
        """Shutdown the task scheduler"""
        self.scheduler.shutdown()
        logger.info("Task scheduler shutdown")

    async def create_task(self, task_data: TaskCreate) -> Task:
        """Create a new task"""
        task_id = str(uuid.uuid4())
        now = datetime.now()

        task = Task(
            id=task_id,
            client_id=task_data.client_id,
            title=task_data.title,
            description=task_data.description,
            assignee=task_data.assignee,
            due_date=task_data.due_date,
            priority=task_data.priority,
            reminder_enabled=task_data.reminder_enabled,
            reminder_time=task_data.reminder_time,
            tags=task_data.tags,
            created_at=now,
            updated_at=now
        )

        # Store task
        self.tasks[task_id] = task

        # Update client index
        if task_data.client_id not in self.client_tasks:
            self.client_tasks[task_data.client_id] = []
        self.client_tasks[task_data.client_id].append(task_id)

        # Schedule reminder if enabled
        if task.reminder_enabled and task.reminder_time:
            await self.schedule_reminder(task)

        # Schedule due date check
        if task.due_date:
            await self.schedule_due_date_check(task)

        logger.info(f"Created task {task_id}: {task.title}")
        await self.save_to_disk()
        return task

    async def update_task(self, task_id: str, update_data: TaskUpdate) -> Optional[Task]:
        """Update an existing task"""
        if task_id not in self.tasks:
            return None

        task = self.tasks[task_id]
        updated_fields = []

        # Update fields
        if update_data.title is not None:
            task.title = update_data.title
            updated_fields.append("title")
        if update_data.description is not None:
            task.description = update_data.description
            updated_fields.append("description")
        if update_data.assignee is not None:
            task.assignee = update_data.assignee
            updated_fields.append("assignee")
        if update_data.due_date is not None:
            # Cancel old due date check
            if task.due_date:
                self.scheduler.remove_job(f"due_check_{task_id}")
            task.due_date = update_data.due_date
            updated_fields.append("due_date")
            # Schedule new due date check
            if task.due_date:
                await self.schedule_due_date_check(task)
        if update_data.priority is not None:
            task.priority = update_data.priority
            updated_fields.append("priority")
        if update_data.status is not None:
            old_status = task.status
            task.status = update_data.status
            updated_fields.append("status")
            # Handle status change
            if update_data.status == TaskStatus.COMPLETED and old_status != TaskStatus.COMPLETED:
                task.completed_at = datetime.now()
                # Cancel due date check
                if f"due_check_{task_id}" in [job.id for job in self.scheduler.get_jobs()]:
                    self.scheduler.remove_job(f"due_check_{task_id}")
        if update_data.reminder_enabled is not None:
            # Cancel old reminder
            if task_id in self.reminders:
                self.scheduler.remove_job(self.reminders[task_id])
                del self.reminders[task_id]
            task.reminder_enabled = update_data.reminder_enabled
            updated_fields.append("reminder_enabled")
            # Schedule new reminder
            if update_data.reminder_enabled and task.reminder_time:
                await self.schedule_reminder(task)
        if update_data.reminder_time is not None:
            # Cancel old reminder
            if task_id in self.reminders:
                self.scheduler.remove_job(self.reminders[task_id])
            task.reminder_time = update_data.reminder_time
            updated_fields.append("reminder_time")
            # Schedule new reminder
            if task.reminder_enabled:
                await self.schedule_reminder(task)
        if update_data.tags is not None:
            task.tags = update_data.tags
            updated_fields.append("tags")

        task.updated_at = datetime.now()

        logger.info(f"Updated task {task_id}: {', '.join(updated_fields)}")
        await self.save_to_disk()
        return task

    async def delete_task(self, task_id: str) -> bool:
        """Delete a task"""
        if task_id not in self.tasks:
            return False

        task = self.tasks[task_id]

        # Remove from client index
        if task.client_id in self.client_tasks:
            self.client_tasks[task.client_id] = [
                tid for tid in self.client_tasks[task.client_id]
                if tid != task_id
            ]

        # Cancel scheduled jobs
        if task_id in self.reminders:
            self.scheduler.remove_job(self.reminders[task_id])
            del self.reminders[task_id]

        due_check_job_id = f"due_check_{task_id}"
        if due_check_job_id in [job.id for job in self.scheduler.get_jobs()]:
            self.scheduler.remove_job(due_check_job_id)

        # Remove task
        del self.tasks[task_id]

        logger.info(f"Deleted task {task_id}")
        await self.save_to_disk()
        return True

    async def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID"""
        return self.tasks.get(task_id)

    async def get_tasks(self, filters: Optional[TaskFilter] = None) -> List[Task]:
        """Get tasks with optional filters"""
        tasks = list(self.tasks.values())

        if filters:
            if filters.client_id:
                tasks = [t for t in tasks if t.client_id == filters.client_id]
            if filters.status:
                tasks = [t for t in tasks if t.status == filters.status]
            if filters.priority:
                tasks = [t for t in tasks if t.priority == filters.priority]
            if filters.assignee:
                tasks = [t for t in tasks if t.assignee == filters.assignee]
            if filters.due_before:
                tasks = [t for t in tasks if t.due_date and t.due_date <= filters.due_before]
            if filters.due_after:
                tasks = [t for t in tasks if t.due_date and t.due_date >= filters.due_after]
            if filters.tags:
                tasks = [t for t in tasks if any(tag in t.tags for tag in filters.tags)]

        # Sort by created date (newest first)
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks

    async def schedule_reminder(self, task: Task):
        """Schedule a reminder for a task"""
        if not task.reminder_time:
            return

        job_id = f"reminder_{task.id}"
        self.reminders[task.id] = job_id

        self.scheduler.add_job(
            self.send_reminder,
            trigger=DateTrigger(run_date=task.reminder_time),
            args=[task.id],
            id=job_id,
            replace_existing=True
        )

        logger.info(f"Scheduled reminder for task {task.id} at {task.reminder_time}")

    async def schedule_due_date_check(self, task: Task):
        """Schedule a due date check"""
        if not task.due_date:
            return

        job_id = f"due_check_{task.id}"
        check_time = task.due_date + timedelta(minutes=5)  # Check 5 minutes after due

        self.scheduler.add_job(
            self.check_overdue_task,
            trigger=DateTrigger(run_date=check_time),
            args=[task.id],
            id=job_id,
            replace_existing=True
        )

        logger.info(f"Scheduled due date check for task {task.id} at {check_time}")

    async def send_reminder(self, task_id: str):
        """Send reminder notification"""
        task = await self.get_task(task_id)
        if not task or task.status == TaskStatus.COMPLETED:
            return

        subject = f"Task Reminder: {task.title}"
        message = f"This is a reminder for the task: {task.title}"
        if task.description:
            message += f"\n\nDescription: {task.description}"
        if task.due_date:
            message += f"\n\nDue: {task.due_date.strftime('%Y-%m-%d %H:%M')}"
        if task.assignee:
            message += f"\n\nAssigned to: {task.assignee}"

        # Send notification (mock)
        await self.notification_service.send_webhook(
            "http://localhost:3001/api/notifications",
            {
                "type": "task_reminder",
                "task_id": task_id,
                "title": subject,
                "message": message,
                "client_id": task.client_id
            }
        )

        logger.info(f"Sent reminder for task {task_id}")

    async def check_overdue_task(self, task_id: str):
        """Check if task is overdue and update status"""
        task = await self.get_task(task_id)
        if not task or task.status == TaskStatus.COMPLETED:
            return

        if task.due_date and task.due_date < datetime.now():
            await self.update_task(task_id, TaskUpdate(status=TaskStatus.OVERDUE))

            # Send overdue notification
            subject = f"Task Overdue: {task.title}"
            message = f"The task '{task.title}' is now overdue."
            if task.assignee:
                message += f" Please follow up with {task.assignee}."

            await self.notification_service.send_webhook(
                "http://localhost:3001/api/notifications",
                {
                    "type": "task_overdue",
                    "task_id": task_id,
                    "title": subject,
                    "message": message,
                    "client_id": task.client_id
                }
            )

            logger.info(f"Marked task {task_id} as overdue")

    async def get_task_statistics(self, client_id: Optional[str] = None) -> Dict[str, Any]:
        """Get task statistics"""
        tasks = await self.get_tasks(TaskFilter(client_id=client_id) if client_id else None)

        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.status == TaskStatus.COMPLETED])
        pending_tasks = len([t for t in tasks if t.status == TaskStatus.PENDING])
        overdue_tasks = len([t for t in tasks if t.status == TaskStatus.OVERDUE])

        priority_breakdown = {
            priority.value: len([t for t in tasks if t.priority == priority])
            for priority in TaskPriority
        }

        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "overdue_tasks": overdue_tasks,
            "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
            "priority_breakdown": priority_breakdown
        }

    async def save_to_disk(self):
        """Save tasks to disk"""
        try:
            data = {
                "tasks": {k: v.dict() for k, v in self.tasks.items()},
                "client_tasks": self.client_tasks
            }

            with open(self.storage_dir / "tasks.json", "w") as f:
                json.dump(data, f, indent=2, default=str)

            logger.debug("Tasks saved to disk")
        except Exception as e:
            logger.error(f"Failed to save tasks: {str(e)}")

    async def load_from_disk(self):
        """Load tasks from disk"""
        try:
            file_path = self.storage_dir / "tasks.json"
            if file_path.exists():
                with open(file_path, "r") as f:
                    data = json.load(f)

                self.tasks = {
                    k: Task(**v) for k, v in data["tasks"].items()
                }
                self.client_tasks = data.get("client_tasks", {})

                # Reschedule reminders and due date checks
                for task in self.tasks.values():
                    if task.reminder_enabled and task.reminder_time and task.reminder_time > datetime.now():
                        await self.schedule_reminder(task)
                    if task.due_date and task.due_date > datetime.now() and task.status != TaskStatus.COMPLETED:
                        await self.schedule_due_date_check(task)

                logger.info("Tasks loaded from disk")
        except Exception as e:
            logger.error(f"Failed to load tasks: {str(e)}")

task_manager = TaskManager()

# Sample data
async def initialize_sample_data():
    """Initialize with sample tasks"""
    sample_tasks = [
        TaskCreate(
            client_id="acme-corp",
            title="Prepare project proposal draft",
            description="Create comprehensive proposal for Phase 1 implementation including timeline, budget, and deliverables",
            assignee="John Smith",
            due_date=datetime.now() + timedelta(days=5),
            priority=TaskPriority.HIGH,
            reminder_enabled=True,
            reminder_time=datetime.now() + timedelta(days=1),
            tags=["proposal", "phase-1", "high-priority"]
        ),
        TaskCreate(
            client_id="acme-corp",
            title="Review technical requirements document",
            description="Go through technical specifications and identify potential challenges and dependencies",
            assignee="Sarah Johnson",
            due_date=datetime.now() + timedelta(days=3),
            priority=TaskPriority.MEDIUM,
            reminder_enabled=True,
            reminder_time=datetime.now() + timedelta(hours=12),
            tags=["technical", "requirements"]
        ),
        TaskCreate(
            client_id="acme-corp",
            title="Schedule follow-up meeting with stakeholders",
            description="Arrange demo session with key stakeholders to present initial findings",
            assignee="Mike Chen",
            due_date=datetime.now() + timedelta(days=7),
            priority=TaskPriority.LOW,
            reminder_enabled=False,
            tags=["meeting", "stakeholders", "demo"]
        ),
        TaskCreate(
            client_id="global-tech",
            title="Research cloud migration strategies",
            description="Investigate best practices for migrating from on-premise to cloud infrastructure",
            assignee="Emily Zhang",
            due_date=datetime.now() + timedelta(days=10),
            priority=TaskPriority.MEDIUM,
            reminder_enabled=True,
            reminder_time=datetime.now() + timedelta(days=2),
            tags=["research", "cloud", "migration"]
        )
    ]

    for task_data in sample_tasks:
        await task_manager.create_task(task_data)

    logger.info("Sample tasks initialized")

@app.on_event("startup")
async def startup_event():
    """Initialize the service"""
    await task_manager.load_from_disk()
    await task_manager.start_scheduler()
    await initialize_sample_data()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await task_manager.save_to_disk()
    await task_manager.shutdown_scheduler()

# API Endpoints
@app.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate):
    """Create a new task"""
    return await task_manager.create_task(task_data)

@app.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get a task by ID"""
    task = await task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, update_data: TaskUpdate):
    """Update a task"""
    task = await task_manager.update_task(task_id, update_data)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    success = await task_manager.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "message": "Task deleted successfully"}

@app.get("/tasks", response_model=List[Task])
async def get_tasks(
    client_id: Optional[str] = None,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    assignee: Optional[str] = None
):
    """Get tasks with optional filters"""
    filters = TaskFilter(
        client_id=client_id,
        status=status,
        priority=priority,
        assignee=assignee
    )
    return await task_manager.get_tasks(filters)

@app.get("/tasks/{client_id}/statistics")
async def get_task_statistics(client_id: str):
    """Get task statistics for a client"""
    return await task_manager.get_task_statistics(client_id)

@app.post("/tasks/{task_id}/reminders")
async def set_reminder(task_id: str, reminder_request: ReminderRequest):
    """Set a reminder for a task"""
    task = await task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update task with reminder
    update_data = TaskUpdate(
        reminder_enabled=True,
        reminder_time=reminder_request.reminder_time
    )
    await task_manager.update_task(task_id, update_data)

    return {"success": True, "message": "Reminder set successfully"}

@app.delete("/tasks/{task_id}/reminders")
async def cancel_reminder(task_id: str):
    """Cancel a reminder for a task"""
    task = await task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update task to disable reminder
    update_data = TaskUpdate(
        reminder_enabled=False,
        reminder_time=None
    )
    await task_manager.update_task(task_id, update_data)

    return {"success": True, "message": "Reminder cancelled successfully"}

@app.get("/status")
async def get_status():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "task-engine",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "total_tasks": len(task_manager.tasks),
        "active_reminders": len(task_manager.reminders),
        "scheduled_jobs": len(task_manager.scheduler.get_jobs())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)