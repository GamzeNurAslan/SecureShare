from docx import Document

path = r"C:\Users\Lenovo\OneDrive\Belgeler\ChatGPT\SecureShare\docs\requirements-analysis-detailed.docx"
doc = Document(path)
old = 'Hazırlayan: Gamze Nur Aslan ve proje ekibi'
new = 'Hazırlayanlar: Gamze Nur Aslan, Büşra Özer ve Hava Şener'
for paragraph in doc.paragraphs:
    if old in paragraph.text:
        for run in paragraph.runs:
            if old in run.text:
                run.text = run.text.replace(old, new)
doc.save(path)
print(path)
