import asyncio
from typing import List, Dict, Any
import uuid
from datetime import datetime
import random

from models import TranslationReviewRequest, ReviewedSegment, ReviewResponse, ReviewStatus

class TranslationReviewer:
    """Translation review engine for validating existing translations"""
    
    def __init__(self):
        self.review_loaded = False
        self.quality_thresholds = {
            "excellent": 0.9,
            "good": 0.7,
            "acceptable": 0.5,
            "needs_revision": 0.3
        }
    
    async def load_review_tools(self):
        """Load review tools and validation models"""
        # Simulate loading review tools
        await asyncio.sleep(1)
        self.review_loaded = True
        print("Translation review tools loaded successfully")
    
    async def validate_translation(self, arabic_text: str, urdu_translation: str) -> Dict[str, Any]:
        """Validate an existing Arabic-to-Urdu translation"""
        if not self.review_loaded:
            await self.load_review_tools()
        
        # Simulate validation delay
        await asyncio.sleep(0.1)
        
        # Mock validation logic
        # In a real implementation, this would use actual validation models
        validation_score = random.uniform(0.6, 0.95)
        
        # Determine quality level
        quality_level = "needs_revision"
        for level, threshold in self.quality_thresholds.items():
            if validation_score >= threshold:
                quality_level = level
                break
        
        # Generate validation feedback
        feedback = self._generate_feedback(validation_score, quality_level)
        
        return {
            "score": validation_score,
            "quality_level": quality_level,
            "feedback": feedback,
            "needs_revision": validation_score < 0.7
        }
    
    def _generate_feedback(self, score: float, quality_level: str) -> str:
        """Generate feedback based on validation score"""
        if quality_level == "excellent":
            return "Translation is excellent and ready for approval."
        elif quality_level == "good":
            return "Translation is good with minor issues that can be addressed."
        elif quality_level == "acceptable":
            return "Translation is acceptable but needs some improvements."
        else:
            return "Translation needs significant revision before approval."
    
    async def review_segments(self, segments: List[Dict[str, Any]]) -> List[ReviewedSegment]:
        """Review a list of segments with existing translations"""
        reviewed_segments = []
        
        for i, segment in enumerate(segments):
            try:
                # Extract segment data
                start_time = segment.get('start_time', '00:00:00.000')
                end_time = segment.get('end_time', '00:00:00.000')
                original_text = segment.get('original_text', '')
                translated_text = segment.get('translated_text', '')
                
                # Validate translation
                validation_result = await self.validate_translation(original_text, translated_text)
                
                # Determine review status
                if validation_result["needs_revision"]:
                    review_status = ReviewStatus.NEEDS_REVISION
                else:
                    review_status = ReviewStatus.APPROVED
                
                # Create reviewed segment
                reviewed_segment = ReviewedSegment(
                    start_time=start_time,
                    end_time=end_time,
                    original_text=original_text,
                    original_translation=translated_text,
                    approved_translation=translated_text if not validation_result["needs_revision"] else None,
                    review_status=review_status,
                    reviewer_notes=validation_result["feedback"],
                    review_time=datetime.utcnow()
                )
                
                reviewed_segments.append(reviewed_segment)
                
                # Simulate processing delay
                await asyncio.sleep(0.05)
                
            except Exception as e:
                print(f"Error reviewing segment {i}: {e}")
                # Create segment with error
                reviewed_segment = ReviewedSegment(
                    start_time=segment.get('start_time', '00:00:00.000'),
                    end_time=segment.get('end_time', '00:00:00.000'),
                    original_text=segment.get('original_text', ''),
                    original_translation=segment.get('translated_text', ''),
                    review_status=ReviewStatus.REJECTED,
                    reviewer_notes=f"Error during review: {str(e)}",
                    review_time=datetime.utcnow()
                )
                reviewed_segments.append(reviewed_segment)
        
        return reviewed_segments

class ReviewEngine:
    """Main review engine"""
    
    def __init__(self):
        self.reviewer = TranslationReviewer()
        self.active_reviews = {}
    
    async def start_review(self, request: TranslationReviewRequest) -> ReviewResponse:
        """Start a translation review job"""
        review_id = str(uuid.uuid4())
        
        # Create initial response
        response = ReviewResponse(
            review_id=review_id,
            file_id=request.file_id,
            status=ReviewStatus.PENDING,
            total_segments=len(request.segments),
            reviewed_segments=0,
            reviewer_id=request.reviewer_id
        )
        
        # Store review
        self.active_reviews[review_id] = {
            "response": response,
            "request": request,
            "task": None
        }
        
        # Start background review task
        task = asyncio.create_task(self._process_review(review_id))
        self.active_reviews[review_id]["task"] = task
        
        return response
    
    async def _process_review(self, review_id: str):
        """Process review in background"""
        try:
            review_data = self.active_reviews[review_id]
            response = review_data["response"]
            request = review_data["request"]
            
            # Update status to in review
            response.status = ReviewStatus.IN_REVIEW
            
            # Review segments
            reviewed_segments = await self.reviewer.review_segments(request.segments)
            
            # Update response
            response.segments = reviewed_segments
            response.reviewed_segments = len(reviewed_segments)
            
            # Determine final status
            approved_count = sum(1 for seg in reviewed_segments if seg.review_status == ReviewStatus.APPROVED)
            if approved_count == len(reviewed_segments):
                response.status = ReviewStatus.APPROVED
            elif approved_count > 0:
                response.status = ReviewStatus.NEEDS_REVISION
            else:
                response.status = ReviewStatus.REJECTED
            
            response.completed_at = datetime.utcnow()
            
            print(f"Review job {review_id} completed successfully")
            
        except Exception as e:
            # Handle errors
            review_data = self.active_reviews[review_id]
            response = review_data["response"]
            response.status = ReviewStatus.REJECTED
            response.completed_at = datetime.utcnow()
            
            print(f"Review job {review_id} failed: {e}")
    
    def get_review_status(self, review_id: str) -> ReviewResponse:
        """Get status of a review job"""
        if review_id not in self.active_reviews:
            raise ValueError(f"Review {review_id} not found")
        
        return self.active_reviews[review_id]["response"]
    
    def get_all_reviews(self) -> List[ReviewResponse]:
        """Get all active reviews"""
        return [review_data["response"] for review_data in self.active_reviews.values()] 