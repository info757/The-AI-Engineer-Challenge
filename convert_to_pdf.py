#!/usr/bin/env python3
"""
Simple HTML to PDF converter using weasyprint
"""

try:
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    import os
    
    def html_to_pdf(html_file, pdf_file):
        """Convert HTML file to PDF"""
        font_config = FontConfiguration()
        
        # Read the HTML file
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Create HTML object
        html_doc = HTML(string=html_content)
        
        # Additional CSS for better PDF formatting
        css_string = """
        @page {
            size: A4;
            margin: 1in;
        }
        body {
            font-size: 12pt;
            line-height: 1.4;
        }
        h1 {
            font-size: 18pt;
            page-break-before: always;
        }
        h1:first-child {
            page-break-before: avoid;
        }
        h2 {
            font-size: 14pt;
            page-break-before: avoid;
        }
        h3 {
            font-size: 12pt;
        }
        .toc {
            page-break-after: always;
        }
        table {
            page-break-inside: avoid;
        }
        """
        
        css_doc = CSS(string=css_string, font_config=font_config)
        
        # Generate PDF
        html_doc.write_pdf(pdf_file, stylesheets=[css_doc], font_config=font_config)
        print(f"Successfully created {pdf_file}")
        
    if __name__ == "__main__":
        html_to_pdf("HVAC_Technician_Guide.html", "HVAC_Technician_Guide.pdf")
        
except ImportError:
    print("weasyprint not available. Trying alternative method...")
    
    try:
        import pdfkit
        import os
        
        def html_to_pdf_pdfkit(html_file, pdf_file):
            """Convert HTML to PDF using pdfkit (requires wkhtmltopdf)"""
            options = {
                'page-size': 'A4',
                'margin-top': '1in',
                'margin-right': '1in',
                'margin-bottom': '1in',
                'margin-left': '1in',
                'encoding': "UTF-8",
                'no-outline': None
            }
            
            pdfkit.from_file(html_file, pdf_file, options=options)
            print(f"Successfully created {pdf_file}")
        
        if __name__ == "__main__":
            html_to_pdf_pdfkit("HVAC_Technician_Guide.html", "HVAC_Technician_Guide.pdf")
            
    except ImportError:
        print("Neither weasyprint nor pdfkit available.")
        print("Please install one of the following:")
        print("  pip install weasyprint")
        print("  pip install pdfkit")
        print("  (pdfkit also requires wkhtmltopdf binary)")
        print("\nAlternatively, you can:")
        print("1. Open HVAC_Technician_Guide.html in your browser")
        print("2. Print to PDF (Ctrl+P or Cmd+P)")
        print("3. Save as PDF")
