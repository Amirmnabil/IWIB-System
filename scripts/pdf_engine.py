import sys
import json
import os
import io
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Circle
from reportlab.graphics import renderPDF

# Configure premium styles
styles = getSampleStyleSheet()
primary_color = colors.HexColor("#1e1b4b") # Deep Indigo
secondary_color = colors.HexColor("#4f46e5") # Indigo
accent_color = colors.HexColor("#f8fafc") # Slate 50
text_muted = colors.HexColor("#64748b")
highlight_color = colors.HexColor("#10b981") # Emerald

# Define Custom Styles
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=42,
    textColor=colors.white,
    alignment=0,
    spaceAfter=20,
    fontName='Helvetica-Bold',
    leading=48
)

h2_style = ParagraphStyle(
    'SectionHeader',
    parent=styles['Heading2'],
    fontSize=24,
    textColor=primary_color,
    borderLeftColor=secondary_color,
    borderLeftWidth=4,
    leftIndent=15,
    spaceBefore=30,
    spaceAfter=20,
    fontName='Helvetica-Bold'
)

body_style = ParagraphStyle(
    'Body',
    parent=styles['Normal'],
    fontSize=11,
    textColor=secondary_color,
    leading=14
)

def create_pricing_chart(plans, snapshots):
    plt.style.use('seaborn-v0_8-muted')
    names = [p['name'] for p in plans]
    premiums = [snapshots.get(p['id'], {}).get('premium', 0) for p in plans]
    
    fig, ax = plt.subplots(figsize=(8, 4))
    bars = ax.bar(names, premiums, color='#4f46e5', alpha=0.9, width=0.6)
    
    # Add labels on top of bars
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 500,
                f'{int(height):,}', ha='center', va='bottom', fontsize=10, fontweight='bold', color='#1e1b4b')

    ax.set_title('Annual Premium Comparison (EGP)', fontsize=14, pad=20, fontweight='bold', color='#1e293b')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.set_facecolor('#f8fafc')
    plt.tight_layout()
    
    img_data = io.BytesIO()
    plt.savefig(img_data, format='png', dpi=200, transparent=True)
    plt.close()
    img_data.seek(0)
    return img_data

def add_header_footer(canvas, doc):
    canvas.saveState()
    # Footer
    canvas.setFont('Helvetica-Bold', 8)
    canvas.setFillColor(text_muted)
    footer_text = "CONFIDENTIAL PROPOSAL | IWIB BROKERAGE | WWW.IWIB-EG.COM"
    canvas.drawCentredString(landscape(A4)[0]/2, 30, footer_text)
    canvas.drawRightString(landscape(A4)[0] - 40, 30, f"Page {doc.page}")
    
    # Header Line
    if doc.page > 1:
        canvas.setStrokeColor(secondary_color)
        canvas.setLineWidth(0.5)
        canvas.line(40, landscape(A4)[1] - 50, landscape(A4)[0] - 40, landscape(A4)[1] - 50)
    canvas.restoreState()

def generate_pdf(input_data, output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=landscape(A4),
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=60
    )
    
    story = []
    
    # --- 1. COVER PAGE ---
    # Background Box
    story.append(Spacer(1, 1*inch))
    
    cover_table_data = [
        [Paragraph(f"<font color='#818cf8' size='14'><b>EXECUTIVE PROPOSAL</b></font>", styles['Normal'])],
        [Paragraph(input_data.get('offerName', 'Medical Insurance Optimization'), title_style)],
        [Spacer(1, 0.2*inch)],
        [Paragraph(f"<font color='#cbd5e1' size='18'>Prepared for <b>{input_data.get('companyName', 'Valued Client')}</b></font>", styles['Normal'])],
    ]
    
    ct = Table(cover_table_data, colWidths=[7*inch])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), primary_color),
        ('LEFTPADDING', (0,0), (-1,-1), 40),
        ('RIGHTPADDING', (0,0), (-1,-1), 40),
        ('TOPPADDING', (0,0), (-1,-1), 60),
        ('BOTTOMPADDING', (0,0), (-1,-1), 60),
    ]))
    story.append(ct)
    
    story.append(Spacer(1, 0.5*inch))
    
    info_row = [
        [Paragraph(f"<b>Issue Date:</b> {input_data.get('date', 'N/A')}", body_style),
         Paragraph(f"<b>Reference:</b> {input_data.get('offerId', 'IWIB-PRP-001')}", body_style)]
    ]
    it = Table(info_row, colWidths=[4*inch, 4*inch])
    story.append(it)
    
    story.append(PageBreak())
    
    # --- 2. EXECUTIVE SUMMARY ---
    story.append(Paragraph("Strategic Market Overview", h2_style))
    story.append(Paragraph("A comprehensive data-driven analysis of the proposed insurance landscape for your organization.", styles['Normal']))
    story.append(Spacer(1, 0.4*inch))
    
    # Pricing Graph
    pricing_img = create_pricing_chart(input_data['plans'], input_data['snapshots'])
    story.append(KeepTogether([
        Image(pricing_img, width=8*inch, height=4*inch)
    ]))
    
    story.append(PageBreak())
    
    # --- 3. COMPARISON TABLES (Max 5 per page) ---
    plans = input_data['plans']
    for i in range(0, len(plans), 5):
        chunk = plans[i:i+5]
        story.append(Paragraph(f"Detailed Benefit Comparison (Part {i//5 + 1})", h2_style))
        
        # Prepare Table Data
        headers = [Paragraph("<b>Benefit / Coverage</b>", styles['Normal'])]
        for p in chunk:
            headers.append(Paragraph(f"<b>{p['company']}</b><br/><font size='8' color='#4f46e5'>{p['name']}</font>", styles['Normal']))
        
        table_data = [headers]
        
        key_benefits = [
            ('annualLimit', 'Annual Coverage Limit'),
            ('tpa', 'TPA Provider'),
            ('network', 'Medical Network'),
            ('inpatient', 'Inpatient Services'),
            ('medications', 'Outpatient Medications'),
            ('dental', 'Dental Benefits'),
            ('optical', 'Optical Benefits')
        ]
        
        for key, label in key_benefits:
            row = [Paragraph(f"<b>{label}</b>", styles['Normal'])]
            for p in chunk:
                val = p.get(key, 'N/A')
                row.append(Paragraph(str(val), styles['Normal']))
            table_data.append(row)
            
        # Add Premium Row
        premium_row = [Paragraph(f"<b>ANNUAL NET PREMIUM</b>", ParagraphStyle('Prem', parent=styles['Normal'], textColor=colors.white))]
        for p in chunk:
            prem = input_data['snapshots'].get(p['id'], {}).get('premium', 0)
            premium_row.append(Paragraph(f"<b>{int(prem):,} EGP</b>", ParagraphStyle('PremVal', parent=styles['Normal'], textColor=colors.white, alignment=1, fontSize=12)))
        table_data.append(premium_row)
        
        col_count = len(chunk) + 1
        t = Table(table_data, repeatRows=1, colWidths=[2*inch] + [1.5*inch]*len(chunk))
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), accent_color),
            ('BACKGROUND', (0,-1), (-1,-1), primary_color),
            ('GRID', (0,0), (-1,-2), 0.5, colors.lightgrey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ]))
        story.append(t)
        story.append(PageBreak())
    
    # --- 4. CONTACT PAGE ---
    story.append(Spacer(1, 1*inch))
    story.append(Paragraph("Let's Build the Future Together", title_style.clone('ContactTitle', textColor=primary_color, fontSize=36)))
    story.append(Paragraph("We look forward to a successful partnership. Reach out to our dedicated team anytime.", styles['Normal']))
    story.append(Spacer(1, 0.5*inch))
    
    contact_data = [
        [Paragraph("<b>HEADQUARTERS</b>", styles['Normal']), Paragraph("<b>DIGITAL CHANNELS</b>", styles['Normal'])],
        [Paragraph("5 El Nakheel St, Mohandessin<br/>Giza, Egypt", styles['Normal']), 
         Paragraph("Email: info@iwib-eg.com<br/>Web: www.iwib-eg.com", styles['Normal'])],
        [Spacer(1, 0.2*inch), Spacer(1, 0.2*inch)],
        [Paragraph("<b>DIRECT SUPPORT</b>", styles['Normal']), Paragraph("<b>REGULATORY</b>", styles['Normal'])],
        [Paragraph("Hotline: +20 101-333-0409", styles['Normal']), 
         Paragraph("Authorized Broker by the Financial<br/>Regulatory Authority (FRA)", styles['Normal'])]
    ]
    
    ct = Table(contact_data, colWidths=[4*inch, 4*inch])
    ct.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
    ]))
    story.append(ct)
    
    # Build the PDF
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Sample for testing
        print("Usage: python pdf_engine.py input.json output.pdf")
    else:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
        generate_pdf(data, sys.argv[2])

if __name__ == "__main__":
    if len(sys.argv) < 3:
        # For testing, generate a sample
        print("Usage: python pdf_engine.py input.json output.pdf")
    else:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
        generate_pdf(data, sys.argv[2])
