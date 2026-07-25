from fastapi import HTTPException, status, Depends
from typing import List, Set, Dict
from ..models.models import User
from .security import get_current_user

# Define Granular System Permissions
class Permission:
    DOCUMENT_VIEW = "DOCUMENT_VIEW"
    DOCUMENT_UPLOAD = "DOCUMENT_UPLOAD"
    REDACTION_APPLY = "REDACTION_APPLY"
    TEAM_INVITE = "TEAM_INVITE"
    COMPLIANCE_EXPORT = "COMPLIANCE_EXPORT"
    BILLING_MANAGE = "BILLING_MANAGE"
    ORGANIZATION_ADMIN = "ORGANIZATION_ADMIN"
    AI_FEEDBACK_REVIEW = "AI_FEEDBACK_REVIEW"

# Role permissions definition (base mapping)
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "user": {
        Permission.DOCUMENT_VIEW,
        Permission.DOCUMENT_UPLOAD
    },
    "analyst": {
        Permission.COMPLIANCE_EXPORT
    },
    "manager": {
        Permission.REDACTION_APPLY,
        Permission.TEAM_INVITE,
        Permission.AI_FEEDBACK_REVIEW
    },
    "admin": {
        Permission.BILLING_MANAGE,
        Permission.ORGANIZATION_ADMIN
    }
}

# Hierarchical Role Inheritance
# analyst inherits user
# manager inherits analyst + user
# admin inherits manager + analyst + user
ROLE_INHERITANCE: Dict[str, List[str]] = {
    "user": [],
    "analyst": ["user"],
    "manager": ["analyst"],
    "admin": ["manager"]
}

def get_role_permissions(role: str) -> Set[str]:
    """
    Recursively accumulates all permissions owned by a role through inheritance.
    """
    permissions = set(ROLE_PERMISSIONS.get(role, []))
    
    # Traverse inheritance graph
    for inherited_role in ROLE_INHERITANCE.get(role, []):
        permissions.update(get_role_permissions(inherited_role))
        
    return permissions

class PermissionChecker:
    """
    FastAPI Route Dependency injector verifying that the current user
    possesses the specified system permission via role inheritance.
    """
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_perms = get_role_permissions(current_user.role)
        
        if self.required_permission not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Missing required permission '{self.required_permission}'."
            )
            
        return current_user
