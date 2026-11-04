import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from database import get_db
from auth import CurrentUser
from models import BrandProfile, ContentReview
from persistence import (
    brand_to_read,
    create_brand,
    create_review,
    get_review,
    replace_decision,
    review_to_read,
    update_brand,
    update_review,
)
from schemas import (
    BrandProfileCreate,
    BrandProfileRead,
    BrandProfileUpdate,
    ContentReviewCreate,
    ContentReviewRead,
    ContentReviewUpdate,
    SuggestionDecisionInput,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/brands", response_model=list[BrandProfileRead])
def list_brands(
    current_user: CurrentUser, db: Session = Depends(get_db)
) -> list[dict[str, object]]:
    brands = db.scalars(
        select(BrandProfile)
        .where(BrandProfile.owner_user_id == current_user.id)
        .order_by(BrandProfile.created_at)
    ).all()
    return [brand_to_read(brand) for brand in brands]


@router.post(
    "/brands",
    response_model=BrandProfileRead,
    status_code=status.HTTP_201_CREATED,
)
def post_brand(
    data: BrandProfileCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    if data.id and db.get(BrandProfile, str(data.id)):
        raise HTTPException(status_code=409, detail="A brand profile with this ID already exists.")
    try:
        return brand_to_read(create_brand(db, data, current_user.id))
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not create the brand profile because it conflicts with an existing record.",
        ) from error


@router.get("/brands/{brand_id}", response_model=BrandProfileRead)
def get_brand(
    brand_id: UUID,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    brand = db.scalar(
        select(BrandProfile).where(
            BrandProfile.id == str(brand_id),
            BrandProfile.owner_user_id == current_user.id,
        )
    )
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand profile not found.")
    return brand_to_read(brand)


@router.put("/brands/{brand_id}", response_model=BrandProfileRead)
def put_brand(
    brand_id: UUID,
    data: BrandProfileUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    brand = db.scalar(
        select(BrandProfile).where(
            BrandProfile.id == str(brand_id),
            BrandProfile.owner_user_id == current_user.id,
        )
    )
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand profile not found.")
    try:
        return brand_to_read(update_brand(db, brand, data))
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Could not update the brand profile."
        ) from error


@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: UUID,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> Response:
    brand = db.scalar(
        select(BrandProfile).where(
            BrandProfile.id == str(brand_id),
            BrandProfile.owner_user_id == current_user.id,
        )
    )
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand profile not found.")
    if db.scalar(
        select(ContentReview.id)
        .where(
            ContentReview.brand_profile_id == brand.id,
            ContentReview.owner_user_id == current_user.id,
        )
        .limit(1)
    ):
        raise HTTPException(
            status_code=409,
            detail="This brand profile has saved reviews and cannot be deleted.",
        )
    db.delete(brand)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/reviews", response_model=list[ContentReviewRead])
def list_reviews(
    current_user: CurrentUser, db: Session = Depends(get_db)
) -> list[ContentReviewRead]:
    reviews = db.scalars(
        select(ContentReview)
        .options(
            joinedload(ContentReview.brand_profile),
            joinedload(ContentReview.suggestion_decisions),
        )
        .where(ContentReview.owner_user_id == current_user.id)
        .order_by(ContentReview.created_at.desc())
    ).unique().all()
    return [review_to_read(review) for review in reviews]


@router.post(
    "/reviews",
    response_model=ContentReviewRead,
    status_code=status.HTTP_201_CREATED,
)
def post_review(
    data: ContentReviewCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> ContentReviewRead:
    if data.id and db.get(ContentReview, str(data.id)):
        raise HTTPException(status_code=409, detail="A content review with this ID already exists.")
    try:
        review = create_review(db, data, current_user.id)
        loaded_review = get_review(db, review.id, current_user.id)
        if loaded_review is None:
            raise HTTPException(status_code=500, detail="Created review could not be loaded.")
        return review_to_read(loaded_review)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not create the review because it conflicts with an existing record.",
        ) from error


@router.get("/reviews/{review_id}", response_model=ContentReviewRead)
def get_review_by_id(
    review_id: UUID,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> ContentReviewRead:
    review = get_review(db, str(review_id), current_user.id)
    if review is None:
        raise HTTPException(status_code=404, detail="Content review not found.")
    return review_to_read(review)


@router.put("/reviews/{review_id}", response_model=ContentReviewRead)
def put_review(
    review_id: UUID,
    data: ContentReviewUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> ContentReviewRead:
    review = get_review(db, str(review_id), current_user.id)
    if review is None:
        raise HTTPException(status_code=404, detail="Content review not found.")
    try:
        updated_review = update_review(db, review, data)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Could not update the content review.") from error
    return review_to_read(updated_review)


@router.put(
    "/reviews/{review_id}/suggestions/{issue_id}",
    response_model=ContentReviewRead,
)
def put_suggestion_decision(
    review_id: UUID,
    issue_id: str,
    data: SuggestionDecisionInput,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> ContentReviewRead:
    if issue_id != data.issue_id:
        raise HTTPException(status_code=400, detail="Path issue ID does not match request body.")
    review = get_review(db, str(review_id), current_user.id)
    if review is None:
        raise HTTPException(status_code=404, detail="Content review not found.")
    updated_review = replace_decision(
        db,
        review,
        issue_id,
        data.decision,
        data.final_text,
    )
    return review_to_read(updated_review)
