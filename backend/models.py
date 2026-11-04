from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    brand_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    tone: Mapped[str] = mapped_column(String(500), nullable=False)
    target_audience: Mapped[str] = mapped_column(String(500), nullable=False)
    preferred_words: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    restricted_words: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    approved_facts: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    additional_instructions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    reviews: Mapped[list["ContentReview"]] = relationship(
        back_populates="brand_profile",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ContentReview(Base):
    __tablename__ = "content_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    brand_profile_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("brand_profiles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    content_title: Mapped[str] = mapped_column(String(300), nullable=False)
    original_content: Mapped[str] = mapped_column(Text, nullable=False)
    analysis_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    compliance_score: Mapped[int] = mapped_column(Integer, nullable=False)
    analysis_summary: Mapped[str] = mapped_column(Text, nullable=False)
    issues_json: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False)
    matched_approved_facts: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    review_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    brand_profile: Mapped[BrandProfile] = relationship(back_populates="reviews")
    suggestion_decisions: Mapped[list["SuggestionDecision"]] = relationship(
        back_populates="content_review",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class SuggestionDecision(Base):
    __tablename__ = "suggestion_decisions"
    __table_args__ = (
        UniqueConstraint(
            "content_review_id", "issue_id", name="uq_review_issue_decision"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    content_review_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("content_reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    issue_id: Mapped[str] = mapped_column(String(100), nullable=False)
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    final_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    content_review: Mapped[ContentReview] = relationship(
        back_populates="suggestion_decisions"
    )
