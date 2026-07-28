# backend/admin_routes.py
import json

from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash

from models import db, User
from auth import token_required, admin_required

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/users', methods=['GET'])
@token_required
@admin_required
def list_users():
    """
    List all users (admin only)
    ---
    tags: [Admin]
    security: [{Bearer: []}]
    responses:
      200: {description: List of users with their role and permissions}
      403: {description: Admin access required}
    """
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'role': u.role,
        'permissions': json.loads(u.allowed_service_ids or '{}'),
    } for u in users])


@admin_bp.route('/users', methods=['POST'])
@token_required
@admin_required
def create_user():
    """
    Create a new user (admin only)
    ---
    tags: [Admin]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [username, password]
          properties:
            username: {type: string}
            password: {type: string}
            role: {type: string, enum: [admin, user], default: user}
            permissions:
              type: object
              description: 'e.g. {"1": {"view": true, "update": false}}'
    responses:
      201: {description: User created}
      400: {description: Missing or invalid fields}
      409: {description: Username already exists}
    """
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')

    if not username or not password:
        return jsonify({'message': 'username and password are required'}), 400
    if role not in ('admin', 'user'):
        return jsonify({'message': "role must be 'admin' or 'user'"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 409

    permissions = data.get('permissions', {})

    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        role=role,
        allowed_service_ids=json.dumps(permissions),
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'id': user.id, 'username': user.username, 'role': user.role}), 201


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(user_id):
    """
    Delete a user (admin only)
    ---
    tags: [Admin]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
    responses:
      200: {description: User deleted}
      400: {description: Cannot delete your own account}
    """
    if user_id == g.current_user.id:
        return jsonify({'message': "You can't delete your own account"}), 400
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})


@admin_bp.route('/users/<int:user_id>/permissions', methods=['PUT'])
@token_required
@admin_required
def update_permissions(user_id):
    """
    Update a user's role and service permissions (admin only)
    ---
    tags: [Admin]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [permissions]
          properties:
            role: {type: string, enum: [admin, user]}
            permissions:
              type: object
              description: 'e.g. {"1": {"view": true, "update": true}, "2": {"view": true, "update": false}}'
    responses:
      200: {description: Permissions updated}
      400: {description: permissions object is required}
    """
    user = User.query.get_or_404(user_id)
    data = request.json or {}
    permissions = data.get('permissions')

    if permissions is None:
        return jsonify({'message': 'permissions object is required'}), 400

    user.allowed_service_ids = json.dumps(permissions)
    if 'role' in data and data['role'] in ('admin', 'user'):
        user.role = data['role']

    db.session.commit()
    return jsonify({'message': 'Permissions updated', 'permissions': permissions})


@admin_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@token_required
@admin_required
def reset_password(user_id):
    """
    Reset a user's password (admin only)
    ---
    tags: [Admin]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [new_password]
          properties:
            new_password: {type: string}
    responses:
      200: {description: Password reset}
      400: {description: new_password is required}
    """
    user = User.query.get_or_404(user_id)
    data = request.json or {}
    new_password = data.get('new_password')

    if not new_password:
        return jsonify({'message': 'new_password is required'}), 400

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({'message': 'Password reset'})
