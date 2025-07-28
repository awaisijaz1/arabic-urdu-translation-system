import json
import re
from typing import List, Dict, Any
from datetime import datetime
import uuid
from models import TimestampedSegment, SRTSubtitle, ParsedContent

class FileParser:
    """Base class for file parsers"""
    
    def parse(self, content: str) -> ParsedContent:
        """Parse file content and return structured data with translations"""
        raise NotImplementedError

class SRTParser(FileParser):
    """Parser for SRT subtitle files with existing translations"""
    
    def parse(self, content: str) -> ParsedContent:
        """Parse SRT content and extract timestamped segments with translations"""
        segments = []
        
        # Split content into subtitle blocks
        subtitle_blocks = re.split(r'\n\s*\n', content.strip())
        
        for block in subtitle_blocks:
            if not block.strip():
                continue
                
            lines = block.strip().split('\n')
            if len(lines) < 4:  # Need at least: index, timestamp, original, translation
                continue
                
            try:
                # Parse subtitle index
                index = int(lines[0])
                
                # Parse timestamp line
                timestamp_line = lines[1]
                time_match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})', timestamp_line)
                
                if not time_match:
                    continue
                    
                start_time = time_match.group(1).replace(',', '.')
                end_time = time_match.group(2).replace(',', '.')
                
                # Extract original text (Arabic) and translation (Urdu)
                # Assume first text line is Arabic, second is Urdu
                original_text = lines[2].strip()
                translated_text = lines[3].strip() if len(lines) > 3 else ""
                
                # Create segment
                segment = TimestampedSegment(
                    start_time=start_time,
                    end_time=end_time,
                    original_text=original_text,
                    translated_text=translated_text
                )
                segment.validate_timestamp_format()
                segments.append(segment)
                
            except (ValueError, IndexError) as e:
                print(f"Error parsing SRT block: {e}")
                continue
        
        file_id = str(uuid.uuid4())
        return ParsedContent(
            file_id=file_id,
            segments=segments,
            metadata={
                "format": "srt",
                "total_segments": len(segments),
                "parsed_at": datetime.utcnow().isoformat()
            }
        )

class JSONParser(FileParser):
    """Parser for JSON files with timestamped segments and translations"""
    
    def parse(self, content: str) -> ParsedContent:
        """Parse JSON content and extract timestamped segments with translations"""
        try:
            data = json.loads(content)
            segments = []
            
            # Handle different JSON structures
            if isinstance(data, list):
                # Direct list of segments
                for item in data:
                    if isinstance(item, dict):
                        segment = TimestampedSegment(
                            start_time=item.get('start_time', '00:00:00.000'),
                            end_time=item.get('end_time', '00:00:00.000'),
                            original_text=item.get('original_text', item.get('text', '')),
                            translated_text=item.get('translated_text', '')
                        )
                        segment.validate_timestamp_format()
                        segments.append(segment)
            elif isinstance(data, dict):
                # Object with segments array
                if 'segments' in data:
                    for item in data['segments']:
                        if isinstance(item, dict):
                            segment = TimestampedSegment(
                                start_time=item.get('start_time', '00:00:00.000'),
                                end_time=item.get('end_time', '00:00:00.000'),
                                original_text=item.get('original_text', item.get('text', '')),
                                translated_text=item.get('translated_text', '')
                            )
                            segment.validate_timestamp_format()
                            segments.append(segment)
            
            file_id = str(uuid.uuid4())
            return ParsedContent(
                file_id=file_id,
                segments=segments,
                metadata={
                    "format": "json",
                    "total_segments": len(segments),
                    "parsed_at": datetime.utcnow().isoformat()
                }
            )
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")

class ParserFactory:
    """Factory for creating appropriate parsers based on file type"""
    
    @staticmethod
    def get_parser(file_extension: str) -> FileParser:
        """Get parser based on file extension"""
        extension = file_extension.lower()
        
        if extension == '.srt':
            return SRTParser()
        elif extension == '.json':
            return JSONParser()
        else:
            raise ValueError(f"Unsupported file format: {extension}")
    
    @staticmethod
    def get_parser_by_content(content: str) -> FileParser:
        """Get parser by analyzing content"""
        content = content.strip()
        
        # Try to parse as JSON first
        try:
            json.loads(content)
            return JSONParser()
        except json.JSONDecodeError:
            pass
        
        # Check if it looks like SRT
        if re.search(r'\d+\n\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}', content):
            return SRTParser()
        
        raise ValueError("Unable to determine file format from content") 