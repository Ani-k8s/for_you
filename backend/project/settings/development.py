from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Email backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Disable CSRF security for local dev if needed
# CSRF_COOKIE_SECURE = False
# SESSION_COOKIE_SECURE = False
