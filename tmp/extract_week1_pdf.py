import sys
import pdfplumber

sys.stdout.reconfigure(encoding="utf-8")
path = sys.argv[1]
with pdfplumber.open(path) as pdf:
    print("PAGES", len(pdf.pages))
    for i, page in enumerate(pdf.pages, start=1):
        print(f"\n--- PAGE {i} ---")
        print(page.extract_text() or "")
