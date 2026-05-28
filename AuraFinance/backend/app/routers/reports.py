from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app import crud, models, db
from app.routers.auth import get_current_user
from app.ml.scoring import calculate_financial_health_score
from app.ml.clustering import analyze_spending_personality

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

@router.get("/pdf")
def generate_pdf_report(
    current_user: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    try:
        # Fetch user's financial profile
        transactions = crud.get_transactions(session, user_id=current_user.id, limit=1000)
        budgets = crud.get_budgets(session, user_id=current_user.id)
        
        total_income = sum(tx.amount for tx in transactions if tx.type == "credit")
        total_expense = sum(tx.amount for tx in transactions if tx.type == "debit")
        balance = total_income - total_expense
        
        health_data = calculate_financial_health_score(transactions, budgets)
        personality_data = analyze_spending_personality(transactions)
        
        # Create bytes stream
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter,
            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # Custom Premium Styles
        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=colors.HexColor("#1e293b"), # Slate 800
            spaceAfter=15
        )
        
        subtitle_style = ParagraphStyle(
            name="SubTitleStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            textColor=colors.HexColor("#64748b"), # Slate 500
            spaceAfter=25
        )
        
        section_heading = ParagraphStyle(
            name="SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=colors.HexColor("#0f172a"), # Slate 900
            spaceBefore=15,
            spaceAfter=10
        )
        
        body_style = ParagraphStyle(
            name="BodyStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=colors.HexColor("#334155"), # Slate 700
            spaceAfter=8,
            leading=14
        )
        
        bullet_style = ParagraphStyle(
            name="BulletStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            textColor=colors.HexColor("#475569"), # Slate 600
            leftIndent=15,
            firstLineIndent=-10,
            spaceAfter=6,
            leading=13
        )
        
        # Header Info
        story.append(Paragraph("AI Financial Behavior Intelligence Report", title_style))
        story.append(Paragraph(
            f"Generated on: {datetime.now().strftime('%B %d, %Y')} | Profile: {current_user.email}", 
            subtitle_style
        ))
        
        # Section 1: Overview Summary
        story.append(Paragraph("1. Executive Cash Flow Summary", section_heading))
        
        summary_data = [
            ["Total Registered Income:", f"Rs. {total_income:,.2f}"],
            ["Total Registered Expenses:", f"Rs. {total_expense:,.2f}"],
            ["Net Monthly Cash Flow:", f"Rs. {balance:,.2f}"],
            ["Calculated Savings Rate:", f"{round(health_data.get('score', 0) * 0.2, 1)}%"] # approximate or mapped rate
        ]
        
        summary_table = Table(summary_data, colWidths=[200, 200])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")), # Slate 50
            ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (1,0), (1,-1), colors.HexColor("#0f172a")),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTNAME', (0,2), (1,2), 'Helvetica-Bold'), # bold net flow
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 15))
        
        # Section 2: ML Spending Personality
        story.append(Paragraph("2. ML Spending Personality Analysis", section_heading))
        personality_name = personality_data.get("personality", "Balanced Budgeter")
        personality_desc = personality_data.get("description", "You manage a standard budget structure.")
        
        story.append(Paragraph(f"**Classification Archetype:** {personality_name}", body_style))
        story.append(Paragraph(personality_desc, body_style))
        
        story.append(Paragraph("Key behavioral traits observed in this cluster:", body_style))
        for trait in personality_data.get("traits", []):
            story.append(Paragraph(f"&bull; {trait}", bullet_style))
            
        story.append(Spacer(1, 15))
        
        # Section 3: Financial Health Score
        story.append(Paragraph("3. Financial Health Metrics Breakdown", section_heading))
        score = health_data.get("score", 50)
        grade = health_data.get("grade", "C")
        breakdown = health_data.get("breakdown", {})
        
        story.append(Paragraph(f"Your aggregate score is **{score}/100**, yielding a Financial Wellness Grade of **{grade}**.", body_style))
        
        health_table_data = [
            ["Metric Dimension", "Score Rating"],
            ["Savings Target Allocation", f"{breakdown.get('savings_score', 50)}/100"],
            ["Budgeting Adherence Efficiency", f"{breakdown.get('budgeting_efficiency', 50)}/100"],
            ["Debt Proportions Risk", f"{breakdown.get('debt_risk', 50)}/100"],
            ["Overspending/Anomaly Prevention", f"{breakdown.get('overspending_risk', 50)}/100"],
        ]
        
        health_table = Table(health_table_data, colWidths=[240, 160])
        health_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")), # Dark slate header
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f1f5f9")]),
        ]))
        story.append(health_table)
        story.append(Spacer(1, 15))
        
        # Section 4: Advisor Insights & Suggestions
        story.append(Paragraph("4. Targeted Advisor Insights", section_heading))
        recs = health_data.get("recommendations", [])
        
        if recs:
            for rec in recs:
                story.append(Paragraph(f"&bull; {rec}", bullet_style))
        else:
            story.append(Paragraph("No major warnings flagged. Maintain your current saving schedule and category targets.", body_style))
            
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Return StreamingResponse
        return StreamingResponse(
            buffer, 
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=AI_Finance_Report_{current_user.id}.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report. Error: {str(e)}"
        )
