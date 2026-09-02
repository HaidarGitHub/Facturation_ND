# backend/auth.py
import json
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import request, jsonify, g, current_app

from models import User


def generate_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=8),
    }
    secret = current_app.config['SECRET_KEY']
    return jwt.encode(payload, secret, algorithm='HS256')


def decode_token(token):
    secret = current_app.config['SECRET_KEY']
    return jwt.decode(token, secret, algorithms=['HS256'])


def token_required(f):
    """Verifies the Bearer token and attaches the user to g.current_user."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'message': 'Missing or invalid Authorization header'}), 401

        token = auth_header.split(' ', 1)[1]
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

        user = User.query.get(payload.get('user_id'))
        if not user:
            return jsonify({'message': 'User not found'}), 401

        g.current_user = user
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    """Must be used AFTER @token_required."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not hasattr(g, 'current_user'):
            return jsonify({'message': 'Authentication required'}), 401
        if g.current_user.role != 'admin':
            return jsonify({'message': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return wrapper


def get_permissions(user):
    """Returns dict like {"1": {"view": true, "update": false}, "general_expenses": {"view": true}}"""
    try:
        raw = user.allowed_service_ids
        if isinstance(raw, dict):
            parsed = raw
        else:
            parsed = json.loads(raw or '{}')
    except (TypeError, ValueError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def normalize_general_expense_permission(entry):
    """Normalize legacy and current permission shapes to {view, update}."""
    if isinstance(entry, bool):
        return {'view': entry, 'update': entry}
    if isinstance(entry, dict):
        return {
            'view': bool(entry.get('view') or entry.get('update')),
            'update': bool(entry.get('update')),
        }
    return {'view': False, 'update': False}


def user_can_access_general_expenses(user, level='view'):
    """Admins always have access; compatibility for legacy permission objects."""
    if user.role == 'admin':
        return True
    perms = get_permissions(user)
    entry = perms.get('general_expenses') or perms.get('general-expenses') or perms.get('generalExpenses') or {}
    normalized = normalize_general_expense_permission(entry)

    if level == 'view':
        return normalized['view']
    return normalized['update']


def _extract_service_id(kwargs):
    if 'service_id' in kwargs:
        return kwargs['service_id']
    service_id = request.args.get('service_id', type=int)
    if service_id:
        return service_id
    if request.is_json:
        body = request.get_json(silent=True) or {}
        return body.get('service_id')
    return None


def user_can_access(user, service_id, level='view'):
    """Plain function version for use inside a route body (e.g. after
    looking up a candidate to find its service_id). Admins always pass."""
    if user.role == 'admin':
        return True
    if service_id is None:
        return False
    entry = get_permissions(user).get(str(service_id))
    if not entry or not entry.get('view'):
        return False
    if level == 'update' and not entry.get('update'):
        return False
    return True


def normalize_office(value):
    return value if value in ('tunis', 'kebili') else 'tunis'


def requested_office(user):
    """Users are locked to their office; admins may select one or all offices."""
    if user.role != 'admin':
        return normalize_office(user.office)
    value = request.args.get('office', 'all')
    return value if value in ('tunis', 'kebili', 'all') else 'all'


def user_can_access_office(user, office):
    return user.role == 'admin' or normalize_office(user.office) == normalize_office(office)


def service_access_required(level='view'):
    """
    Must be used AFTER @token_required.
    Admins bypass this check entirely.
    Looks for service_id in: URL kwargs, query string, or JSON body.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                return jsonify({'message': 'Authentication required'}), 401

            user = g.current_user
            if user.role == 'admin':
                return f(*args, **kwargs)

            service_id = _extract_service_id(kwargs)
            if not service_id:
                return jsonify({'message': 'Service not specified'}), 400

            entry = get_permissions(user).get(str(service_id))
            if not entry or not entry.get('view'):
                return jsonify({'message': 'No access to this service'}), 403
            if level == 'update' and not entry.get('update'):
                return jsonify({'message': 'View-only access to this service'}), 403

            return f(*args, **kwargs)
        return wrapper
    return decorator
