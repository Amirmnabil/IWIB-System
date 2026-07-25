import sys
import json
import os
import io
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# Configure premium style sheets
styles = getSampleStyleSheet()

# Luxury Brand Color Palette (White + Orange Theme)
primary_color = colors.HexColor("#FF991F")    # IWIB Orange
secondary_color = colors.HexColor("#1e293b")  # Slate Charcoal
text_dark = colors.HexColor("#0f172a")        # Deep charcoal/almost-black
text_muted = colors.HexColor("#64748b")       # Muted slate
border_color = colors.HexColor("#cbd5e1")     # Slate-300 border
bg_light = colors.HexColor("#FAF9F6")         # Soft beige/cream surface
bg_card = colors.HexColor("#F8FAFC")          # Light slate card surface

# Redefine Typography Styles for Premium Editorial Look
title_style = ParagraphStyle(
    'CoverTitle',
    parent=styles['Heading1'],
    fontSize=26,
    textColor=secondary_color,
    fontName='Helvetica-Bold',
    leading=32,
    spaceAfter=15,
    alignment=1
)

subtitle_style = ParagraphStyle(
    'CoverSub',
    parent=styles['Normal'],
    fontSize=13,
    textColor=primary_color,
    fontName='Helvetica-Oblique',
    leading=17,
    alignment=1
)

h2_style = ParagraphStyle(
    'SectionHeader',
    parent=styles['Heading2'],
    fontSize=18,
    textColor=secondary_color,
    fontName='Helvetica-Bold',
    spaceBefore=15,
    spaceAfter=10,
    leading=22
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontSize=10,
    textColor=text_dark,
    leading=14.5
)

body_bold_style = ParagraphStyle(
    'BodyTextBold',
    parent=body_style,
    fontName='Helvetica-Bold'
)

def add_header_footer(canvas_obj, doc):
    canvas_obj.saveState()
    page_w, page_h = A4
    
    # Premium luxury disclaimer in footer
    disclaimer = ("Disclaimer: This offer is based on the prices and terms published by the insurance companies "
                  "on the date of issuance and is for guidance purposes only and does not constitute a contractual obligation. "
                  "Final terms and prices are subject to approval and issuance by the insurance company after review of the "
                  "required documents and coverage.")
    
    canvas_obj.setFont('Helvetica', 5.5)
    canvas_obj.setFillColor(text_muted)
    
    # Split disclaimer into two balanced lines
    words = disclaimer.split(' ')
    mid = len(words) // 2
    line1 = " ".join(words[:mid+3])
    line2 = " ".join(words[mid+3:])
    
    canvas_obj.drawCentredString(page_w/2, 22, line1)
    canvas_obj.drawCentredString(page_w/2, 14, line2)
    
    # Clean page counter
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.setFillColor(primary_color)
    canvas_obj.drawRightString(page_w - 40, 30, f"Page {doc.page}")
    
    # Top Header design for standard pages
    if doc.page > 1:
        canvas_obj.setStrokeColor(primary_color)
        canvas_obj.setLineWidth(0.75)
        canvas_obj.line(40, page_h - 40, page_w - 40, page_h - 40)
        
        # Logo image top-left
        logo_path = os.path.join(os.getcwd(), 'public', 'iwib-logo-attached.png')
        if os.path.exists(logo_path):
            canvas_obj.drawImage(logo_path, 40, page_h - 35, width=0.85*inch, height=0.34*inch, mask='auto')
        else:
            canvas_obj.setFont('Helvetica-Bold', 8)
            canvas_obj.drawString(40, page_h - 35, "IWIB")
            
        canvas_obj.setFont('Helvetica-Bold', 7.5)
        canvas_obj.setFillColor(text_muted)
        canvas_obj.drawRightString(page_w - 40, page_h - 32, doc.input_data.get('companyName', 'VALUED CLIENT').upper())
        
    canvas_obj.restoreState()

def generate_pdf(input_data, output_path):
    # Establish Portrait DocTemplate
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=50,
        bottomMargin=55
    )
    
    doc.input_data = input_data
    story = []
    
    # Expiry date (Issue Date + 30 Days)
    issue_date_str = input_data.get('date', 'N/A')
    expiry_date_str = 'N/A'
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
    
    # --- PAGE 1: COVER PAGE (WHITE PORTRAIT LUXURY MINIMAL) ---
    story.append(Spacer(1, 0.4*inch))
    
    # Center Logo image (using attached logo)
    logo_path = os.path.join(os.getcwd(), 'public', 'iwib-logo-attached.png')
    if os.path.exists(logo_path):
        logo_img = Image(logo_path, width=3.2*inch, height=1.28*inch)
        logo_table = Table([[logo_img]], colWidths=[7.1*inch])
        logo_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(logo_table)
    else:
        logo_html = ("<para align='center'>"
                     "<font color='#FF991F' size='56'><b>IWIB</b></font><br/>"
                     "<font color='#64748b' size='11' face='Helvetica'><b>I N S U R A N C E   B R O K E R A G E</b></font>"
                     "</para>")
        logo_p = Paragraph(logo_html, ParagraphStyle('LogoCenter', parent=styles['Normal'], alignment=1))
        story.append(logo_p)
        
    story.append(Spacer(1, 0.8*inch))
    
    # Thin divider line
    divider_table = Table([[""]], colWidths=[7.1*inch])
    divider_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1, primary_color),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider_table)
    story.append(Spacer(1, 0.4*inch))
    
    # Client name in elegant, large spaced typography
    client_html = (f"<para align='center'>"
                   f"<font color='#64748b' size='13' face='Helvetica-Bold'>PROPOSAL PREPARED FOR</font><br/><br/>"
                   f"<font color='#1e293b' size='36' face='Helvetica-Bold'>{input_data.get('companyName', 'Vinnys Pizza')}</font>"
                   f"</para>")
    client_p = Paragraph(client_html, ParagraphStyle('ClientCenter', parent=styles['Normal'], alignment=1))
    story.append(client_p)
    story.append(Spacer(1, 0.4*inch))
    
    # Main Proposal Title
    title_p = Paragraph("Medical Insurance Proposals Comparison", title_style)
    story.append(title_p)
    story.append(Spacer(1, 0.6*inch))
    
    # Soft cream/beige metadata block
    meta_table_data = [
        [
            Paragraph("<font color='#64748b' size='8.5'><b>ISSUE DATE</b></font>", ParagraphStyle('ML', alignment=1)),
            Paragraph("<font color='#64748b' size='8.5'><b>EXPIRED DATE</b></font>", ParagraphStyle('ML', alignment=1)),
            Paragraph("<font color='#64748b' size='8.5'><b>OFFER CODE</b></font>", ParagraphStyle('ML', alignment=1)),
            Paragraph("<font color='#64748b' size='8.5'><b>TOTAL MEMBERS</b></font>", ParagraphStyle('ML', alignment=1))
        ],
        [
            Paragraph(f"<font color='#FF991F' size='12'><b>{issue_date_str}</b></font>", ParagraphStyle('MV', alignment=1)),
            Paragraph(f"<font color='#FF991F' size='12'><b>{expiry_date_str}</b></font>", ParagraphStyle('MV', alignment=1)),
            Paragraph(f"<font color='#FF991F' size='12'><b>{input_data.get('offerCode', 'SME-2026-IWIB')}</b></font>", ParagraphStyle('MV', alignment=1)),
            Paragraph(f"<font color='#FF991F' size='12'><b>{total_members_str}</b></font>", ParagraphStyle('MV', alignment=1))
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[1.775*inch]*4)
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('LINEBELOW', (0,0), (-1,0), 0.75, primary_color),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(meta_table)
    story.append(PageBreak())
    
    # --- PAGE 2: VALUE PROPOSITION WITH HERO VISUAL ---
    # Top tags representing Certificate/Broker badges
    tag_style = ParagraphStyle(
        'TagStyle',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Helvetica-Bold',
        textColor=primary_color,
        alignment=1
    )
    tags_table = Table([
        [
            Paragraph("<b>CERTIFICATE OF EXPERTISE</b>", tag_style),
            Paragraph("<b>FRA AUTHORIZED BROKER</b>", tag_style)
        ]
    ], colWidths=[3.55*inch, 3.55*inch])
    tags_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), bg_light),
        ('BACKGROUND', (1,0), (1,0), bg_light),
        ('BOX', (0,0), (0,0), 0.75, primary_color),
        ('BOX', (1,0), (1,0), 0.75, primary_color),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(tags_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Hero Visual (Premium Egyptian corporate scene)
    hero_path = os.path.join(os.getcwd(), 'public', 'egyptian-office-hero.png')
    if os.path.exists(hero_path):
        hero_img = Image(hero_path, width=7.1*inch, height=2.8*inch)
        story.append(hero_img)
        story.append(Spacer(1, 0.2*inch))
    else:
        story.append(Spacer(1, 0.5*inch))
        
    # Value Proposition Content
    story.append(Paragraph("Your Strategic Insurance Partner", h2_style))
    story.append(Paragraph("We don't just offer insurance policies; we deliver a strategic partnership designed to:", body_style))
    story.append(Spacer(1, 0.1*inch))
    
    # Bullet grid
    story.append(Paragraph("<font color='#FF991F' size='11'><b>•</b></font> <b>Protect your assets</b> — Shielding your business and financial standing.", body_style))
    story.append(Paragraph("<font color='#FF991F' size='11'><b>•</b></font> <b>Empower your people</b> — Promoting health, security, and employee peace of mind.", body_style))
    story.append(Paragraph("<font color='#FF991F' size='11'><b>•</b></font> <b>Optimize your financial performance</b> — Ensuring maximum value and premium efficiency.", body_style))
    story.append(Spacer(1, 0.15*inch))
    
    # Section Divider: We Don't Think Like Brokers
    story.append(Paragraph("We Don't Think Like Brokers", ParagraphStyle('SubHeader', parent=h2_style, fontSize=14, spaceBefore=8, spaceAfter=8)))
    story.append(Paragraph("<font color='#FF991F' size='11'><b>•</b></font> Most brokers focus on isolated policies, leading to fragmentation.", body_style))
    story.append(Paragraph("<font color='#FF991F' size='11'><b>•</b></font> We focus on how your entire risk portfolio works together for robust coverage.", body_style))
    story.append(Spacer(1, 0.25*inch))
    
    # Highlight Box
    highlight_style = ParagraphStyle(
        'HighlightText',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica-Bold',
        textColor=text_dark,
        alignment=1,
        leading=15
    )
    highlight_p = Paragraph("We don’t specialize in one type of insurance —<br/>We specialize in how all types work together.", highlight_style)
    highlight_table = Table([[highlight_p]], colWidths=[7.1*inch])
    highlight_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('BOX', (0,0), (-1,-1), 1.5, primary_color),
        ('PADDING', (0,0), (-1,-1), 12),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(highlight_table)
    story.append(PageBreak())
    
    # --- PAGE 3: ADDED VALUE PILLARS (INFOGRAPHIC GRID DESIGN) ---
    story.append(Paragraph("Strategic Value Proposition", h2_style))
    story.append(Paragraph("A framework built to elevate administrative efficiency, employee wellbeing, and risk control.", body_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Read cashback
    cashback = input_data.get('cashbackAmount')
    has_cashback = cashback is not None and float(cashback) > 0
    cashback_val = int(float(cashback)) if has_cashback else 0
    
    # Helper to generate simplified cards
    def make_pillar_card(num, title, desc):
        html = (f"<b><font color='#FF991F' size='14'>{num}</font></b><br/>"
                f"<font color='#1e293b' size='10'><b>{title}</b></font><br/>"
                f"<font color='#64748b' size='8.5'>{desc}</font>")
        p = Paragraph(html, ParagraphStyle(f'Pillar_{num}', parent=styles['Normal'], leading=11))
        return p
        
    pillars_data = [
        [
            make_pillar_card("01", "Strategic Risk Management", "Comprehensive coverage across family and corporate domains to maximize ROI."),
            make_pillar_card("02", "Operational Excellence", "A dedicated Account Manager to handle renewals, carrier liaison, and compliance.")
        ],
        [
            make_pillar_card("03", "Digital Transformation", "Real-time digital dashboard for automated renewals and HR workflows."),
            make_pillar_card("04", "Data-Driven Decisions", "Proactive renewals and AI analytics to optimize premiums and mitigate risks.")
        ],
        [
            make_pillar_card("05", "Specialized Advocacy", "In-house medical reviews and analytical claims advocacy for rejected cases."),
            make_pillar_card("06", "Beneficiary Well-being", f"Preventative wellness sessions, family discounts, and {cashback_val:,} EGP cashback." if has_cashback else "Preventative wellness sessions, family discounts, and financial vouchers.")
        ],
        [
            make_pillar_card("07", "Omnichannel Support", "24/7 WhatsApp and live chat support lines alongside ongoing training materials."),
            Paragraph(
                "<b><font color='#1e293b' size='10'>OUR COMMITMENT</font></b><br/>"
                "<font color='#FF991F' size='8.5'><b>Delivering a strategic, premium partnership built on trust, transparency, and data-driven insights.</b></font>",
                ParagraphStyle('Pillar_Commit', parent=styles['Normal'], leading=11)
            )
        ]
    ]
    
    pillars_table = Table(pillars_data, colWidths=[3.55*inch, 3.55*inch])
    pillars_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_card),
        ('LINEBELOW', (0,0), (-1,-1), 0.75, colors.HexColor("#E2E8F0")),
        ('LINEAFTER', (0,0), (0,-1), 0.75, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(pillars_table)
    story.append(PageBreak())
    
    # --- NOTE: ORIGINAL PAGE 4 (MATPLOTLIB CHART PAGE) REMOVED FROM STORY ---
    
    # --- PAGE 4: DETAILED BENEFIT COMPARISON TABLES ---
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=10.5,
        textColor=text_dark
    )
    
    header_style = ParagraphStyle(
        'TableHeaderText',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica-Bold',
        leading=11,
        textColor=secondary_color,
        alignment=1
    )
    
    plans = input_data['plans']
    for i in range(0, len(plans), 3):
        chunk = plans[i:i+3]
        story.append(Paragraph(f"Detailed Benefit Comparison (Part {i//3 + 1})", h2_style))
        story.append(Spacer(1, 0.1*inch))
        
        # Prepare Table Headers
        headers = [Paragraph("<b>Benefit / Coverage</b>", ParagraphStyle('CellTextBold', parent=cell_style, fontName='Helvetica-Bold'))]
        for p in chunk:
            headers.append(Paragraph(f"<b>{p['company']}</b><br/><font size='7.5' color='#FF991F'>{p['name']}</font>", header_style))
        
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
            row = [Paragraph(f"<b>{label}</b>", cell_style)]
            for p in chunk:
                val = p.get(key, 'N/A')
                row.append(Paragraph(str(val), cell_style))
            table_data.append(row)
            
        # Add Premium Row
        premium_row = [Paragraph(f"<b>ANNUAL NET PREMIUM</b>", ParagraphStyle('Prem', parent=cell_style, textColor=colors.white, fontName='Helvetica-Bold'))]
        for p in chunk:
            prem = input_data['snapshots'].get(p['id'], {}).get('premium', 0)
            premium_row.append(Paragraph(f"<b>{int(prem):,} EGP</b>", ParagraphStyle('PremVal', parent=cell_style, textColor=colors.white, alignment=1, fontSize=10, fontName='Helvetica-Bold')))
        table_data.append(premium_row)
        
        # Calculate dynamic column widths to fit A4 width without overflow
        num_plans = len(chunk)
        if num_plans == 3:
            col_widths = [2.0*inch, 1.7*inch, 1.7*inch, 1.7*inch]
        elif num_plans == 2:
            col_widths = [2.5*inch, 2.3*inch, 2.3*inch]
        else:
            col_widths = [3.5*inch, 3.6*inch]
            
        t = Table(table_data, repeatRows=1, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), bg_light),
            ('BACKGROUND', (0,-1), (-1,-1), primary_color),
            ('GRID', (0,0), (-1,-2), 0.5, border_color),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ]))
        story.append(t)
        story.append(PageBreak())
        
    # --- PAGE 5: PROPOSAL PREMIUM SUMMARY TABLE (EXECUTIVE SNAPSHOT) ---
    story.append(Paragraph("Proposal Premium Summary", h2_style))
    story.append(Paragraph("A quick overview of the key plan configurations and their annual premiums.", body_style))
    story.append(Spacer(1, 0.2*inch))
    
    summary_headers = [
        Paragraph("<b>Plan Name</b>", ParagraphStyle('CellTextBold', parent=cell_style, fontName='Helvetica-Bold')),
        Paragraph("<b>TPA Provider</b>", ParagraphStyle('CellTextBold', parent=cell_style, fontName='Helvetica-Bold')),
        Paragraph("<b>Medical Network</b>", ParagraphStyle('CellTextBold', parent=cell_style, fontName='Helvetica-Bold')),
        Paragraph("<b>Annual Premium</b>", ParagraphStyle('CellTextBold', parent=cell_style, fontName='Helvetica-Bold'))
    ]
    summary_table_data = [summary_headers]
    for p in plans:
        prem = input_data['snapshots'].get(p['id'], {}).get('premium', 0)
        summary_table_data.append([
            Paragraph(p['name'], cell_style),
            Paragraph(p.get('tpa', 'N/A'), cell_style),
            Paragraph(p.get('network', 'N/A'), cell_style),
            Paragraph(f"<b>{int(prem):,} EGP</b>", cell_style)
        ])
        
    st = Table(summary_table_data, colWidths=[2.1*inch, 1.6*inch, 1.7*inch, 1.7*inch])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), bg_light),
        ('LINEBELOW', (0,0), (-1,0), 1.5, primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(st)
    story.append(PageBreak())

    # --- PAGE 6: CONTRACT ISSUANCE TIMELINE (INFOGRAPHIC STEP FLOW) ---
    story.append(Paragraph("Contract Issuance Timeline", h2_style))
    story.append(Paragraph("From proposal acceptance to formal contract issuance within 10 working days.", body_style))
    story.append(Spacer(1, 0.2*inch))
    
    timeline_desc_style = ParagraphStyle(
        'TimelineDesc',
        parent=styles['Normal'],
        fontSize=9,
        textColor=text_muted,
        leading=12
    )
    
    def make_step(num, title, desc):
        return [
            Paragraph(f"<para align='center'><font color='#FF991F' size='14'><b>{num}</b></font></para>", styles['Normal']),
            Paragraph(f"<b><font color='#0f172a' size='10.5'>{title}</font></b><br/>{desc}", timeline_desc_style)
        ]
        
    timeline_data = [
        make_step("01", "Proposal Approval", "Client reviews and formally signs off on the selected corporate insurance plan."),
        make_step("02", "Data Collection", "Submission of required corporate documentation, employee census lists, and KYC files."),
        make_step("03", "Policy Setup", "IWIB coordinates with the selected underwriter to configure exact policy structures."),
        make_step("04", "Underwriter Issuance", "The underwriter processes the documents and issues the formal contract policy."),
        make_step("05", "Delivery & Onboarding", "Contract documents are securely delivered, and employee onboarding sessions begin.")
    ]
    
    timeline_table = Table(timeline_data, colWidths=[0.8*inch, 6.3*inch])
    timeline_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), bg_light),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor("#E2E8F0")),
        ('LINEAFTER', (0,0), (0,-2), 1.5, primary_color), # Vertical timeline line connector
    ]))
    story.append(timeline_table)
    story.append(PageBreak())
    
    # --- PAGE 7: CONTACT & PARTNERSHIP (FINAL PAGE - ENHANCED WITH IWIB LOGO) ---
    story.append(Spacer(1, 0.2*inch))
    
    # Add IWIB logo at the top center of the final page
    if os.path.exists(logo_path):
        logo_img_final = Image(logo_path, width=2.4*inch, height=0.96*inch)
        logo_table_final = Table([[logo_img_final]], colWidths=[7.1*inch])
        logo_table_final.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 15)
        ]))
        story.append(logo_table_final)
    
    contact_title_style = ParagraphStyle(
        'FinalContactTitle', 
        parent=styles['Normal'], 
        fontSize=24, 
        textColor=secondary_color, 
        fontName='Helvetica-Bold', 
        leading=30, 
        alignment=1
    )
    contact_subtitle_style = ParagraphStyle(
        'FinalContactSub', 
        parent=styles['Normal'], 
        fontSize=12, 
        textColor=primary_color, 
        fontName='Helvetica-Oblique', 
        alignment=1, 
        spaceAfter=25
    )
    
    story.append(Paragraph("Your partner in smarter risk decisions.", contact_title_style))
    story.append(Paragraph("IWIB Insurance Brokerage", contact_subtitle_style))
    story.append(Spacer(1, 0.3*inch))
    
    contact_card_data = [
        [
            Paragraph("<font color='#ffffff' size='9.5'><b>HEAD OFFICE</b></font>", cell_style),
            Paragraph("<font color='#ffffff' size='9.5'><b>SUPPORT HOTLINE</b></font>", cell_style)
        ],
        [
            Paragraph("<font color='#cbd5e1' size='10'>5 El Nakheel St, Mohandessin,<br/>Giza, Egypt.<br/>Authorized Insurance Brokerage by FRA.</font>", cell_style),
            Paragraph("<font color='#FF991F' size='14'><b>+20 101-333-0409</b></font>", cell_style)
        ],
        [Spacer(1, 0.15*inch), Spacer(1, 0.15*inch)],
        [
            Paragraph("<font color='#ffffff' size='9.5'><b>EMAIL ENQUIRIES</b></font>", cell_style),
            Paragraph("<font color='#ffffff' size='9.5'><b>OFFICIAL WEBSITE</b></font>", cell_style)
        ],
        [
            Paragraph("<font color='#cbd5e1' size='10'>info@iwib-eg.com</font>", cell_style),
            Paragraph("<font color='#cbd5e1' size='10'>www.iwib-eg.com</font>", cell_style)
        ]
    ]
    
    contact_table = Table(contact_card_data, colWidths=[3.55*inch, 3.55*inch])
    contact_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0B0F52")), # Subtle deep blue final box
        ('PADDING', (0,0), (-1,-1), 16),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(contact_table)
    
    # Build the Portrait PDF document
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_engine.py input.json output.pdf")
    else:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
        generate_pdf(data, sys.argv[2])
