import os
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain.memory import ConversationBufferMemory
from langchain.chains import LLMChain
from langchain.schema import BaseOutputParser


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


class TranslationOutputParser(BaseOutputParser):
    """Custom output parser for translation results"""
    
    def parse(self, text: str) -> Dict[str, str]:
        """Parse the LLM response to extract translation and notes"""
        # Look for translation within tags
        if "<urdu_translation>" in text and "</urdu_translation>" in text:
            start = text.find("<urdu_translation>") + len("<urdu_translation>")
            end = text.find("</urdu_translation>")
            translation = text[start:end].strip()
        else:
            # Fallback: take the entire response as translation
            translation = text.strip()
        
        # Look for notes within tags
        notes = ""
        if "<translation_notes>" in text and "</translation_notes>" in text:
            start = text.find("<translation_notes>") + len("<translation_notes>")
            end = text.find("</translation_notes>")
            notes = text[start:end].strip()
        
        return {
            "translation": translation,
            "notes": notes
        }


class LangChainTranslator:
    """Advanced LLM translator using LangChain for Arabic to Urdu translation with intelligent chunking"""
    
    def __init__(self):
        """Initialize the LangChain translator"""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        
        # Initialize LangChain components
        self.model = ChatAnthropic(
            model=os.getenv("CLAUDE_MODEL", "claude-3-haiku-20240307"),
            anthropic_api_key=api_key,
            max_tokens=1000,
            temperature=0.1  # Low temperature for consistent translations
        )
        
        # Create translation memory for context
        self.memory = ConversationBufferMemory(
            memory_key="translation_history",
            return_messages=True
        )
        
        # Create the system prompt template
        self.system_prompt = ChatPromptTemplate.from_messages([
            ("system", self._get_system_prompt()),
            MessagesPlaceholder(variable_name="translation_history"),
            ("human", "{user_input}")
        ])
        
        # Create the translation chain
        self.translation_chain = self.system_prompt | self.model | TranslationOutputParser()
        
        # Translation jobs storage
        self.translation_jobs: Dict[str, TranslationJob] = {}
        
        # Rate limiting configuration
        self.max_requests_per_minute = 5
        self.request_timestamps = []
        self.chunk_size = 3  # Optimal chunk size based on testing
        self.max_prompt_tokens = 4000  # Conservative token limit
        self.retry_delay = 60  # Seconds to wait on rate limit
    
    def _get_system_prompt(self) -> str:
        """Get the comprehensive system prompt for Arabic to Urdu translation"""
        return """You are a highly skilled professional translator specializing in Arabic to Urdu translation with over 20 years of experience in broadcast media translation.

Your expertise includes:
- Deep understanding of Arabic and Urdu linguistics
- Cultural context and regional variations
- Broadcast media terminology and style
- Technical and specialized vocabulary
- Maintaining tone and register consistency

TRANSLATION GUIDELINES:

1. ACCURACY FIRST:
   - Ensure 100% semantic accuracy
   - Preserve the original meaning and intent
   - Maintain cultural sensitivity and appropriateness

2. BROADCAST MEDIA STANDARDS:
   - Use clear, natural Urdu that sounds professional
   - Maintain appropriate formality level
   - Ensure pronunciation-friendly translations
   - Consider timing constraints for subtitles

3. TECHNICAL REQUIREMENTS:
   - Preserve proper nouns and names when possible
   - Maintain numbers, dates, and measurements
   - Keep technical terms consistent
   - Preserve formatting and punctuation

4. QUALITY ASSURANCE:
   - Double-check grammar and syntax
   - Ensure natural flow in Urdu
   - Verify cultural appropriateness
   - Maintain consistency with previous translations

CONTEXT AWARENESS:
- Consider the broader context from previous segments
- Maintain consistency in terminology
- Adapt to the specific domain (news, entertainment, technical, etc.)
- Consider the target audience

OUTPUT FORMAT:
Present your translation within <urdu_translation> tags.
If you have any notes about translation choices, include them within <translation_notes> tags.

Example:
<urdu_translation>
خبروں میں خوش آمدید
</urdu_translation>
<translation_notes>
Used formal register appropriate for news broadcast
</translation_notes>

Remember: Your goal is to produce translations that are not only accurate but also natural, professional, and suitable for broadcast media."""
    
    async def translate_segment(self, arabic_text: str, context: Optional[str] = None) -> Dict:
        """Translate a single segment with context awareness"""
        
        try:
            start_time = datetime.now()
            
            # Prepare user input with context
            user_input = f"Arabic text to translate: {arabic_text}"
            if context:
                user_input += f"\n\nContext from previous segments: {context}"
            
            # Get translation history for context
            history = self.memory.load_memory_variables({})
            translation_history = history.get("translation_history", [])
            
            # Execute translation
            result = await self.translation_chain.ainvoke({
                "user_input": user_input,
                "translation_history": translation_history
            })
            
            # Update memory with this translation
            self.memory.save_context(
                {"input": user_input},
                {"output": result["translation"]}
            )
            
            end_time = datetime.now()
            translation_time = (end_time - start_time).total_seconds()
            
            # Calculate quality metrics
            confidence_score = self._calculate_confidence_score(arabic_text, result["translation"])
            quality_metrics = self._calculate_quality_metrics(arabic_text, result["translation"])
            
            return {
                "translated_text": result["translation"],
                "confidence_score": confidence_score,
                "quality_metrics": quality_metrics,
                "translation_time": translation_time,
                "notes": result.get("notes", "")
            }
            
        except Exception as e:
            raise Exception(f"Translation failed: {str(e)}")
    
    def _calculate_confidence_score(self, arabic_text: str, urdu_text: str) -> float:
        """Calculate confidence score for translation quality"""
        score = 0.5  # Base score
        
        # Length similarity
        arabic_length = len(arabic_text)
        urdu_length = len(urdu_text)
        if arabic_length > 0 and urdu_length > 0:
            length_ratio = min(arabic_length, urdu_length) / max(arabic_length, urdu_length)
            score += length_ratio * 0.2
        
        # Check for Urdu script
        if any('\u0600' <= char <= '\u06FF' or '\u0750' <= char <= '\u077F' for char in urdu_text):
            score += 0.2
        
        # Check for common Urdu words
        urdu_indicators = ['ہے', 'ہیں', 'کیا', 'کا', 'کی', 'میں', 'پر', 'سے', 'کو', 'کے']
        if any(word in urdu_text for word in urdu_indicators):
            score += 0.1
        
        # Check for proper formatting
        if urdu_text.strip() and not urdu_text.isspace():
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
            "character_count": len(urdu_text),
            "is_not_empty": bool(urdu_text.strip()),
            "has_arabic_numerals": any(char in '٠١٢٣٤٥٦٧٨٩' for char in urdu_text)
        }
        
        # Calculate overall quality score
        quality_score = 0.0
        if metrics["has_urdu_script"]:
            quality_score += 0.3
        if 0.5 <= metrics["length_ratio"] <= 2.0:
            quality_score += 0.2
        if metrics["has_punctuation"]:
            quality_score += 0.1
        if metrics["is_not_empty"]:
            quality_score += 0.2
        if metrics["word_count"] > 0:
            quality_score += 0.2
        
        metrics["overall_quality_score"] = min(quality_score, 1.0)
        
        return metrics
    
    async def translate_file(self, file_id: str, segments: List[Dict], use_existing_translations: bool = False) -> TranslationJob:
        """Translate an entire file with intelligent chunking and rate limiting"""
        
        job_id = f"langchain_job_{file_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create translation segments
        translation_segments = []
        for segment_data in segments:
            segment = TranslationSegment(
                segment_id=segment_data["segment_id"],
                original_text=segment_data["original_text"]
            )
            
            # If using existing translations, set the translated_text
            if use_existing_translations and "translated_text" in segment_data:
                segment.translated_text = segment_data["translated_text"]
                segment.llm_translation = segment_data["translated_text"]  # Use existing as LLM translation
                segment.confidence_score = 1.0  # High confidence for existing translations
                segment.quality_metrics = {"overall_quality_score": 0.9}  # Good quality for existing
                segment.translation_time = 0.0  # No translation time for existing
            
            translation_segments.append(segment)
        
        # Create translation job
        job = TranslationJob(
            job_id=job_id,
            file_id=file_id,
            segments=translation_segments,
            total_segments=len(segments),
            created_at=datetime.now()
        )
        
        # Store job
        self.translation_jobs[job_id] = job
        job.status = "in_progress"
        
        try:
            # Check if we're using existing translations
            if use_existing_translations:
                # Mark all segments as completed since they already have translations
                job.completed_segments = len(job.segments)
                job.status = "completed"
                job.completed_at = datetime.now()
                
                # Calculate metrics for existing translations
                completed_segments = [s for s in job.segments if s.llm_translation is not None]
                if completed_segments:
                    job.average_confidence = sum(s.confidence_score or 0 for s in completed_segments) / len(completed_segments)
                    job.average_quality_score = sum(s.quality_metrics.get("overall_quality_score", 0) for s in completed_segments) / len(completed_segments)
                
                print(f"Using existing translations for {len(job.segments)} segments")
            else:
                # Process segments in optimal chunks
                await self._process_chunks(job)
                
                # Update final job metrics
                job.status = "completed"
                job.completed_at = datetime.now()
                
                if job.completed_segments > 0:
                    job.average_confidence = sum(s.confidence_score or 0 for s in job.segments) / job.completed_segments
                    job.average_quality_score = sum(s.quality_metrics.get("overall_quality_score", 0) for s in job.segments) / job.completed_segments
            
            return job
            
        except Exception as e:
            job.status = "failed"
            raise Exception(f"File translation failed: {str(e)}")

    async def _process_chunks(self, job: TranslationJob):
        """Process segments in optimal chunks with rate limiting"""
        total_segments = len(job.segments)
        
        # Create chunks of optimal size
        chunks = self._create_chunks(job.segments, self.chunk_size)
        
        print(f"Processing {total_segments} segments in {len(chunks)} chunks of size {self.chunk_size}")
        
        for chunk_index, chunk in enumerate(chunks):
            try:
                print(f"Processing chunk {chunk_index + 1}/{len(chunks)} with {len(chunk)} segments")
                
                # Check rate limits before processing
                await self._check_rate_limit()
                
                # Process the chunk
                await self._process_single_chunk(chunk, job, chunk_index)
                
                # Update progress
                job.completed_segments = sum(1 for s in job.segments if s.llm_translation is not None)
                
                print(f"Completed chunk {chunk_index + 1}: {job.completed_segments}/{total_segments} segments done")
                
            except Exception as e:
                print(f"Error processing chunk {chunk_index + 1}: {str(e)}")
                # Continue with next chunk instead of failing entire job
                continue

    def _create_chunks(self, segments: List[TranslationSegment], chunk_size: int) -> List[List[TranslationSegment]]:
        """Create optimal chunks based on segment count and prompt size"""
        chunks = []
        
        for i in range(0, len(segments), chunk_size):
            chunk = segments[i:i + chunk_size]
            
            # Check if chunk would exceed prompt size limits
            if self._estimate_prompt_size(chunk) > self.max_prompt_tokens:
                # Split into smaller chunks if needed
                sub_chunks = self._split_chunk_by_size(chunk)
                chunks.extend(sub_chunks)
            else:
                chunks.append(chunk)
        
        return chunks

    def _estimate_prompt_size(self, segments: List[TranslationSegment]) -> int:
        """Estimate the token size of a prompt for given segments"""
        # Rough estimation: 1 token ≈ 4 characters for Arabic/Urdu text
        total_chars = 0
        
        # System prompt size (approximate)
        system_prompt = self._get_system_prompt()
        total_chars += len(system_prompt)
        
        # Batch prompt size
        batch_prompt = self._create_batch_prompt(segments)
        total_chars += len(batch_prompt)
        
        # Add buffer for formatting and instructions
        total_chars += 500
        
        return total_chars // 4  # Convert to approximate tokens

    def _split_chunk_by_size(self, chunk: List[TranslationSegment]) -> List[List[TranslationSegment]]:
        """Split a chunk into smaller pieces if it exceeds size limits"""
        if len(chunk) <= 1:
            return [chunk]
        
        # Try to split in half
        mid = len(chunk) // 2
        return [chunk[:mid], chunk[mid:]]

    async def _process_single_chunk(self, chunk: List[TranslationSegment], job: TranslationJob, chunk_index: int):
        """Process a single chunk of segments with improved batch processing"""
        try:
            print(f"Processing chunk {chunk_index + 1} with {len(chunk)} segments")
            
            # Create batch prompt for this chunk
            batch_prompt = self._create_batch_prompt(chunk)
            
            # Make API call with retry logic
            start_time = datetime.now()
            result = await self._translate_batch_with_retry(batch_prompt)
            end_time = datetime.now()
            
            # Parse results with improved logic
            translations = self._parse_batch_results_improved(result, chunk)
            
            total_time = (end_time - start_time).total_seconds()
            time_per_segment = total_time / len(chunk)
            
            # Update segments in the job
            for i, (segment, translation) in enumerate(zip(chunk, translations)):
                segment.llm_translation = translation
                segment.confidence_score = self._calculate_confidence_score(segment.original_text, translation)
                segment.quality_metrics = self._calculate_quality_metrics(segment.original_text, translation)
                segment.translation_time = time_per_segment
                
                print(f"Segment {segment.segment_id} translated: {translation[:50]}...")
            
            # Record successful request
            self._record_request()
            
        except Exception as e:
            print(f"Chunk processing failed: {str(e)}")
            # Mark segments as failed but continue
            for segment in chunk:
                segment.llm_translation = f"[Translation failed: {str(e)}]"
                segment.confidence_score = 0.0
                segment.quality_metrics = {"overall_quality_score": 0.0}
                segment.translation_time = 0.0

    async def _translate_batch_with_retry(self, batch_prompt: str, max_retries: int = 3) -> str:
        """Translate batch with intelligent retry logic for rate limiting"""
        for attempt in range(max_retries):
            try:
                response = await asyncio.to_thread(
                    self.model.invoke,
                    batch_prompt
                )
                return response.content
                
            except Exception as e:
                error_str = str(e)
                if "rate_limit_error" in error_str or "429" in error_str:
                    if attempt < max_retries - 1:
                        wait_time = self.retry_delay * (attempt + 1)  # Exponential backoff
                        print(f"Rate limit hit, waiting {wait_time} seconds before retry {attempt + 1}")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        raise Exception(f"Rate limit exceeded after {max_retries} retries")
                else:
                    raise e

    async def _check_rate_limit(self):
        """Check if we're approaching rate limits and wait if necessary"""
        current_time = time.time()
        
        # Remove timestamps older than 1 minute
        self.request_timestamps = [ts for ts in self.request_timestamps if current_time - ts < 60]
        
        # If we've made too many requests recently, wait
        if len(self.request_timestamps) >= self.max_requests_per_minute:
            wait_time = 60 - (current_time - self.request_timestamps[0])
            if wait_time > 0:
                print(f"Rate limit approaching, waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)

    def _record_request(self):
        """Record a successful API request for rate limiting"""
        self.request_timestamps.append(time.time())

    def _create_batch_prompt(self, segments: List[TranslationSegment]) -> str:
        """Create an optimized batch prompt for segments"""
        if len(segments) == 1:
            # Single segment - use detailed prompt
            return f"""Please translate the following Arabic text to Urdu:

Arabic text: {segments[0].original_text}

Provide only the Urdu translation:"""
        
        else:
            # Multiple segments - use compact format
            prompt = "Translate these Arabic texts to Urdu. Provide each translation on a new line:\n\n"
            
            for i, segment in enumerate(segments, 1):
                prompt += f"{i}. {segment.original_text}\n"
            
            prompt += "\nTranslations:"
            return prompt
    
    def _parse_batch_results(self, result: str, segments: List[TranslationSegment]) -> List[str]:
        """Parse the batch translation results with improved error handling"""
        lines = [line.strip() for line in result.strip().split('\n') if line.strip()]
        translations = []
        
        # Filter out non-translation lines (like explanations, notes, etc.)
        translation_lines = []
        for line in lines:
            # Skip lines that are clearly not translations
            if any(skip_word in line.lower() for skip_word in ['translation', 'note', 'explanation', 'comment']):
                continue
            # Skip lines that are just numbers or punctuation
            if line.isdigit() or line in ['', '.', ',', ';', ':']:
                continue
            translation_lines.append(line)
        
        print(f"Parsing {len(segments)} segments from {len(translation_lines)} translation lines")
        print(f"Translation lines: {translation_lines}")
        
        for i, segment in enumerate(segments):
            if i < len(translation_lines):
                # Extract translation from line (remove numbering if present)
                line = translation_lines[i]
                if line and line[0].isdigit() and '.' in line:
                    # Remove "1. " format
                    translation = line.split('.', 1)[1].strip()
                else:
                    translation = line
                translations.append(translation)
            else:
                # Fallback if not enough lines
                print(f"Warning: No translation line found for segment {i+1}")
                translations.append("")
        
        return translations

    def _parse_batch_results_improved(self, result: str, segments: List[TranslationSegment]) -> List[str]:
        """Improved batch parsing with better alignment and fallback logic"""
        lines = [line.strip() for line in result.strip().split('\n') if line.strip()]
        translations = []
        
        print(f"Raw result lines: {lines}")
        
        # Filter out non-translation lines
        translation_lines = []
        for line in lines:
            # Skip lines that are clearly not translations
            if any(skip_word in line.lower() for skip_word in ['translation', 'note', 'explanation', 'comment', 'arabic', 'urdu']):
                continue
            # Skip lines that are just numbers or punctuation
            if line.isdigit() or line in ['', '.', ',', ';', ':']:
                continue
            # Skip empty lines
            if not line:
                continue
            translation_lines.append(line)
        
        print(f"Filtered translation lines: {translation_lines}")
        print(f"Expected {len(segments)} segments, found {len(translation_lines)} translation lines")
        
        # If we have the right number of lines, use them directly
        if len(translation_lines) == len(segments):
            for i, line in enumerate(translation_lines):
                # Remove numbering if present
                if line and line[0].isdigit() and '.' in line:
                    translation = line.split('.', 1)[1].strip()
                else:
                    translation = line
                translations.append(translation)
                print(f"Segment {i+1}: {translation[:50]}...")
        
        # If we have more lines than segments, try to match them intelligently
        elif len(translation_lines) > len(segments):
            print(f"More translation lines than segments, using first {len(segments)}")
            for i in range(len(segments)):
                if i < len(translation_lines):
                    line = translation_lines[i]
                    if line and line[0].isdigit() and '.' in line:
                        translation = line.split('.', 1)[1].strip()
                    else:
                        translation = line
                    translations.append(translation)
                else:
                    translations.append("")
        
        # If we have fewer lines than segments, fill the rest with empty strings
        else:
            print(f"Fewer translation lines than segments, filling missing ones")
            for i in range(len(segments)):
                if i < len(translation_lines):
                    line = translation_lines[i]
                    if line and line[0].isdigit() and '.' in line:
                        translation = line.split('.', 1)[1].strip()
                    else:
                        translation = line
                    translations.append(translation)
                else:
                    print(f"Warning: No translation for segment {i+1}")
                    translations.append("")
        
        return translations
    
    def get_job(self, job_id: str) -> Optional[TranslationJob]:
        """Get a translation job by ID"""
        return self.translation_jobs.get(job_id)
    
    def list_jobs(self) -> List[TranslationJob]:
        """List all translation jobs"""
        return list(self.translation_jobs.values())
    
    def get_metrics(self) -> Dict:
        """Get translation metrics"""
        jobs = self.list_jobs()
        completed_jobs = [j for j in jobs if j.status in ["completed", "approved"]]
        
        return {
            "total_jobs": len(jobs),
            "completed_jobs": len(completed_jobs),
            "total_segments_translated": sum(j.completed_segments for j in completed_jobs),
            "average_confidence": sum(j.average_confidence for j in completed_jobs) / len(completed_jobs) if completed_jobs else 0,
            "average_quality_score": sum(j.average_quality_score for j in completed_jobs) / len(completed_jobs) if completed_jobs else 0
        } 