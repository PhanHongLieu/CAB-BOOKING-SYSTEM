import PyPDF2, re, sys
path=r'c:\Users\win\OneDrive - Industrial University of HoChiMinh City\Desktop\DHHTTT18-N13-cab-system\CAB-BOOKING-SYSTEM.pdf'
reader=PyPDF2.PdfReader(path)
for i,page in enumerate(reader.pages):
    text=page.extract_text()
    if text and re.search('ride', text, re.I):
        print('PAGE', i+1)
        print(text[:1000])
