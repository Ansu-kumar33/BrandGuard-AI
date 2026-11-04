from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Name cannot be blank.")
        return normalized

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class AuthenticatedUserRead(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    created_at: datetime


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"]
    expires_in: int
    user: AuthenticatedUserRead


class BrandProfileFields(BaseModel):
    brand_name: str = Field(min_length=1, max_length=200)
    tone: str = Field(min_length=1, max_length=500)
    target_audience: str = Field(min_length=1, max_length=500)
    preferred_words: list[str] = Field(default_factory=list, max_length=100)
    restricted_words: list[str] = Field(default_factory=list, max_length=100)
    approved_facts: list[str] = Field(default_factory=list, max_length=100)
    additional_instructions: str = Field(default="", max_length=4000)

    @field_validator("brand_name", "tone", "target_audience")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("This value cannot be blank.")
        return value.strip()


class BrandProfileCreate(BrandProfileFields):
    id: UUID | None = None


class BrandProfileUpdate(BrandProfileFields):
    pass


class BrandProfileRead(BrandProfileFields):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class ReviewIssueInput(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=200)
    exact_text: str = Field(min_length=1, max_length=2000)
    explanation: str = Field(min_length=1, max_length=3000)
    severity: Literal["low", "medium", "high"]
    suggested_correction: str = Field(min_length=1, max_length=3000)
    requires_human_verification: bool
    suggestion_decision: Literal["pending", "accepted", "rejected", "edited"] = "pending"
    final_text: str | None = Field(default=None, max_length=3000)
    reviewed: bool = False


class ContentReviewFields(BaseModel):
    brand_profile_id: UUID
    content_title: str = Field(min_length=1, max_length=300)
    original_content: str = Field(min_length=1, max_length=20000)
    analysis_mode: Literal["rule-based", "AI"]
    compliance_score: int = Field(ge=0, le=100)
    analysis_summary: str = Field(min_length=1, max_length=3000)
    issues: list[ReviewIssueInput] = Field(max_length=100)
    matched_approved_facts: list[str] = Field(default_factory=list, max_length=100)
    review_status: Literal["pending", "reviewed", "approved", "rejected"] = "pending"

    @field_validator("content_title", "original_content", "analysis_summary")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("This value cannot be blank.")
        return value


class ContentReviewCreate(ContentReviewFields):
    id: UUID | None = None


class ContentReviewUpdate(BaseModel):
    review_status: Literal["pending", "reviewed", "approved", "rejected"]
    issues: list[ReviewIssueInput] = Field(max_length=100)


class SuggestionDecisionInput(BaseModel):
    issue_id: str = Field(min_length=1, max_length=100)
    decision: Literal["pending", "accepted", "rejected", "edited"]
    final_text: str | None = Field(default=None, max_length=3000)

    @field_validator("final_text")
    @classmethod
    def require_edited_text(cls, value: str | None, info):
        if info.data.get("decision") == "edited" and (
            value is None or not value.strip()
        ):
            raise ValueError("Edited suggestions require final_text.")
        return value


class ContentReviewRead(BaseModel):
    id: UUID
    brand_profile_id: UUID
    brand_name: str
    content_title: str
    original_content: str
    analysis_mode: Literal["rule-based", "AI"]
    compliance_score: int
    analysis_summary: str
    issues: list[ReviewIssueInput]
    matched_approved_facts: list[str]
    review_status: Literal["pending", "reviewed", "approved", "rejected"]
    created_at: datetime
    updated_at: datetime


class SuggestionDecisionRead(BaseModel):
    id: UUID
    content_review_id: UUID
    issue_id: str
    decision: Literal["accepted", "rejected", "edited"]
    final_text: str | None
    updated_at: datetime
