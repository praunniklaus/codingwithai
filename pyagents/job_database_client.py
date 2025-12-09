"""PostgreSQL database client for Job Application Assistant agents.

This client connects directly to PostgreSQL (not in-memory) and provides
all database operations needed by the agents.
"""

import json
from typing import Any, Dict, List, Optional

try:
    import psycopg
    from psycopg import AsyncConnection
    from psycopg.rows import dict_row
except ImportError:
    psycopg = None
    AsyncConnection = None
    dict_row = None


class JobDatabaseClient:
    """Database client for job application operations."""

    def __init__(self, database_url: Optional[str]):
        self.database_url = database_url
        self._conn = None
        self._connected = False

    async def connect(self) -> None:
        """Connect to PostgreSQL database."""
        if not psycopg or not AsyncConnection:
            raise ImportError("psycopg library not installed. Run: pip install psycopg[binary]")
        
        if not self._connected:
            self._conn = await AsyncConnection.connect(self.database_url)
            self._connected = True

    async def disconnect(self) -> None:
        """Disconnect from database."""
        if self._conn:
            await self._conn.close()
            self._conn = None
            self._connected = False

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile with skills, experience, and education."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            # Get profile
            await cur.execute(
                "SELECT * FROM user_profiles WHERE user_id = %s",
                (user_id,)
            )
            profile = await cur.fetchone()
            if not profile:
                return None

            # Get related data
            await cur.execute(
                "SELECT * FROM user_skills WHERE user_id = %s",
                (user_id,)
            )
            skills = await cur.fetchall()

            await cur.execute(
                "SELECT * FROM user_experience WHERE user_id = %s ORDER BY start_date DESC",
                (user_id,)
            )
            experience = await cur.fetchall()

            await cur.execute(
                "SELECT * FROM user_education WHERE user_id = %s ORDER BY start_date DESC",
                (user_id,)
            )
            education = await cur.fetchall()

            return {
                **dict(profile),
                "skills": [dict(s) for s in skills],
                "experience": [dict(e) for e in experience],
                "education": [dict(e) for e in education],
            }

    async def get_job_listings(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all active job listings."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT * FROM job_listings WHERE is_active = true ORDER BY posted_date DESC LIMIT %s",
                (limit,)
            )
            return [dict(row) for row in await cur.fetchall()]

    async def get_job_by_id(self, job_id: int) -> Optional[Dict[str, Any]]:
        """Get job by ID."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            await cur.execute("SELECT * FROM job_listings WHERE id = %s", (job_id,))
            result = await cur.fetchone()
            return dict(result) if result else None

    async def add_recommendation(
        self, user_id: str, job_id: int, match_score: int, reasoning: str
    ) -> Dict[str, Any]:
        """Add job recommendation."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO job_recommendations (user_id, job_id, match_score, reasoning, status)
                VALUES (%s, %s, %s, %s, 'pending')
                ON CONFLICT (user_id, job_id)
                DO UPDATE SET match_score = %s, reasoning = %s, updated_at = CURRENT_TIMESTAMP
                RETURNING *
                """,
                (user_id, job_id, match_score, reasoning, match_score, reasoning),
            )
            result = await cur.fetchone()
            await self._conn.commit()
            return dict(result)

    async def get_applications(
        self, user_id: str, status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get applications for a user, optionally filtered by status."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            if status:
                await cur.execute(
                    """
                    SELECT a.*, j.title as job_title, j.company as job_company
                    FROM applications a
                    JOIN job_listings j ON a.job_id = j.id
                    WHERE a.user_id = %s AND a.status = %s
                    ORDER BY a.created_at DESC
                    """,
                    (user_id, status),
                )
            else:
                await cur.execute(
                    """
                    SELECT a.*, j.title as job_title, j.company as job_company
                    FROM applications a
                    JOIN job_listings j ON a.job_id = j.id
                    WHERE a.user_id = %s
                    ORDER BY a.created_at DESC
                    """,
                    (user_id,),
                )
            return [dict(row) for row in await cur.fetchall()]

    async def create_application(
        self,
        user_id: str,
        job_id: int,
        cv_id: Optional[int] = None,
        cover_letter_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Create a new application."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO applications (user_id, job_id, cv_id, cover_letter_id, status)
                VALUES (%s, %s, %s, %s, 'draft')
                RETURNING *
                """,
                (user_id, job_id, cv_id, cover_letter_id),
            )
            result = await cur.fetchone()
            app_id = result["id"]

            # Create initial event
            await cur.execute(
                """
                INSERT INTO application_events (application_id, event_type, notes)
                VALUES (%s, 'created', 'Application created')
                """,
                (app_id,),
            )
            await self._conn.commit()
            return dict(result)

    async def update_application_status(
        self, application_id: int, status: str, notes: Optional[str] = None
    ) -> None:
        """Update application status."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE applications 
                SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (status, application_id),
            )
            await cur.execute(
                """
                INSERT INTO application_events (application_id, event_type, notes)
                VALUES (%s, %s, %s)
                """,
                (application_id, f"status_{status}", notes or f"Status changed to {status}"),
            )
            await self._conn.commit()

    async def save_cv(
        self, user_id: str, job_id: int, content: str, format: str = "markdown"
    ) -> Dict[str, Any]:
        """Save generated CV."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            # Get next version
            await cur.execute(
                """
                SELECT COALESCE(MAX(version), 0) + 1 as next_version
                FROM generated_cvs
                WHERE user_id = %s AND job_id = %s
                """,
                (user_id, job_id),
            )
            version_result = await cur.fetchone()
            version = version_result["next_version"] if version_result else 1

            await cur.execute(
                """
                INSERT INTO generated_cvs (user_id, job_id, content, format, version)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (user_id, job_id, content, format, version),
            )
            result = await cur.fetchone()
            await self._conn.commit()
            return dict(result)

    async def save_cover_letter(
        self, user_id: str, job_id: int, content: str, tone: str = "professional"
    ) -> Dict[str, Any]:
        """Save cover letter."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            # Get next version
            await cur.execute(
                """
                SELECT COALESCE(MAX(version), 0) + 1 as next_version
                FROM cover_letters
                WHERE user_id = %s AND job_id = %s
                """,
                (user_id, job_id),
            )
            version_result = await cur.fetchone()
            version = version_result["next_version"] if version_result else 1

            await cur.execute(
                """
                INSERT INTO cover_letters (user_id, job_id, content, tone, version)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (user_id, job_id, content, tone, version),
            )
            result = await cur.fetchone()
            await self._conn.commit()
            return dict(result)

    async def add_insight(
        self,
        agent_id: str,
        user_id: str,
        insight_type: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Add agent insight."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO agent_insights (agent_id, user_id, insight_type, description, metadata)
                VALUES (%s, %s, %s, %s, %s::jsonb)
                RETURNING *
                """,
                (agent_id, user_id, insight_type, description, json.dumps(metadata) if metadata else None),
            )
            result = await cur.fetchone()
            await self._conn.commit()
            return dict(result)

    async def get_application_events(self, application_id: int) -> List[Dict[str, Any]]:
        """Get events for an application."""
        await self.connect()
        if not self._conn:
            raise RuntimeError("Database not connected")

        async with self._conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT * FROM application_events
                WHERE application_id = %s
                ORDER BY event_date DESC
                """,
                (application_id,),
            )
            return [dict(row) for row in await cur.fetchall()]

