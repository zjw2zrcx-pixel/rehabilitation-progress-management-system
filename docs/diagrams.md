# 系统架构图 & 数据库 ER 图

> Mermaid 图可直接在 GitHub / VS Code (Markdown Preview Mermaid Support) 中渲染。
> 独立 SVG/PNG：可在 https://mermaid.live 粘贴源码导出。

---

## 一、系统架构图

```mermaid
flowchart TB
    subgraph 用户层["👥 用户层"]
        A1[管理员 admin] -->|全局管理| W
        A2[治疗师 therapist] -->|负责患者| W
        A3[患者 patient] -->|本人档案/打卡| W
    end

    subgraph 前端["🖥️ React SPA :3000"]
        W{{"HTTP / JSON<br/>JWT Bearer"}}
        W --> B1[登录/注册页]
        W --> B2[Dashboard 概览]
        W --> B3[患者列表/建档]
        W --> B4[患者详情 6 Tab]
        W --> B5[我的进展]
        W --> B6[用户管理<br/>admin]
        B1 & B2 & B3 & B4 & B5 & B6 --> Ax[Axios 拦截器<br/>注入 token / 401 登出]
    end

    subgraph 后端["⚙️ FastAPI 8000 /api"]
        Ax --> C1[Auth<br/>JWT + bcrypt]
        Ax --> C2[Users]
        Ax --> C3[Patients<br/>行级隔离]
        Ax --> C4[Plans/Exercises]
        Ax --> C5[Training Logs]
        Ax --> C6[Assessments<br/>trends/insights]
        Ax --> C7[Predictions]
        Ax --> C8[Export CSV]
        Ax --> C9[Stats]
        C1 --> P[权限校验<br/>角色 RBAC<br/>数据归属]
        C3 & C4 & C5 & C6 & C7 --> P
        P --> M{{业务逻辑}}
        M --> S1[趋势序列聚合]
        M --> S2[风险规则引擎<br/>连续下降/依从性]
        M --> S3[sklearn<br/>LinearRegression 预测]
    end

    subgraph 数据层["🗄️ SQLite"]
        M --> ORM[SQLAlchemy 2.0 ORM]
        ORM --> DB[(rehab.db<br/>8 张表)]
    end

    subgraph 质量["🧪 质量保障"]
        E2E[refdata/e2e_test.py<br/>23 项断言] --> Ax
        DOCS[Swagger /docs] --> C1
    end
```

**关键流程（预测）**：`前端预测页 → POST /predictions/patient/{id}?weeks_ahead=4 → 读取该患者评估序列 → 每个指标按周次拟合 LinearRegression → 外推 + 临床上下限裁剪 + 风险分级 → 落库并返回 → 前端渲染预测表/风险徽章`。

---

## 二、数据库 ER 图（8 张表）

```mermaid
erDiagram
    USERS {
        int id PK
        string username UK "登录名"
        string password_hash "bcrypt"
        string role "admin|therapist|patient"
        string display_name
        bool is_active
        datetime created_at
    }

    THERAPISTS {
        int id PK
        int user_id FK "1:1 用户"
        string specialty "科室/专长"
        int years_experience
    }

    PATIENTS {
        int id PK
        int user_id FK "患者账号，可空"
        int therapist_id FK "负责治疗师"
        string name
        int age
        string gender "male|female"
        string diagnosis
        string treatment_stage "早期|恢复期|中期|后期"
        string long_term_goal "长期功能性目标"
        string short_term_goal "短期功能性目标"
        string initial_assessment
        date admission_date
    }

    REHAB_PLANS {
        int id PK
        int patient_id FK
        int created_by FK "编制治疗师"
        string title
        date start_date
        date end_date
        int frequency_per_week
        int duration_minutes
        string status "active|paused|completed"
    }

    EXERCISES {
        int id PK
        int plan_id FK
        string name "动作名称"
        int sets
        int reps
        int duration_min
        string target_metric "训练目标指标"
    }

    TRAINING_LOGS {
        int id PK
        int patient_id FK
        int plan_id FK
        int exercise_id FK
        date log_date
        bool completed
        int sets_done
        int reps_done
        int duration_min
        int week_number
        string note
    }

    ASSESSMENT_RECORDS {
        int id PK
        int patient_id FK
        int assessor_id FK "评估人 user"
        date assessment_date
        string phase "第N周"
        float pain_score "0-10"
        float range_of_motion "0-160°"
        float muscle_strength "0-5"
        float balance_score "0-56 Berg"
        float walking_distance "米 6MWT"
        float adl_score "0-100 Barthel"
        float training_completion "0-100%"
    }

    PROGRESS_PREDICTIONS {
        int id PK
        int patient_id FK
        date predicted_at "预测运行时间"
        date target_date "预测目标日"
        string metric
        float current_value
        float predicted_value
        float slope_per_week
        float r2_score
        string risk_level "low|medium|high"
        text message
    }

    USERS ||--o| THERAPISTS : "拥有"
    USERS ||--o| PATIENTS : "绑定患者档案"
    THERAPISTS ||--o{ PATIENTS : "负责"
    PATIENTS ||--o{ REHAB_PLANS : "制定"
    USERS ||--o{ REHAB_PLANS : "创建"
    REHAB_PLANS ||--o{ EXERCISES : "包含"
    PATIENTS ||--o{ TRAINING_LOGS : "打卡"
    REHAB_PLANS ||--o{ TRAINING_LOGS : ""
    EXERCISES ||--o{ TRAINING_LOGS : ""
    PATIENTS ||--o{ ASSESSMENT_RECORDS : "评估"
    USERS ||--o{ ASSESSMENT_RECORDS : "评测"
    PATIENTS ||--o{ PROGRESS_PREDICTIONS : "预测"
```

---

## 三、指标定义（临床参考值）

| 指标 | 字段 | 范围 | 方向 | 临床依据 |
|---|---|---|---|---|
| 疼痛评分 | `pain_score` | 0–10 **整数** | 越低越好 | NRS 数字评分法（0 无痛，10 剧痛）；变化 ≥2 分（MCID）才有统计学意义 |
| 关节活动度 | `range_of_motion` | 0–180° **整数** | 越高越好 | 测角器读数；膝关节屈曲参考目标 ≥120° |
| 肌力 | `muscle_strength` | 0–5 **整数** | 越高越好 | MMT 徒手肌力分级 |
| 平衡 | `balance_score` | 0–56 **整数** | 越高越好 | Berg 平衡量表（≥45 低跌倒风险） |
| 步行距离 | `walking_distance` | 米 **整数** | 越高越好 | 6 分钟步行试验（健康老人 400–700m）；**TKA 等术后早期（前约 4 周）不测**，可留空 |
| 日常生活 | `adl_score` | 0–100 **整数** | 越高越好 | Barthel 巴氏指数（100 = 完全自理） |
| 完成率 | `training_completion` | 0–100% | 越高越好 | **自动**：当周完成打卡数 ÷ 当周总打卡数 ×100%（自然周年一~周日，无打卡为空） |
| 综合恢复指数 | `composite_score` | 0–100 | 越高越好 | 各已记录指标按量表范围归一化（疼痛反向）取平均 ×100，后端计算 |

> 7 项评估指标均为整数量表（Schema 强制，小数提交 422）；数据库 Integer 列。趋势图/下拉菜单均标注量表名。

> 参考规则来自世卫组织/康复循证文献（详见 `refdata/` 下抓取的维基百科临床量表资料）。