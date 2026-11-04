from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from models import BrandProfile, ContentReview, SuggestionDecision, utc_now
from schemas import (
    BrandProfileCreate,
    BrandProfileUpdate,
    ContentReviewCreate,
    ContentReviewRead,
    ContentReviewUpdate,
    ReviewIssueInput,
)


def brand_to_read(brand: BrandProfile) -> dict[str, object]:
    return {
        "id": brand.id,
        "brand_name": brand.brand_name,
        "tone": brand.tone,
        "target_audience": brand.target_audience,
        "preferred_words": brand.preferred_words,
        "restricted_words": brand.restricted_words,
        "approved_facts": brand.approved_facts,
        "additional_instructions": brand.additional_instructions,
        "created_at": brand.created_at,
        "updated_at": brand.updated_at,
    }


def create_brand(
    db: Session, data: BrandProfileCreate, owner_user_id: str
) -> BrandProfile:
    brand = BrandProfile(
        id=str(data.id) if data.id else None,
        owner_user_id=owner_user_id,
        **data.model_dump(exclude={"id"}),
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


def update_brand(
    db: Session, brand: BrandProfile, data: BrandProfileUpdate
) -> BrandProfile:
    for field, value in data.model_dump().items():
        setattr(brand, field, value)
    brand.updated_at = utc_now()
    db.commit()
    db.refresh(brand)
    return brand


def get_review(
    db: Session, review_id: str, owner_user_id: str | None
) -> ContentReview | None:
    result = db.execute(
        select(ContentReview)
        .options(
            joinedload(ContentReview.brand_profile),
            joinedload(ContentReview.suggestion_decisions),
        )
        .where(
            ContentReview.id == review_id,
            ContentReview.owner_user_id == owner_user_id,
        )
    )
    return result.unique().scalar_one_or_none()


def review_to_read(review: ContentReview) -> ContentReviewRead:
    decisions = {decision.issue_id: decision for decision in review.suggestion_decisions}
    issues: list[ReviewIssueInput] = []
    for stored_issue in review.issues_json:
        issue = dict(stored_issue)
        decision = decisions.get(str(issue["id"]))
        issue["suggestion_decision"] = decision.decision if decision else "pending"
        issue["final_text"] = decision.final_text if decision else None
        issues.append(ReviewIssueInput.model_validate(issue))

    return ContentReviewRead(
        id=review.id,
        brand_profile_id=review.brand_profile_id,
        brand_name=review.brand_profile.brand_name,
        content_title=review.content_title,
        original_content=review.original_content,
        analysis_mode=review.analysis_mode,  # type: ignore[arg-type]
        compliance_score=review.compliance_score,
        analysis_summary=review.analysis_summary,
        issues=issues,
        matched_approved_facts=review.matched_approved_facts,
        review_status=review.review_status,  # type: ignore[arg-type]
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


def create_review(
    db: Session, data: ContentReviewCreate, owner_user_id: str
) -> ContentReview:
    brand = db.scalar(
        select(BrandProfile).where(
            BrandProfile.id == str(data.brand_profile_id),
            BrandProfile.owner_user_id == owner_user_id,
        )
    )
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand profile not found.")

    review = ContentReview(
        id=str(data.id) if data.id else None,
        owner_user_id=owner_user_id,
        brand_profile_id=str(data.brand_profile_id),
        content_title=data.content_title,
        original_content=data.original_content,
        analysis_mode=data.analysis_mode,
        compliance_score=data.compliance_score,
        analysis_summary=data.analysis_summary,
        issues_json=[stored_issue(issue) for issue in data.issues],
        matched_approved_facts=data.matched_approved_facts,
        review_status=data.review_status,
    )
    db.add(review)
    for issue in data.issues:
        upsert_decision(db, review, issue)
    db.commit()
    return review


def update_review(
    db: Session, review: ContentReview, data: ContentReviewUpdate
) -> ContentReview:
    review.review_status = data.review_status
    review.issues_json = [stored_issue(issue) for issue in data.issues]
    review.updated_at = utc_now()
    issue_ids = {issue.id for issue in data.issues}
    for decision in list(review.suggestion_decisions):
        if decision.issue_id not in issue_ids:
            db.delete(decision)
    for issue in data.issues:
        upsert_decision(db, review, issue)
    db.commit()
    refreshed = get_review(db, review.id, review.owner_user_id)
    if refreshed is None:
        raise HTTPException(status_code=404, detail="Content review not found.")
    return refreshed


def stored_issue(issue: ReviewIssueInput) -> dict[str, object]:
    return issue.model_dump(
        exclude={"suggestion_decision", "final_text"},
    )


def upsert_decision(
    db: Session, review: ContentReview, issue: ReviewIssueInput
) -> None:
    existing = next(
        (
            decision
            for decision in review.suggestion_decisions
            if decision.issue_id == issue.id
        ),
        None,
    )
    if issue.suggestion_decision == "pending":
        if existing is not None:
            db.delete(existing)
        return
    if existing is None:
        existing = SuggestionDecision(
            content_review_id=review.id,
            issue_id=issue.id,
            decision=issue.suggestion_decision,
            final_text=issue.final_text,
        )
        review.suggestion_decisions.append(existing)
    else:
        existing.decision = issue.suggestion_decision
        existing.final_text = issue.final_text
        existing.updated_at = utc_now()


def replace_decision(
    db: Session,
    review: ContentReview,
    issue_id: str,
    decision: str,
    final_text: str | None,
) -> ContentReview:
    review_issue_ids = {str(issue["id"]) for issue in review.issues_json}
    if issue_id not in review_issue_ids:
        raise HTTPException(status_code=404, detail="Issue not found in this review.")
    matching = next(
        (dict(issue) for issue in review.issues_json if str(issue["id"]) == issue_id),
        None,
    )
    if matching is None:
        raise HTTPException(status_code=404, detail="Issue not found in this review.")
    matching["suggestion_decision"] = decision
    matching["final_text"] = final_text
    validated_issue = ReviewIssueInput.model_validate(matching)
    upsert_decision(db, review, validated_issue)
    review.updated_at = utc_now()
    db.commit()
    refreshed = get_review(db, review.id, review.owner_user_id)
    if refreshed is None:
        raise HTTPException(status_code=404, detail="Content review not found.")
    return refreshed
