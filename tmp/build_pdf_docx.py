from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Mm


ROOT = Path(r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare")
IMAGE_DIR = ROOT / "tmp" / "pdf_source_render_200"
OUTPUT = ROOT / "output" / "Hafta2_Proje_Raporu_SecureShare.docx"


def configure_section(section):
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.top_margin = Mm(0)
    section.bottom_margin = Mm(0)
    section.left_margin = Mm(0)
    section.right_margin = Mm(0)
    section.header_distance = Mm(0)
    section.footer_distance = Mm(0)


def build():
    images = sorted(IMAGE_DIR.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[1]))
    if len(images) != 6:
        raise RuntimeError(f"Expected 6 rendered PDF pages, found {len(images)}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()
    configure_section(doc.sections[0])

    for index, image in enumerate(images):
        paragraph = doc.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_before = Mm(0)
        paragraph.paragraph_format.space_after = Mm(0)
        paragraph.paragraph_format.line_spacing = 1
        run = paragraph.add_run()
        run.add_picture(str(image), width=Mm(210), height=Mm(297))
        if index < len(images) - 1:
            # Keep each rendered page in its own Word page.
            doc.add_section(WD_SECTION.NEW_PAGE)
            configure_section(doc.sections[-1])

    # The source pages are the fidelity-preserving representation; set a descriptive title
    # without adding visible content to the reproduced pages.
    doc.core_properties.title = "Hafta2 Proje Raporu SecureShare"
    doc.core_properties.subject = "PDF içeriğinin sayfa düzeni korunmuş DOCX kopyası"
    doc.core_properties.author = "SecureShare"
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build()
