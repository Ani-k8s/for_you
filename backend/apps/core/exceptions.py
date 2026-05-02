from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response


def unified_exception_handler(exc, context):
    """
    Standardize all error responses to:
    { success, message, data, errors }
    """
    if isinstance(exc, APIException):
        detail = getattr(exc, "detail", None)
        message = "Request failed."
        if isinstance(detail, str):
            message = detail
        elif detail:
            message = "Request failed."

        data = None
        errors = detail
        return Response(
            {
                "success": False,
                "message": message,
                "data": data,
                "errors": errors,
            },
            status=getattr(exc, "status_code", status.HTTP_400_BAD_REQUEST),
        )

    # Non-DRF exceptions
    return Response(
        {
            "success": False,
            "message": "Internal server error.",
            "data": None,
            "errors": str(exc),
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )

