"""
Image extraction and handling for PDF conversion
"""
import hashlib
import logging
from pathlib import Path
from typing import List, Optional, Tuple
from PIL import Image
import io

logger = logging.getLogger(__name__)


class ImageHandler:
    """Handles image extraction and processing from PDFs"""
    
    def __init__(self, output_dir: Path):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def save_image(
        self,
        image_data: bytes,
        document_id: str,
        image_index: int,
        format: str = 'PNG'
    ) -> Optional[str]:
        """
        Save extracted image to disk
        
        Args:
            image_data: Image bytes
            document_id: Document identifier
            image_index: Image index in document
            format: Output image format
            
        Returns:
            Relative path to saved image or None if failed
        """
        try:
            image_hash = hashlib.md5(image_data).hexdigest()[:8]
            filename = f"{document_id}_img_{image_index}_{image_hash}.{format.lower()}"
            file_path = self.output_dir / filename
            
            img = Image.open(io.BytesIO(image_data))
            
            if img.mode == 'RGBA' and format.upper() in ['JPEG', 'JPG']:
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                rgb_img.paste(img, mask=img.split()[3])
                img = rgb_img
            
            img.save(file_path, format.upper())
            
            relative_path = f"/uploads/images/{filename}"
            logger.info(f"Saved image: {filename}")
            return relative_path
            
        except Exception as e:
            logger.error(f"Failed to save image {image_index}: {e}")
            return None
    
    def optimize_image(
        self,
        image_path: Path,
        max_width: int = 1920,
        max_height: int = 1080,
        quality: int = 85
    ) -> bool:
        """
        Optimize image size and quality
        
        Args:
            image_path: Path to image file
            max_width: Maximum width
            max_height: Maximum height
            quality: JPEG quality (1-100)
            
        Returns:
            True if optimization successful
        """
        try:
            img = Image.open(image_path)
            
            if img.width > max_width or img.height > max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            if image_path.suffix.lower() in ['.jpg', '.jpeg']:
                img.save(image_path, 'JPEG', quality=quality, optimize=True)
            else:
                img.save(image_path, optimize=True)
            
            logger.info(f"Optimized image: {image_path.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to optimize image {image_path}: {e}")
            return False
    
    def extract_images_from_page(
        self,
        page_data: any,
        document_id: str,
        page_num: int
    ) -> List[str]:
        """
        Extract all images from a PDF page
        
        Args:
            page_data: Page data from PDF reader
            document_id: Document identifier
            page_num: Page number
            
        Returns:
            List of saved image paths
        """
        saved_images = []
        
        try:
            if hasattr(page_data, 'images'):
                for idx, image in enumerate(page_data.images):
                    image_index = f"{page_num}_{idx + 1}"
                    
                    if hasattr(image, 'data'):
                        image_path = self.save_image(
                            image.data,
                            document_id,
                            image_index
                        )
                        if image_path:
                            saved_images.append(image_path)
                            
        except Exception as e:
            logger.error(f"Failed to extract images from page {page_num}: {e}")
        
        return saved_images
    
    def create_thumbnail(
        self,
        image_path: Path,
        size: Tuple[int, int] = (200, 200)
    ) -> Optional[Path]:
        """
        Create thumbnail for image
        
        Args:
            image_path: Path to original image
            size: Thumbnail size (width, height)
            
        Returns:
            Path to thumbnail or None if failed
        """
        try:
            img = Image.open(image_path)
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            thumb_path = image_path.parent / f"thumb_{image_path.name}"
            img.save(thumb_path)
            
            logger.info(f"Created thumbnail: {thumb_path.name}")
            return thumb_path
            
        except Exception as e:
            logger.error(f"Failed to create thumbnail for {image_path}: {e}")
            return None