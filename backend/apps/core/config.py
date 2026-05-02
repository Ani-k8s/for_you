import os

# Role Definitions
ROLE_SUPER_ADMIN = "super_admin"
ROLE_GYM_OWNER = "gym_owner"
ROLE_STAFF = "staff"
ROLE_MEMBER = "member"

ROLES = [
    ROLE_SUPER_ADMIN,
    ROLE_GYM_OWNER,
    ROLE_STAFF,
    ROLE_MEMBER,
]

# Feature Flags
ENABLE_NOTIFICATIONS = True
ENABLE_ATTENDANCE = True
ENABLE_PAYMENTS = True

# App Constants
MAX_GYM_NAME_LENGTH = 255
DEFAULT_PAGE_SIZE = 25
