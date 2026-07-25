import pytest
from datetime import datetime, timedelta
from app.core.rbac import get_role_permissions, Permission
from app.core.security_compliance import check_impossible_travel, haversine_distance
from app.core.rag import TextSplitter

def test_rbac_inheritance():
    # Admin should inherit everything
    admin_perms = get_role_permissions("admin")
    assert Permission.BILLING_MANAGE in admin_perms
    assert Permission.ORGANIZATION_ADMIN in admin_perms
    assert Permission.TEAM_INVITE in admin_perms
    assert Permission.DOCUMENT_VIEW in admin_perms
    
    # Manager should inherit analyst + user
    manager_perms = get_role_permissions("manager")
    assert Permission.TEAM_INVITE in manager_perms
    assert Permission.COMPLIANCE_EXPORT in manager_perms
    assert Permission.DOCUMENT_VIEW in manager_perms
    assert Permission.BILLING_MANAGE not in manager_perms
    
    # User should only have base permissions
    user_perms = get_role_permissions("user")
    assert Permission.DOCUMENT_VIEW in user_perms
    assert Permission.DOCUMENT_UPLOAD in user_perms
    assert Permission.COMPLIANCE_EXPORT not in user_perms

def test_haversine_distance():
    # Distance between London and New York should be approx 5585 km
    dist = haversine_distance(51.507, -0.127, 40.712, -74.006)
    assert 5500 < dist < 5700

def test_impossible_travel():
    # Login in London then login in New York 10 minutes later (impossible!)
    t1 = datetime.utcnow()
    t2 = t1 + timedelta(minutes=10)
    
    # London IP prefix starts with 185.86.
    # SF/NY IP prefix starts with 104.244.
    is_anomaly, speed, dist = check_impossible_travel(
        prev_ip="185.86.151.10",
        prev_time=t1,
        curr_ip="104.244.42.20",
        curr_time=t2
    )
    assert is_anomaly is True
    assert speed > 800.0  # Speed must exceed airline travel (800 km/h)
    
    # Near login should not be an anomaly
    is_anomaly2, speed2, dist2 = check_impossible_travel(
        prev_ip="127.0.0.1",
        prev_time=t1,
        curr_ip="127.0.0.1",
        curr_time=t2
    )
    assert is_anomaly2 is False

def test_text_splitter():
    splitter = TextSplitter(chunk_size=100, chunk_overlap=20)
    text = "The quick brown fox jumps over the lazy dog repeatedly until the character limit is reached for multiple chunks testing purposes."
    chunks = splitter.split_text(text)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= 100
