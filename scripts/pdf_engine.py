import sys
import json
import os
import io
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# Configure premium styles
styles = getSampleStyleSheet()
primary_color = colors.HexColor("#131A80") # IWIB Blue
secondary_color = colors.HexColor("#A52A2A") # IWIB Red
bg_dark = colors.HexColor("#0B0F52") # Deep Blue
text_muted = colors.HexColor("#64748b")
border_color = colors.HexColor("#2A3080")
accent_color = colors.HexColor("#f8fafc")

# Custom Paragraph Styles
title_style = ParagraphStyle(
    'CoverTitle',
    parent=styles['Heading1'],
    fontSize=32,
    textColor=colors.white,
    fontName='Helvetica-Bold',
    leading=38,
    spaceAfter=15
)

subtitle_style = ParagraphStyle(
    'CoverSub',
    parent=styles['Normal'],
    fontSize=14,
    textColor=colors.HexColor("#E4E6F5"),
    fontName='Helvetica-Oblique',
    leading=18
)

h2_style = ParagraphStyle(
    'SectionHeader',
    parent=styles['Heading2'],
    fontSize=20,
    textColor=primary_color,
    fontName='Helvetica-Bold',
    spaceBefore=15,
    spaceAfter=15
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontSize=10.5,
    textColor=colors.HexColor("#1f2937"),
    leading=14.5
)

body_white_style = ParagraphStyle(
    'BodyTextWhite',
    parent=styles['Normal'],
    fontSize=10,
    textColor=colors.white,
    leading=14
)

meta_label_style = ParagraphStyle(
    'MetaLabel',
    parent=styles['Normal'],
    fontSize=8,
    textColor=colors.HexColor("#E4E6F5"),
    fontName='Helvetica-Bold',
    leading=10
)

meta_val_style = ParagraphStyle(
    'MetaVal',
    parent=styles['Normal'],
    fontSize=10,
    textColor=colors.white,
    fontName='Helvetica-Bold',
    leading=12
)

pillar_title_style = ParagraphStyle(
    'PillarTitle',
    parent=styles['Normal'],
    fontSize=11,
    textColor=primary_color,
    fontName='Helvetica-Bold',
    leading=14
)

pillar_desc_style = ParagraphStyle(
    'PillarDesc',
    parent=styles['Normal'],
    fontSize=9.5,
    textColor=colors.HexColor("#4b5563"),
    leading=13.5
)

def create_pricing_chart(plans, snapshots):
    plt.style.use('seaborn-v0_8-muted')
    names = [p['name'] for p in plans]
    premiums = [snapshots.get(p['id'], {}).get('premium', 0) for p in plans]
    
    fig, ax = plt.subplots(figsize=(8, 3.5))
    bars = ax.bar(names, premiums, color='#131A80', alpha=0.9, width=0.5)
    
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 500,
                f'{int(height):,}', ha='center', va='bottom', fontsize=9, fontweight='bold', color='#0B0F52')

    ax.set_title('Annual Premium Comparison (EGP)', fontsize=12, pad=15, fontweight='bold', color='#1e293b')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_visible(False)
    ax.spines['bottom'].set_color('#cbd5e1')
    ax.get_yaxis().set_visible(False)
    ax.set_facecolor('#f8fafc')
    plt.tight_layout()
    
    img_data = io.BytesIO()
    plt.savefig(img_data, format='png', dpi=200, transparent=True)
    plt.close()
    img_data.seek(0)
    return img_data

def add_header_footer(canvas_obj, doc):
    canvas_obj.saveState()
    page_w, page_h = landscape(A4)
    
    # Disclaimer in Footer
    disclaimer = ("Disclaimer: This offer is based on the prices and terms published by the insurance companies "
                  "on the date of issuance and is for guidance purposes only and does not constitute a contractual obligation. "
                  "Final terms and prices are subject to approval and issuance by the insurance company after review of the "
                  "required documents and coverage.")
    
    canvas_obj.setFont('Helvetica', 6)
    canvas_obj.setFillColor(text_muted)
    
    # Simple split of disclaimer into two lines
    words = disclaimer.split(' ')
    mid = len(words) // 2
    line1 = " ".join(words[:mid+3])
    line2 = " ".join(words[mid+3:])
    
    canvas_obj.drawCentredString(page_w/2, 22, line1)
    canvas_obj.drawCentredString(page_w/2, 12, line2)
    
    # Page Info
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.setFillColor(primary_color)
    canvas_obj.drawRightString(page_w - 40, 30, f"Page {doc.page}")
    
    # Top Header Line
    if doc.page > 1:
        canvas_obj.setStrokeColor(secondary_color)
        canvas_obj.setLineWidth(0.5)
        canvas_obj.line(40, page_h - 40, page_w - 40, page_h - 40)
        
    canvas_obj.restoreState()

def generate_pdf(input_data, output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=landscape(A4),
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=60
    )
    
    # Attach input_data to doc so the header/footer callback can read it if needed
    doc.input_data = input_data
    story = []
    
    # --- PAGE 1: COVER PAGE ---
    story.append(Spacer(1, 0.4*inch))
    
    # Top Logo Header representation
    logo_data = [[
        Paragraph("<font color='#ffffff' size='22'><b>IWIB</b></font><br/><font color='#A52A2A' size='8'>INSURANCE BROKERAGE</font>", styles['Normal']),
        Paragraph(f"<font color='#cbd5e1' size='16'><b>{input_data.get('companyName', 'Valued Client')}</b></font>", ParagraphStyle('RAlign', parent=styles['Normal'], alignment=2))
    ]]
    logo_table = Table(logo_data, colWidths=[4*inch, 4*inch])
    logo_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15)
    ]))
    
    cover_table_data = [
        [logo_table],
        [Spacer(1, 0.3*inch)],
        [Paragraph("Medical Insurance Proposals Comparison", title_style)],
        [Paragraph("Your Strategic Partner For Elevating Your Corporate Insurance Experience", subtitle_style)],
        [Spacer(1, 0.4*inch)]
    ]
    
    # Expiry date (Issue Date + 30 Days)
    issue_date_str = input_data.get('date', 'N/A')
    expiry_date_str = 'N/A'
    try:
        dt = datetime.strptime(issue_date_str, '%d/%m/%yyyy')
        expiry_date_str = (dt + timedelta(days=30)).strftime('%d/%m/%Y')
    except:
        try:
            dt = datetime.strptime(issue_date_str, '%d/%m/%Y')
            expiry_date_str = (dt + timedelta(days=30)).strftime('%d/%m/%Y')
        except:
            expiry_date_str = issue_date_str
            
    # Member counts string
    member_counts = input_data.get('memberCounts', {})
    emp = member_counts.get('employee', 0)
    sp = member_counts.get('spouse', 0)
    ch = member_counts.get('child', 0)
    total_members_str = f"{emp} Emp, {sp} Sp, {ch} Ch"
    
    # 4 Meta blocks
    meta_table_data = [
        [
            Paragraph("ISSUE DATE", meta_label_style),
            Paragraph("EXPIRY DATE", meta_label_style),
            Paragraph("OFFER CODE", meta_label_style),
            Paragraph("TOTAL MEMBERS", meta_label_style)
        ],
        [
            Paragraph(issue_date_str, meta_val_style),
            Paragraph(expiry_date_str, meta_val_style),
            Paragraph(input_data.get('offerCode', 'SME-2026-IWIB'), meta_val_style),
            Paragraph(total_members_str, meta_val_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[2.2*inch]*4)
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0F1450")),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    cover_table_data.append([meta_table])
    
    ct = Table(cover_table_data, colWidths=[9.2*inch])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_dark),
        ('LEFTPADDING', (0,0), (-1,-1), 35),
        ('RIGHTPADDING', (0,0), (-1,-1), 35),
        ('TOPPADDING', (0,0), (-1,-1), 40),
        ('BOTTOMPADDING', (0,0), (-1,-1), 40),
    ]))
    story.append(ct)
    story.append(PageBreak())
    
    # --- PAGE 2: ABOUT IWIB ---
    story.append(Paragraph("About IWIB", h2_style))
    story.append(Spacer(1, 0.15*inch))
    
    about_text = (
        "At <b>IWIB</b>, we don't just provide insurance; we deliver a strategic partnership designed to "
        "protect your assets, empower your people, and optimize your financial performance. Here is how "
        "we add tangible value to our partners:"
    )
    
    # Left text box, Right visual highlights table
    left_p = Paragraph(about_text, body_style)
    
    right_box_data = [
        [Paragraph("<b>CORE VALUE FOCUS</b>", ParagraphStyle('RHeader', parent=styles['Normal'], fontSize=11, textColor=primary_color, fontName='Helvetica-Bold'))],
        [Paragraph("<font color='#A52A2A'><b>•</b></font> Asset & Risk Protection", body_style)],
        [Paragraph("<font color='#A52A2A'><b>•</b></font> Fully Managed Administration", body_style)],
        [Paragraph("<font color='#A52A2A'><b>•</b></font> 24/7 Support & Advisory Lines", body_style)],
        [Paragraph("<font color='#A52A2A'><b>•</b></font> FRA Authorized Regulation Compliance", body_style)]
    ]
    right_table = Table(right_box_data, colWidths=[3.8*inch])
    right_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    about_layout_data = [[left_p, right_table]]
    about_layout_table = Table(about_layout_data, colWidths=[5*inch, 4.2*inch])
    about_layout_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(about_layout_table)
    story.append(PageBreak())
    
    # --- PAGE 3: ADDED VALUE PILLARS ---
    story.append(Paragraph("Strategic Value Proposition", h2_style))
    story.append(Spacer(1, 0.1*inch))
    
    # Read cashback
    cashback = input_data.get('cashbackAmount')
    has_cashback = cashback is not None and float(cashback) > 0
    
    # Generate value pillars story items
    pillars_data = [
        [
            Paragraph("<b>1. Strategic Risk & Asset Management</b>", pillar_title_style),
            Paragraph("<b>2. Dedicated Operational Excellence</b>", pillar_title_style)
        ],
        [
            Paragraph("We provide a comprehensive shield for both individuals and corporations. By covering all insurance domains-from family protection to corporate assets-we enable our partners to manage risks effectively and achieve the highest possible ROI on their premiums.", pillar_desc_style),
            Paragraph("Our partners never navigate the complexities of insurance alone. Every client is assigned a dedicated Account Manager who acts as a professional liaison with insurance companies, ensuring seamless service and strict adherence to regulatory standards.", pillar_desc_style)
        ],
        [Spacer(1, 0.15*inch), Spacer(1, 0.15*inch)],
        [
            Paragraph("<b>3. Advanced Digital Transformation</b>", pillar_title_style),
            Paragraph("<b>4. Data-Driven Decision Making</b>", pillar_title_style)
        ],
        [
            Paragraph("We provide HR managers with an integrated digital ecosystem to revolutionize their workflow. This tool automates renewals, tracks employee coverage, and monitors budgets in real-time, significantly reducing administrative overhead and human error.", pillar_desc_style),
            Paragraph("<b>• Intelligent Renewals:</b> We utilize market data and current coverage analysis to provide proactive recommendations, ensuring renewal decisions are strategic.<br/><b>• AI Analytics:</b> AI-powered tools review consumption patterns and potential risks for smarter, data-backed adjustments.", pillar_desc_style)
        ],
        [Spacer(1, 0.15*inch), Spacer(1, 0.15*inch)],
        [
            Paragraph("<b>5. Specialized Advocacy & Support</b>", pillar_title_style),
            Paragraph("<b>6. Enhanced Beneficiary Well-being</b>", pillar_title_style)
        ],
        [
            Paragraph("<b>• Claims Advocacy:</b> Our specialized team provides analytical reports to help you understand risk root causes.<br/><b>• Expert Medical Review:</b> Our in-house physicians review rejected medical cases, advocating based on policy terms.", pillar_desc_style),
            Paragraph("<b>• Preventative Health:</b> Screenings and educational sessions promoting a culture of wellness.<br/><b>• Extended Family Benefits:</b> Medical discount cards for family members in non-covered cases.<br/>" + 
                      (f"<b>• Financial Flexibility:</b> Cashback incentives of <b>{int(float(cashback)):,} EGP</b> and value vouchers that cover exclusions." if has_cashback else ""), pillar_desc_style)
        ],
        [Spacer(1, 0.15*inch), Spacer(1, 0.15*inch)],
        [
            Paragraph("<b>7. Continuous Empowerment & Communication</b>", pillar_title_style),
            Paragraph("", pillar_title_style)
        ],
        [
            Paragraph("We believe in an informed partnership. We provide ongoing educational content to help you understand your rights and maximize your coverage. With our omnichannel communication (WhatsApp, Live Chat, Phone), expert support is always a click away.", pillar_desc_style),
            Paragraph("", pillar_desc_style)
        ]
    ]
    
    pillars_table = Table(pillars_data, colWidths=[4.5*inch, 4.5*inch])
    pillars_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(pillars_table)
    story.append(PageBreak())
    
    # --- PAGE 4: EXECUTIVE SUMMARY (Pricing Chart) ---
    story.append(Paragraph("Strategic Market Overview", h2_style))
    story.append(Paragraph("A comprehensive data-driven analysis of the proposed insurance landscape for your organization.", body_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Pricing Graph
    pricing_img = create_pricing_chart(input_data['plans'], input_data['snapshots'])
    story.append(KeepTogether([
        Image(pricing_img, width=8.5*inch, height=3.7*inch)
    ]))
    story.append(PageBreak())
    
    # --- PAGE 5: COMPARISON TABLES (Max 3 per page to avoid overflow and match React layout) ---
    plans = input_data['plans']
    for i in range(0, len(plans), 3):
        chunk = plans[i:i+3]
        story.append(Paragraph(f"Detailed Benefit Comparison (Part {i//3 + 1})", h2_style))
        
        # Prepare Table Data
        headers = [Paragraph("<b>Benefit / Coverage</b>", styles['Normal'])]
        for p in chunk:
            headers.append(Paragraph(f"<b>{p['company']}</b><br/><font size='8' color='#131A80'>{p['name']}</font>", styles['Normal']))
        
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
            premium_row.append(Paragraph(f"<b>{int(prem):,} EGP</b>", ParagraphStyle('PremVal', parent=styles['Normal'], textColor=colors.white, alignment=1, fontSize=11)))
        table_data.append(premium_row)
        
        t = Table(table_data, repeatRows=1, colWidths=[2.3*inch] + [2.2*inch]*len(chunk))
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), accent_color),
            ('BACKGROUND', (0,-1), (-1,-1), secondary_color),
            ('GRID', (0,0), (-1,-2), 0.5, colors.lightgrey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ]))
        story.append(t)
        story.append(PageBreak())
    
    # --- LAST PAGE: CONTACT & PARTNERSHIP ---
    story.append(Spacer(1, 0.4*inch))
    story.append(Paragraph("Let's Secure Your Future", title_style.clone('ContactTitle', textColor=primary_color, fontSize=30)))
    story.append(Paragraph("Building a long-term partnership based on trust and excellence.", body_style))
    story.append(Spacer(1, 0.3*inch))
    
    contact_data = [
        [
            Paragraph("<b>HEAD OFFICE</b>", styles['Normal']), 
            Paragraph("<b>SUPPORT HOTLINE</b>", styles['Normal'])
        ],
        [
            Paragraph("Visit us at Mohandessin<br/>5 El Nakheel St, Mohandessin, Giza, Egypt.<br/>Authorized Insurance Brokerage from FRA.", body_style), 
            Paragraph("+20 101-333-0409", ParagraphStyle('Hline', parent=styles['Normal'], fontSize=16, textColor=primary_color, fontName='Helvetica-Bold'))
        ],
        [Spacer(1, 0.2*inch), Spacer(1, 0.2*inch)],
        [
            Paragraph("<b>EMAIL ENQUIRIES</b>", styles['Normal']), 
            Paragraph("<b>OFFICIAL WEBSITE</b>", styles['Normal'])
        ],
        [
            Paragraph("info@iwib-eg.com", body_style), 
            Paragraph("www.iwib-eg.com", body_style)
        ]
    ]
    
    ct = Table(contact_data, colWidths=[4.6*inch, 4.6*inch])
    ct.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(ct)
    
    # Build the PDF
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_engine.py input.json output.pdf")
    else:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
        generate_pdf(data, sys.argv[2])
