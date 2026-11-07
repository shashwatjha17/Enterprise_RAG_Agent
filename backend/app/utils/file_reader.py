import os
import tempfile
from typing import Optional
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Import extraction libraries with error handling
try:
    import fitz  # pymupdf
except ImportError as e:
    logger.error(f"Failed to import pymupdf: {e}")
    fitz = None

try:
    import pdfplumber
except ImportError as e:
    logger.error(f"Failed to import pdfplumber: {e}")
    pdfplumber = None

try:
    import docx
except ImportError as e:
    logger.error(f"Failed to import python-docx: {e}")
    docx = None

try:
    from pptx import Presentation
except ImportError as e:
    logger.error(f"Failed to import python-pptx: {e}")
    Presentation = None

try:
    from PIL import Image
except ImportError as e:
    logger.error(f"Failed to import PIL: {e}")
    Image = None

import io  

# OCR imports (only used in comprehensive mode)
try:
    import pytesseract
    from pdf2image import convert_from_path
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logger.info("OCR libraries not available. Install pytesseract and pdf2image for comprehensive mode.")

# Advanced extraction libraries
try:
    from unstructured.partition.pdf import partition_pdf
    from unstructured.staging.base import elements_to_json
    UNSTRUCTURED_AVAILABLE = True
    logger.info("Unstructured library is available for high-accuracy PDF extraction")
except ImportError:
    UNSTRUCTURED_AVAILABLE = False
    logger.info("Unstructured not available. Install with: pip install 'unstructured[local-inference]'")

try:
    import camelot
    CAMELOT_AVAILABLE = True
    logger.info("Camelot library is available for advanced table extraction")
except ImportError:
    CAMELOT_AVAILABLE = False
    logger.info("Camelot not available. Install with: pip install 'camelot-py[cv]'")


def read_file_content(filename: str, content: bytes, mode: str = "fast") -> str:
    """
    Extract text from various file types.

    Args:
        filename: Name of the file
        content: File content as bytes
        mode: 'fast' for basic extraction or 'comprehensive' for OCR-enabled extraction

    Returns:
        Extracted text content
    """
    logger.info(f"[file_reader] Starting extraction for {filename}, mode={mode}")

    if mode not in ["fast", "comprehensive"]:
        raise ValueError("Mode must be 'fast' or 'comprehensive'")

    filename_lower = filename.lower()

    # Handle text files directly
    if filename_lower.endswith(".txt"):
        logger.info(f"[file_reader] Processing as TXT file")
        return _read_text_file(content)

    if filename_lower.endswith(".md"):
        logger.info(f"[file_reader] Processing as Markdown file")
        return _read_text_file(content)

    # For other files, write to temp file
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        logger.info(f"[file_reader] Created temp file: {tmp_path}")

        if filename_lower.endswith(".pdf"):
            logger.info(f"[file_reader] Processing as PDF file, mode={mode}")
            if mode == "fast":
                result = _read_pdf_fast(tmp_path)
            else:
                result = _read_pdf_comprehensive(tmp_path)
            logger.info(f"[file_reader] PDF extraction complete, extracted {len(result)} characters")
            return result

        elif filename_lower.endswith(".docx"):
            logger.info(f"[file_reader] Processing as DOCX file")
            result = _read_docx(tmp_path, mode)
            logger.info(f"[file_reader] DOCX extraction complete, extracted {len(result)} characters")
            return result

        elif filename_lower.endswith(".pptx"):
            logger.info(f"[file_reader] Processing as PPTX file")
            result = _read_pptx(tmp_path, mode)
            logger.info(f"[file_reader] PPTX extraction complete, extracted {len(result)} characters")
            return result

        else:
            raise ValueError(f"Unsupported file type: {filename}")

    except Exception as e:
        logger.error(f"[file_reader] Error extracting text from {filename}: {e}", exc_info=True)
        raise
    finally:
        # Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
                logger.debug(f"[file_reader] Cleaned up temp file: {tmp_path}")
            except Exception as e:
                logger.warning(f"[file_reader] Failed to clean up temp file {tmp_path}: {e}")


def _read_text_file(content: bytes) -> str:
    """Read plain text files with encoding detection."""
    encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']

    for encoding in encodings:
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue

    # Fallback: decode with errors ignored
    return content.decode('utf-8', errors='ignore')


def _read_pdf_fast(pdf_path: str) -> str:
    """Fast PDF extraction using pymupdf."""
    if fitz is None:
        raise ImportError("pymupdf is not installed. Run: pip install pymupdf")

    try:
        logger.info(f"[_read_pdf_fast] Opening PDF: {pdf_path}")
        doc = fitz.open(pdf_path)
        logger.info(f"[_read_pdf_fast] PDF has {len(doc)} pages")
        text_parts = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            logger.debug(f"[_read_pdf_fast] Page {page_num + 1}: extracted {len(text)} chars")
            if text.strip():
                text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

        doc.close()
        result = "\n\n".join(text_parts) if text_parts else ""
        logger.info(f"[_read_pdf_fast] Total text extracted: {len(result)} characters from {len(text_parts)} pages")
        return result
    except Exception as e:
        logger.error(f"Error reading PDF with pymupdf: {e}", exc_info=True)
        raise


def _read_pdf_comprehensive(pdf_path: str) -> str:
    """
    Comprehensive PDF extraction with Unstructured (primary), Camelot (tables), and OCR fallback.

    Pipeline:
    1. Try Unstructured for high-accuracy markdown extraction (tables, figures, structure)
    2. Enhance tables with Camelot for superior accuracy
    3. Fallback to pdfplumber + OCR if Unstructured unavailable
    """
    logger.info(f"[_read_pdf_comprehensive] Starting comprehensive extraction: {pdf_path}")

    # Primary: Try Unstructured for high-accuracy markdown extraction
    if UNSTRUCTURED_AVAILABLE:
        try:
            logger.info(f"[_read_pdf_comprehensive] Using Unstructured for extraction...")
            markdown_text = _extract_with_unstructured(pdf_path)

            if markdown_text and len(markdown_text.strip()) > 100:
                logger.info(f"[_read_pdf_comprehensive] Unstructured extracted {len(markdown_text)} characters")

                # Optional: Enhance tables with Camelot for better accuracy
                if CAMELOT_AVAILABLE:
                    try:
                        enhanced_text = _enhance_tables_with_camelot(pdf_path, markdown_text)
                        if enhanced_text:
                            logger.info(f"[_read_pdf_comprehensive] Enhanced with Camelot tables")
                            return enhanced_text
                    except Exception as e:
                        logger.warning(f"[_read_pdf_comprehensive] Camelot enhancement failed: {e}")

                return markdown_text
            else:
                logger.warning(f"[_read_pdf_comprehensive] Unstructured extraction yielded minimal content")
        except Exception as e:
            logger.warning(f"[_read_pdf_comprehensive] Unstructured extraction failed: {e}")
    else:
        logger.info(f"[_read_pdf_comprehensive] Unstructured not available, using fallback methods")

    # Fallback 1: Try Camelot for table-heavy documents
    if CAMELOT_AVAILABLE:
        try:
            logger.info(f"[_read_pdf_comprehensive] Trying Camelot extraction...")
            camelot_text = _extract_with_camelot(pdf_path)
            if camelot_text and len(camelot_text.strip()) > 100:
                logger.info(f"[_read_pdf_comprehensive] Camelot extracted {len(camelot_text)} characters")
                return camelot_text
        except Exception as e:
            logger.warning(f"[_read_pdf_comprehensive] Camelot extraction failed: {e}")

    # Fallback 2: pdfplumber with OCR
    if pdfplumber is None:
        raise ImportError("pdfplumber is not installed. Run: pip install pdfplumber")

    try:
        logger.info(f"[_read_pdf_comprehensive] Using pdfplumber + OCR fallback...")
        text_parts = []

        # Extract text and tables with pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            logger.info(f"[_read_pdf_comprehensive] PDF has {len(pdf.pages)} pages")

            for page_num, page in enumerate(pdf.pages, 1):
                page_text = f"--- Page {page_num} ---\n"

                # Extract regular text
                text = page.extract_text()
                if text and text.strip():
                    logger.debug(f"[_read_pdf_comprehensive] Page {page_num}: extracted {len(text)} chars")
                    page_text += text + "\n"
                else:
                    logger.debug(f"[_read_pdf_comprehensive] Page {page_num}: no text extracted")

                # Extract tables as markdown
                tables = page.extract_tables()
                if tables:
                    logger.info(f"[_read_pdf_comprehensive] Page {page_num}: found {len(tables)} tables")
                    for table_num, table in enumerate(tables, 1):
                        page_text += f"\n**Table {table_num}:**\n"
                        page_text += _table_to_markdown(table) + "\n"

                if page_text.strip() != f"--- Page {page_num} ---":
                    text_parts.append(page_text)

        logger.info(f"[_read_pdf_comprehensive] Extracted text from {len(text_parts)} pages using pdfplumber")

        # If no text was extracted and OCR is available, try OCR
        if not text_parts:
            logger.warning(f"[_read_pdf_comprehensive] No text extracted with pdfplumber")
            if OCR_AVAILABLE:
                logger.info(f"[_read_pdf_comprehensive] Attempting OCR extraction...")
                text_parts = _ocr_pdf(pdf_path)
                logger.info(f"[_read_pdf_comprehensive] OCR extracted text from {len(text_parts)} pages")
            else:
                logger.warning(f"[_read_pdf_comprehensive] OCR not available. Install pytesseract and pdf2image for scanned PDF support.")
                # Try pymupdf as fallback
                logger.info(f"[_read_pdf_comprehensive] Trying pymupdf as fallback...")
                try:
                    fallback_text = _read_pdf_fast(pdf_path)
                    if fallback_text:
                        logger.info(f"[_read_pdf_comprehensive] Pymupdf fallback extracted {len(fallback_text)} characters")
                        return fallback_text
                except Exception as e:
                    logger.error(f"[_read_pdf_comprehensive] Pymupdf fallback also failed: {e}")

        result = "\n\n".join(text_parts) if text_parts else ""
        logger.info(f"[_read_pdf_comprehensive] Final result: {len(result)} characters")
        return result
    except Exception as e:
        logger.error(f"Error reading PDF with pdfplumber: {e}", exc_info=True)
        raise


def _extract_with_unstructured(pdf_path: str) -> str:
    """
    Extract PDF to markdown using Unstructured.

    Unstructured provides:
    - High-accuracy text extraction with layout analysis
    - Proper table structure (markdown tables)
    - Figure detection with references
    - Multi-column layout support
    - Document structure preservation (headings, lists, etc.)
    """
    if not UNSTRUCTURED_AVAILABLE:
        raise ImportError("Unstructured is not installed. Run: pip install 'unstructured[local-inference]'")

    try:
        logger.info(f"[_extract_with_unstructured] Processing PDF: {pdf_path}")

        # Partition PDF into elements with high-resolution strategy
        # strategy="hi_res" uses vision models for better layout detection
        elements = partition_pdf(
            filename=pdf_path,
            strategy="hi_res",  # Use AI models for better accuracy
            infer_table_structure=True,  # Extract table structure
            extract_images_in_pdf=True,  # Detect images/figures
            extract_image_block_types=["Image", "Table"],  # What to extract
            # chunking_strategy=None,  # Don't chunk, get full content
            # max_characters=None,  # No limit
        )

        logger.info(f"[_extract_with_unstructured] Extracted {len(elements)} elements")

        # Convert elements to markdown format
        markdown_parts = []
        table_count = 0
        figure_count = 0

        for element in elements:
            element_type = type(element).__name__

            # Handle different element types
            if element_type == "Title":
                # Main title
                markdown_parts.append(f"# {element.text}\n")

            elif element_type == "NarrativeText":
                # Regular paragraph text
                markdown_parts.append(f"{element.text}\n")

            elif element_type == "Table":
                # Table element - convert to markdown table
                table_count += 1
                markdown_parts.append(f"\n**Table {table_count}:**\n")

                # Get table as HTML and convert to markdown
                if hasattr(element, 'metadata') and hasattr(element.metadata, 'text_as_html'):
                    # Parse HTML table to markdown
                    try:
                        import pandas as pd
                        from io import StringIO
                        df = pd.read_html(StringIO(element.metadata.text_as_html))[0]
                        markdown_parts.append(df.to_markdown(index=False))
                    except Exception:
                        # Fallback to plain text
                        markdown_parts.append(element.text)
                else:
                    markdown_parts.append(element.text)

                markdown_parts.append("\n")

            elif element_type == "Image":
                # Figure/Image element
                figure_count += 1
                markdown_parts.append(f"\n**Figure {figure_count}:** [Image detected]\n")

            elif element_type == "ListItem":
                # List item
                markdown_parts.append(f"- {element.text}\n")

            elif element_type in ["Header", "Footer"]:
                # Skip headers/footers or add as small text
                pass

            else:
                # Other text elements
                if hasattr(element, 'text') and element.text:
                    markdown_parts.append(f"{element.text}\n")

        # Join all parts
        full_text = "\n".join(markdown_parts)

        logger.info(f"[_extract_with_unstructured] Conversion complete:")
        logger.info(f"  - Text length: {len(full_text)} characters")
        logger.info(f"  - Tables found: {table_count}")
        logger.info(f"  - Figures found: {figure_count}")

        return full_text

    except Exception as e:
        logger.error(f"[_extract_with_unstructured] Unstructured extraction failed: {e}", exc_info=True)
        raise


def _extract_with_camelot(pdf_path: str) -> str:
    """
    Extract tables from PDF using Camelot.

    Camelot specializes in table extraction with two modes:
    - 'lattice': For bordered tables (more accurate)
    - 'stream': For borderless tables
    """
    if not CAMELOT_AVAILABLE:
        raise ImportError("Camelot is not installed. Run: pip install 'camelot-py[cv]'")

    try:
        logger.info(f"[_extract_with_camelot] Extracting tables from: {pdf_path}")

        all_text = []

        # Try lattice method first (for bordered tables)
        try:
            tables = camelot.read_pdf(pdf_path, pages='all', flavor='lattice')
            logger.info(f"[_extract_with_camelot] Lattice method found {len(tables)} tables")

            if len(tables) > 0:
                for i, table in enumerate(tables):
                    all_text.append(f"\n## Table {i+1} (Page {table.page})\n")
                    all_text.append(table.df.to_markdown(index=False))
                    all_text.append("\n")
        except Exception as e:
            logger.warning(f"[_extract_with_camelot] Lattice method failed: {e}")

        # If lattice didn't find tables, try stream method
        if not all_text:
            try:
                tables = camelot.read_pdf(pdf_path, pages='all', flavor='stream')
                logger.info(f"[_extract_with_camelot] Stream method found {len(tables)} tables")

                if len(tables) > 0:
                    for i, table in enumerate(tables):
                        all_text.append(f"\n## Table {i+1} (Page {table.page})\n")
                        all_text.append(table.df.to_markdown(index=False))
                        all_text.append("\n")
            except Exception as e:
                logger.warning(f"[_extract_with_camelot] Stream method failed: {e}")

        result = "\n".join(all_text)
        logger.info(f"[_extract_with_camelot] Extracted {len(result)} characters from tables")
        return result

    except Exception as e:
        logger.error(f"[_extract_with_camelot] Camelot extraction failed: {e}", exc_info=True)
        raise


def _enhance_tables_with_camelot(pdf_path: str, markdown_text: str) -> str:
    """
    Enhance Marker-extracted markdown with Camelot's superior table extraction.

    This function:
    1. Detects if there are tables in the markdown
    2. Extracts tables with Camelot
    3. Replaces/enhances table sections in markdown
    """
    if not CAMELOT_AVAILABLE:
        return markdown_text

    try:
        logger.info(f"[_enhance_tables_with_camelot] Checking for tables to enhance...")

        # Extract tables with Camelot
        tables = camelot.read_pdf(pdf_path, pages='all', flavor='lattice')

        if len(tables) == 0:
            # Try stream flavor
            tables = camelot.read_pdf(pdf_path, pages='all', flavor='stream')

        if len(tables) == 0:
            logger.info(f"[_enhance_tables_with_camelot] No tables found by Camelot")
            return markdown_text

        logger.info(f"[_enhance_tables_with_camelot] Found {len(tables)} tables to add")

        # Append Camelot-extracted tables to the markdown
        enhanced_text = markdown_text + "\n\n## Enhanced Tables (Camelot)\n\n"

        for i, table in enumerate(tables):
            enhanced_text += f"\n### Table {i+1} (Page {table.page})\n\n"
            enhanced_text += table.df.to_markdown(index=False)
            enhanced_text += "\n\n"

        logger.info(f"[_enhance_tables_with_camelot] Added {len(tables)} enhanced tables")
        return enhanced_text

    except Exception as e:
        logger.warning(f"[_enhance_tables_with_camelot] Enhancement failed: {e}")
        return markdown_text


def _ocr_pdf(pdf_path: str) -> list:
    """OCR a PDF file."""
    if not OCR_AVAILABLE:
        logger.warning("[_ocr_pdf] OCR libraries not installed. Install pytesseract and pdf2image.")
        return []

    text_parts = []
    try:
        logger.info(f"[_ocr_pdf] Converting PDF to images: {pdf_path}")
        images = convert_from_path(pdf_path)
        logger.info(f"[_ocr_pdf] Converted to {len(images)} images, starting OCR...")

        for page_num, image in enumerate(images, 1):
            logger.info(f"[_ocr_pdf] Processing page {page_num}/{len(images)}")
            text = pytesseract.image_to_string(image)
            if text.strip():
                logger.info(f"[_ocr_pdf] Page {page_num}: extracted {len(text)} characters")
                text_parts.append(f"--- Page {page_num} (OCR) ---\n{text}")
            else:
                logger.warning(f"[_ocr_pdf] Page {page_num}: no text detected")

        logger.info(f"[_ocr_pdf] OCR complete, extracted text from {len(text_parts)} pages")
    except FileNotFoundError as e:
        logger.error(f"[_ocr_pdf] Tesseract OCR not found. Please install Tesseract: {e}")
        logger.error("[_ocr_pdf] Installation guide: https://tesseract-ocr.github.io/tessdoc/Installation.html")
    except Exception as e:
        logger.error(f"[_ocr_pdf] OCR failed: {e}", exc_info=True)

    return text_parts


def _read_docx(docx_path: str, mode: str) -> str:
    """Extract text from DOCX files including tables."""
    if docx is None:
        raise ImportError("python-docx is not installed. Run: pip install python-docx")

    try:
        logger.info(f"[_read_docx] Opening DOCX: {docx_path}")
        doc = docx.Document(docx_path)
        text_parts = []

        # Extract paragraphs and tables in order
        for element in doc.element.body:
            if element.tag.endswith('p'):
                # Paragraph
                for para in doc.paragraphs:
                    if para._element == element:
                        if para.text.strip():
                            text_parts.append(para.text)
                        break

            elif element.tag.endswith('tbl'):
                # Table
                for table in doc.tables:
                    if table._element == element:
                        text_parts.append("\n**Table:**")
                        table_data = []
                        for row in table.rows:
                            table_data.append([cell.text.strip() for cell in row.cells])
                        text_parts.append(_table_to_markdown(table_data))
                        break

        text = "\n".join(text_parts)
        logger.info(f"[_read_docx] Extracted {len(text)} characters from paragraphs and tables")

        # OCR images in comprehensive mode
        if mode == "comprehensive" and OCR_AVAILABLE:
            images_text = _extract_images_from_docx(doc)
            if images_text:
                text += "\n\n--- Extracted from Images ---\n" + images_text
                logger.info(f"[_read_docx] Added {len(images_text)} characters from image OCR")

        return text
    except Exception as e:
        logger.error(f"Error reading DOCX: {e}", exc_info=True)
        raise


def _read_pptx(pptx_path: str, mode: str) -> str:
    """Extract text from PowerPoint files."""
    if Presentation is None:
        raise ImportError("python-pptx is not installed. Run: pip install python-pptx")

    try:
        logger.info(f"[_read_pptx] Opening PPTX: {pptx_path}")
        prs = Presentation(pptx_path)
        logger.info(f"[_read_pptx] Presentation has {len(prs.slides)} slides")
        text_parts = []

        for slide_num, slide in enumerate(prs.slides, 1):
            slide_text = f"--- Slide {slide_num} ---\n"

            # Extract text from shapes
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_text += shape.text + "\n"

                # Extract tables
                if shape.has_table:
                    slide_text += "\n**Table:**\n"
                    table_data = []
                    for row in shape.table.rows:
                        table_data.append([cell.text.strip() for cell in row.cells])
                    slide_text += _table_to_markdown(table_data) + "\n"

            if slide_text.strip() != f"--- Slide {slide_num} ---":
                text_parts.append(slide_text)

            # OCR images in comprehensive mode
            if mode == "comprehensive" and OCR_AVAILABLE and Image is not None:
                for shape in slide.shapes:
                    if hasattr(shape, "image"):
                        try:
                            image_bytes = shape.image.blob
                            image = Image.open(io.BytesIO(image_bytes))
                            ocr_text = pytesseract.image_to_string(image)
                            if ocr_text.strip():
                                text_parts.append(f"\n--- Image OCR (Slide {slide_num}) ---\n{ocr_text}")
                        except Exception as e:
                            logger.warning(f"Failed to OCR image in slide {slide_num}: {e}")

        result = "\n\n".join(text_parts)
        logger.info(f"[_read_pptx] Extracted {len(result)} characters from {len(text_parts)} slides")
        return result
    except Exception as e:
        logger.error(f"Error reading PPTX: {e}", exc_info=True)
        raise


def _extract_images_from_docx(doc) -> str:
    """Extract and OCR images from DOCX."""
    if not OCR_AVAILABLE:
        return ""

    images_text = []

    try:
        for rel in doc.part.rels.values():
            if "image" in rel.target_ref:
                try:
                    image_bytes = rel.target_part.blob
                    image = Image.open(io.BytesIO(image_bytes))
                    text = pytesseract.image_to_string(image)
                    if text.strip():
                        images_text.append(text)
                except Exception:
                    pass
    except Exception:
        pass

    return "\n".join(images_text)


def _table_to_markdown(table_data: list) -> str:
    """Convert table data to markdown format."""
    if not table_data:
        return ""

    # Handle None values
    table_data = [[cell if cell is not None else "" for cell in row] for row in table_data]

    # Calculate column widths
    col_widths = []
    for col_idx in range(len(table_data[0])):
        max_width = max(len(str(row[col_idx])) for row in table_data)
        col_widths.append(max(max_width, 3))  # Minimum width of 3

    # Build markdown table
    lines = []

    # Header row
    header = "| " + " | ".join(str(cell).ljust(width) for cell, width in zip(table_data[0], col_widths)) + " |"
    lines.append(header)

    # Separator
    separator = "| " + " | ".join("-" * width for width in col_widths) + " |"
    lines.append(separator)

    # Data rows
    for row in table_data[1:]:
        row_text = "| " + " | ".join(str(cell).ljust(width) for cell, width in zip(row, col_widths)) + " |"
        lines.append(row_text)

    return "\n".join(lines)
