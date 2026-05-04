from .base import *

DEBUG = False

# Strict host configuration
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["for-you-1-bqij.onrender.com", "localhost", "127.0.0.1", ".onrender.com"])

# Allow all origins for the SaaS landing page and tenant dashboards to communicate with the API
CORS_ALLOW_ALL_ORIGINS = True

# Security Headers
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["https://for-you-nu-nine.vercel.app"])

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# HTTPS Redirect (set via env)
if env.bool("HTTPS_REDIRECT", default=False):
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Email (already configured in base, but can be overridden here if needed)
# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
