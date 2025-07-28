import os
import asyncio
import json
from typing import List, Dict, Optional
from datetime import datetime
import anthropic
from pydantic import BaseModel

class TranslationSegment(BaseModel):
    segment_id: str
    original_text: str
    translated_text: Optional[str] = None
    llm_translation: Optional[str] = None
    confidence_score: Optional[float] = None
    quality_metrics: Optional[Dict] = None
    translation_time: Optional[float] = None

class TranslationJob(BaseModel):
    job_id: str
    file_id: str
    segments: List[TranslationSegment]
    status: str = "pending"  # pending, in_progress, completed, failed
    created_at: datetime
    completed_at: Optional[datetime] = None
    total_segments: int
    completed_segments: int = 0
    average_confidence: Optional[float] = None
    average_quality_score: Optional[float] = None

class LLMTranslator:
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )
        self.model = "claude-3-haiku-20240307"
        self.system_prompt = os.getenv(
            "CLAUDE_SYSTEM_PROMPT", 
            """You are a highly skilled translator specializing in Arabic to Urdu translation. Your task is to translate the given Arabic text into Urdu with 100% accuracy. This requires careful attention to detail, cultural nuances, and linguistic precision.

To ensure 100% accuracy in your translation, follow these steps:

1. Read the entire Arabic text carefully to understand the context and meaning.
2. Translate the text sentence by sentence, paying close attention to grammar, vocabulary, and idiomatic expressions.
3. Consider any cultural references or nuances that may require special attention in translation.
4. Double-check your translation for any potential errors or misinterpretations.
5. Ensure that the Urdu translation maintains the tone and style of the original Arabic text.

Guidelines for ensuring accuracy:
- Use authoritative Arabic-Urdu dictionaries if needed.
- If you encounter any ambiguous terms or phrases, provide the most accurate translation based on context.
- Maintain any specialized terminology, proper nouns, or technical language as appropriate.
- If a direct translation is not possible for any phrase, provide the closest Urdu equivalent and explain the difference in a note.

After completing your translation, review it once more for accuracy and naturalness in Urdu.

Present your final Urdu translation within <urdu_translation> tags. If you have any notes or explanations about specific translation choices, include them after the translation within <translation_notes> tags.

Remember, the goal is 100% accuracy in translating from Arabic to Urdu. Take your time and be as precise as possible in your translation."""
        )
        
    async def translate_segment(self, arabic_text: str) -> Dict:
        """Translate a single segment from Arabic to Urdu using Claude"""
        
        user_prompt = f"""Please translate the following Arabic text to Urdu. The translation should be:
        1. Accurate and faithful to the original meaning
        2. Natural and fluent in Urdu
        3. Appropriate for broadcast media
        4. Maintain the same tone and style as the original
        
        Arabic text: {arabic_text}
        
        Please provide your translation in Urdu script. Only provide the translation, no explanations."""
        
        try:
            start_time = datetime.now()
            
            response = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=1000,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            end_time = datetime.now()
            translation_time = (end_time - start_time).total_seconds()
            
            translated_text = response.content[0].text.strip()
            
            # Calculate confidence score (simplified - in production you'd use more sophisticated metrics)
            confidence_score = self._calculate_confidence_score(arabic_text, translated_text)
            
            # Calculate quality metrics
            quality_metrics = self._calculate_quality_metrics(arabic_text, translated_text)
            
            return {
                "translated_text": translated_text,
                "confidence_score": confidence_score,
                "quality_metrics": quality_metrics,
                "translation_time": translation_time
            }
            
        except Exception as e:
            raise Exception(f"Translation failed: {str(e)}")
    
    def _calculate_confidence_score(self, arabic_text: str, urdu_text: str) -> float:
        """Calculate confidence score for translation quality"""
        # Simple heuristic-based confidence scoring
        # In production, you'd use more sophisticated NLP metrics
        
        score = 0.5  # Base score
        
        # Length similarity
        arabic_length = len(arabic_text)
        urdu_length = len(urdu_text)
        if arabic_length > 0 and urdu_length > 0:
            length_ratio = min(arabic_length, urdu_length) / max(arabic_length, urdu_length)
            score += length_ratio * 0.2
        
        # Check for common translation patterns
        if any(word in urdu_text.lower() for word in ['ہے', 'ہیں', 'کیا', 'کا', 'کی']):
            score += 0.1
        
        # Check for Arabic numerals or common patterns
        if any(char.isdigit() for char in urdu_text):
            score += 0.1
        
        return min(score, 1.0)
    
    def _calculate_quality_metrics(self, arabic_text: str, urdu_text: str) -> Dict:
        """Calculate detailed quality metrics"""
        metrics = {
            "length_ratio": len(urdu_text) / max(len(arabic_text), 1),
            "has_urdu_script": any('\u0600' <= char <= '\u06FF' or '\u0750' <= char <= '\u077F' for char in urdu_text),
            "has_numbers": any(char.isdigit() for char in urdu_text),
            "has_punctuation": any(char in '،۔!؟' for char in urdu_text),
            "word_count": len(urdu_text.split()),
            "character_count": len(urdu_text)
        }
        
        # Calculate overall quality score
        quality_score = 0.0
        if metrics["has_urdu_script"]:
            quality_score += 0.3
        if 0.5 <= metrics["length_ratio"] <= 2.0:
            quality_score += 0.2
        if metrics["has_punctuation"]:
            quality_score += 0.1
        if metrics["word_count"] > 0:
            quality_score += 0.2
        if metrics["has_numbers"]:
            quality_score += 0.1
        
        metrics["overall_quality_score"] = min(quality_score, 1.0)
        
        return metrics
    
    async def translate_file(self, file_id: str, segments: List[Dict]) -> TranslationJob:
        """Translate an entire file with multiple segments"""
        
        job_id = f"llm_job_{file_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        translation_segments = []
        for segment in segments:
            translation_segments.append(TranslationSegment(
                segment_id=segment.get("segment_id", ""),
                original_text=segment.get("original_text", "")
            ))
        
        job = TranslationJob(
            job_id=job_id,
            file_id=file_id,
            segments=translation_segments,
            total_segments=len(translation_segments),
            created_at=datetime.now()
        )
        
        # Process segments
        job.status = "in_progress"
        
        for i, segment in enumerate(job.segments):
            try:
                result = await self.translate_segment(segment.original_text)
                
                segment.llm_translation = result["translated_text"]
                segment.confidence_score = result["confidence_score"]
                segment.quality_metrics = result["quality_metrics"]
                segment.translation_time = result["translation_time"]
                
                job.completed_segments += 1
                
                # Update progress
                await asyncio.sleep(0.1)  # Small delay to prevent rate limiting
                
            except Exception as e:
                print(f"Error translating segment {i}: {e}")
                continue
        
        # Calculate job-level metrics
        if job.completed_segments > 0:
            job.average_confidence = sum(s.confidence_score or 0 for s in job.segments) / job.completed_segments
            job.average_quality_score = sum(s.quality_metrics.get("overall_quality_score", 0) for s in job.segments) / job.completed_segments
        
        job.status = "completed"
        job.completed_at = datetime.now()
        
        return job

# Global translator instance
llm_translator = LLMTranslator() 