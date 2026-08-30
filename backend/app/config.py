"""Application configuration."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.environ.get("REHAB_DB_PATH", str(BASE_DIR / "rehab.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

SECRET_KEY = os.environ.get("REHAB_SECRET_KEY", "change-me-in-production-9f2c1e")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h, fine for a demo system

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Role constants
ROLE_ADMIN = "admin"
ROLE_THERAPIST = "therapist"
ROLE_PATIENT = "patient"

# Assessment metric keys (canonical, used by dashboard & prediction)
METRICS = {
    "pain_score": "疼痛评分 (0-10)",
    "range_of_motion": "关节活动度 (deg)",
    "muscle_strength": "肌力评分 (0-5)",
    "balance_score": "平衡能力 (Berg 0-56)",
    "walking_distance": "步行距离 (m / 6MWT)",
    "adl_score": "日常生活能力 (Barthel 0-100)",
    "training_completion": "训练完成率 (%)",
}