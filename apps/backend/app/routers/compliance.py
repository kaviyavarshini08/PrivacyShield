from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging

from ..database import get_db
from ..models.models import Document, DetectedEntity, User
from ..schemas.schemas import ComplianceReportResponse, ComplianceSection
from ..core.security import get_current_user
from ..core.tenant import tenant_select

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{document_id}", response_model=ComplianceReportResponse)
async def generate_compliance_report(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates detected PII in a document against GDPR, HIPAA, and DPDP frameworks.
    Generates dynamic compliance scores, detailed findings, and security patches.
    """
    doc_stmt = tenant_select(Document).filter(Document.id == document_id)
    doc_result = await db.execute(doc_stmt)
    doc = doc_result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role not in ["admin", "manager", "analyst"] and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document's compliance reports")
        
    ent_stmt = select(DetectedEntity).filter(DetectedEntity.document_id == document_id)
    ent_result = await db.execute(ent_stmt)
    entities = ent_result.scalars().all()
    
    # 1. Classify entities
    unredacted_entities = [e for e in entities if not e.is_redacted]
    
    total_pii = len(entities)
    unredacted_count = len(unredacted_entities)
    
    # Calculate overall risk score
    # Base risk score is derived from PII density and severity
    risk_score = 0.0
    if total_pii > 0:
        high_severity_types = ["IN_AADHAAR", "IN_PAN", "CREDIT_CARD", "PASSPORT", "BANK_DETAILS"]
        high_sev_unredacted = [e for e in unredacted_entities if e.entity_type in high_severity_types]
        med_sev_unredacted = [e for e in unredacted_entities if e.entity_type in ["EMAIL_ADDRESS", "PHONE_NUMBER", "LOCATION"]]
        
        # Risk weighting
        weighted_score = (len(high_sev_unredacted) * 20) + (len(med_sev_unredacted) * 8) + (unredacted_count * 2)
        risk_score = min(100.0, weighted_score)
        
    # Generate GDPR Section
    gdpr_findings = []
    gdpr_recs = []
    gdpr_score = 100
    
    gdpr_leaks = [e for e in unredacted_entities if e.entity_type in ["EMAIL_ADDRESS", "PHONE_NUMBER", "LOCATION", "PERSON"]]
    if gdpr_leaks:
        gdpr_score = max(0, 100 - (len(gdpr_leaks) * 15))
        gdpr_findings.append(f"Detected {len(gdpr_leaks)} unredacted EU Personal Data points (GDPR Art. 4).")
        gdpr_recs.append("Apply pseudonymization or full redaction to email headers, phone numbers, and names.")
    else:
        gdpr_findings.append("No unredacted EU personal details detected in general sweeps.")
        
    gdpr_status = "Compliant" if gdpr_score >= 90 else "Action Required" if gdpr_score >= 50 else "Non-Compliant"
    
    # Generate HIPAA Section
    hipaa_findings = []
    hipaa_recs = []
    hipaa_score = 100
    
    hipaa_leaks = [e for e in unredacted_entities if e.entity_type in ["EMAIL_ADDRESS", "PHONE_NUMBER", "LOCATION", "PERSON", "IN_AADHAAR", "PASSPORT"]]
    if hipaa_leaks:
        hipaa_score = max(0, 100 - (len(hipaa_leaks) * 18))
        hipaa_findings.append(f"Exposed {len(hipaa_leaks)} Protected Health Information (PHI) identifiers (45 CFR § 164.514).")
        hipaa_recs.append("Strictly mask or blur identifiers before distributing reports outside of secure HIPAA zones.")
    else:
        hipaa_findings.append("Document meets safe-harbor de-identification criteria.")
        
    hipaa_status = "Compliant" if hipaa_score >= 95 else "Action Required" if hipaa_score >= 60 else "Non-Compliant"
    
    # Generate DPDP Section (India Digital Personal Data Protection Act)
    dpdp_findings = []
    dpdp_recs = []
    dpdp_score = 100
    
    dpdp_leaks = [e for e in unredacted_entities if e.entity_type in ["IN_AADHAAR", "IN_PAN", "PHONE_NUMBER", "PERSON"]]
    if dpdp_leaks:
        dpdp_score = max(0, 100 - (len(dpdp_leaks) * 22))
        dpdp_findings.append(f"Exposed {len(dpdp_leaks)} high-severity Indian personal data points (Aadhaar, PAN, phone).")
        dpdp_recs.append("Under India DPDP Act 2023, consent-backed processing requires masking Indian national IDs (Aadhaar/PAN). Execute immediate redaction.")
    else:
        dpdp_findings.append("No exposed Indian national identification numbers detected.")
        
    dpdp_status = "Compliant" if dpdp_score >= 90 else "Action Required" if dpdp_score >= 50 else "Non-Compliant"
    
    return ComplianceReportResponse(
        document_id=doc.id,
        filename=doc.original_name,
        overall_risk_score=risk_score,
        gdpr=ComplianceSection(
            status=gdpr_status,
            score=gdpr_score,
            findings=gdpr_findings,
            recommendations=gdpr_recs
        ),
        hipaa=ComplianceSection(
            status=hipaa_status,
            score=hipaa_score,
            findings=hipaa_findings,
            recommendations=hipaa_recs
        ),
        dpdp=ComplianceSection(
            status=dpdp_status,
            score=dpdp_score,
            findings=dpdp_findings,
            recommendations=dpdp_recs
        )
    )
