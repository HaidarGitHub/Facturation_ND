# backend/app.py
import json
from flask import Flask, jsonify, request, send_file, g
from flask_cors import CORS, cross_origin
from flasgger import Swagger
from models import db, Candidate, Revenue, Expense, GeneralExpense, Service, CandidatePDF, User
from datetime import datetime
import os
import uuid
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

from auth import (
    token_required,
    admin_required,
    generate_token,
    get_permissions,
    user_can_access,
)
from admin_routes import admin_bp

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

app = Flask(__name__)
local_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS(
    app,
    origins=["https://nachdeutschland.vercel.app", *local_origins],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)  # Activer CORS pour permettre les requêtes du frontend


@app.after_request
def add_local_cors_headers(response):
    if request.path.startswith('/api/'):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response


def make_cors_preflight_response():
    response = app.make_default_options_response()
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response


def normalize_optional_float(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        if value == "":
            return None
        value = value.replace(",", ".")
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_required_int(value, default=0):
    if value is None:
        return default
    if isinstance(value, str):
        value = value.strip()
        if value == "":
            return default
        value = value.replace(",", ".")
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def ensure_candidate_creator_column():
    """Add the created_by_user_id column to existing databases created before this field existed."""
    try:
        inspector = db.inspect(db.engine)
        table_names = set(inspector.get_table_names())
        if 'candidate' not in table_names:
            return
        columns = {column['name'] for column in inspector.get_columns('candidate')}
        if 'created_by_user_id' not in columns:
            with db.engine.begin() as connection:
                connection.execute(db.text('ALTER TABLE candidate ADD COLUMN created_by_user_id INTEGER'))
    except Exception:
        pass

# Use local SQLite by default. Only use DATABASE_URL when explicitly requested.
use_remote_db = os.getenv('USE_REMOTE_DB', '').lower() in ('1', 'true', 'yes')
if use_remote_db:
    uri = os.getenv('DATABASE_URL', 'sqlite:///database.db')
    if uri.startswith('postgres://'):
        uri = uri.replace('postgres://', 'postgresql://', 1)
    if uri.startswith('postgresql://') and 'sslmode=' not in uri:
        uri = f"{uri}{'&' if '?' in uri else '?'}sslmode=require"
else:
    uri = 'sqlite:///database.db'
app.config['SQLALCHEMY_DATABASE_URI'] = uri
print("Using database URI:", app.config['SQLALCHEMY_DATABASE_URI'])
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'instance/pdfs'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Set Flask secret key from environment variable, fallback to default
# IMPORTANT: set a real SECRET_KEY in your .env in production — it signs the JWTs.
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_key')

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db.init_app(app)
app.register_blueprint(admin_bp)

with app.app_context():
    db.create_all()
    ensure_candidate_creator_column()

# ---------------------------------------------------------------------------
# Swagger / OpenAPI docs — visit /apidocs/ once the server is running
# ---------------------------------------------------------------------------
swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "ND Consulting API",
        "description": "Candidates, services, revenues/expenses, and user administration.",
        "version": "1.0.0",
    },
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": 'JWT auth. Paste: Bearer &lt;token&gt; (obtain the token from /api/login)',
        }
    },
}
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/apispec.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/apidocs/",
}
Swagger(app, config=swagger_config, template=swagger_template)

# Créer la base de données
with app.app_context():
    db.create_all()
    # Ajouter les services par défaut s'ils n'existent pas
    default_services = [
        "Recrutement",
        "Préparation des équivalences en Allemagne",
        "Préparation visa chancenkarte",
        "Cours d'allemand",
        "CVs + Lettre de motivations"
    ]
    for service_name in default_services:
        if not Service.query.filter_by(name=service_name).first():
            service = Service(name=service_name)
            db.session.add(service)
    # Create default admin user if not exists
    default_username = os.getenv('DEFAULT_USERNAME', 'ND Consulting')
    default_password = os.getenv('DEFAULT_PASSWORD', 'admin123')
    if not User.query.filter_by(username=default_username).first():
        user = User(
            username=default_username,
            password_hash=generate_password_hash(default_password),
            role='admin',
            allowed_service_ids='{}'
        )
        db.session.add(user)
    db.session.commit()

# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------
@app.route('/api/services', methods=['GET'])
@token_required
def get_services():
    """
    List all services
    ---
    tags: [Services]
    security: [{Bearer: []}]
    responses:
      200:
        description: List of services
    """
    services = Service.query.all()
    return jsonify([{
        'id': s.id,
        'name': s.name
    } for s in services])

@app.route('/api/services', methods=['POST'])
@token_required
@admin_required
def add_service():
    """
    Create a service (admin only)
    ---
    tags: [Services]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [name]
          properties:
            name: {type: string}
    responses:
      201: {description: Service created}
      403: {description: Admin access required}
    """
    data = request.json
    service = Service(name=data['name'])
    db.session.add(service)
    db.session.commit()
    return jsonify({'id': service.id, 'name': service.name}), 201

@app.route('/api/services/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_service(id):
    """
    Update a service (admin only)
    ---
    tags: [Services]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name: {type: string}
    responses:
      200: {description: Service updated}
    """
    service = Service.query.get_or_404(id)
    data = request.json
    service.name = data['name']
    db.session.commit()
    return jsonify({'message': 'Service mis à jour'})

@app.route('/api/services/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_service(id):
    """
    Delete a service (admin only)
    ---
    tags: [Services]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
    responses:
      200: {description: Service deleted}
    """
    service = Service.query.get_or_404(id)
    db.session.delete(service)
    db.session.commit()
    return jsonify({'message': 'Service supprimé'})

# ---------------------------------------------------------------------------
# Candidats
# ---------------------------------------------------------------------------
@app.route('/api/candidates', methods=['GET'])
@token_required
def get_candidates():
    """
    List candidates (filtered to the user's allowed services)
    ---
    tags: [Candidates]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: service_id
        type: integer
        required: false
    responses:
      200: {description: List of candidates}
      403: {description: No access to this service}
    """
    service_id = request.args.get('service_id', type=int)
    user = g.current_user

    query = Candidate.query
    if service_id:
        if not user_can_access(user, service_id, 'view'):
            return jsonify({'message': 'No access to this service'}), 403
        query = query.filter_by(service_id=service_id)
    elif user.role != 'admin':
        perms = get_permissions(user)
        allowed_ids = [int(sid) for sid, p in perms.items() if p.get('view')]
        if not allowed_ids:
            return jsonify([])
        query = query.filter(Candidate.service_id.in_(allowed_ids))

    candidates = query.all()
    return jsonify([{
        'id': c.id,
        'firstName': c.first_name,
        'lastName': c.last_name,
        'email': c.email,
        'phone': c.phone,
        'country': c.country,
        'status': c.status,
        'service_id': c.service_id,
        'createdByUserId': c.created_by_user_id,
        'createdByUser': c.creator.username if c.creator else None,
        'createdAt': c.created_at.isoformat() if c.created_at else None,
        'note': c.note,
        'terminatedAt': c.terminated_at.isoformat() if c.terminated_at else None,
        'type_equivalence': c.type_equivalence,
        'revenues': [{'id': r.id, 'description': r.description, 'amount': r.amount, 'amountHT': r.amountHT, 'amountTTC': r.amountTTC, 'tva': r.tva, 'date': r.date} for r in c.revenues],
        'expenses': [{'id': e.id, 'description': e.description, 'amount': e.amount, 'amountHT': e.amountHT, 'amountTTC': e.amountTTC, 'tva': e.tva, 'date': e.date} for e in c.expenses],
        'pdfs': [{'id': p.id, 'filename': p.filename, 'original_filename': p.original_filename, 'upload_date': p.upload_date.isoformat() if p.upload_date else None} for p in c.pdfs]
    } for c in candidates])

@app.route('/api/candidates', methods=['POST'])
@token_required
def add_candidate():
    """
    Create a candidate
    ---
    tags: [Candidates]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [firstName, lastName, email, phone, country, status, service_id]
          properties:
            firstName: {type: string}
            lastName: {type: string}
            email: {type: string}
            phone: {type: string}
            country: {type: string}
            status: {type: string}
            service_id: {type: integer}
            note: {type: string}
            type_equivalence: {type: string}
    responses:
      201: {description: Candidate created}
      403: {description: No update access to this service}
    """
    data = request.json
    print('Received candidate data:', data)  # DEBUG

    if not user_can_access(g.current_user, data.get('service_id'), 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    created_at_raw = data.get('createdAt') or data.get('created_at')
    if created_at_raw:
        try:
            created_at_value = datetime.fromisoformat(created_at_raw.replace('Z', '+00:00'))
        except ValueError:
            created_at_value = datetime.utcnow()
    else:
        created_at_value = datetime.utcnow()

    candidate = Candidate(
        first_name=data['firstName'],
        last_name=data['lastName'],
        email=data['email'],
        phone=data['phone'],
        country=data['country'],
        status=data['status'],
        service_id=data['service_id'],
        created_by_user_id=g.current_user.id,
        created_at=created_at_value,
        note=data.get('note'),
        terminated_at=datetime.utcnow() if data.get('status') == 'Terminé' else None,
        type_equivalence=data.get('type_equivalence')
    )
    db.session.add(candidate)
    db.session.commit()
    return jsonify({'id': candidate.id}), 201

@app.route('/api/candidates/<int:id>', methods=['PUT'])
@token_required
def update_candidate(id):
    """
    Update a candidate
    ---
    tags: [Candidates]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [firstName, lastName, email, phone, country, status, service_id]
    responses:
      200: {description: Candidate updated}
      403: {description: No update access to this service}
    """
    candidate = Candidate.query.get_or_404(id)

    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    data = request.json

    if data['service_id'] != candidate.service_id and not user_can_access(g.current_user, data['service_id'], 'update'):
        return jsonify({'message': 'No update access to the target service'}), 403

    old_status = candidate.status
    candidate.first_name = data['firstName']
    candidate.last_name = data['lastName']
    candidate.email = data['email']
    candidate.phone = data['phone']
    candidate.country = data['country']
    candidate.status = data['status']
    candidate.service_id = data['service_id']
    created_at_raw = data.get('createdAt') or data.get('created_at')
    if created_at_raw:
        try:
            candidate.created_at = datetime.fromisoformat(created_at_raw.replace('Z', '+00:00'))
        except ValueError:
            pass
    candidate.note = data.get('note')
    candidate.type_equivalence = data.get('type_equivalence')
    if data['status'] == 'Terminé' and (not candidate.terminated_at):
        candidate.terminated_at = datetime.utcnow()
    if old_status == 'Terminé' and data['status'] != 'Terminé':
        candidate.terminated_at = None
    db.session.commit()
    return jsonify({'message': 'Candidat mis à jour'})

@app.route('/api/candidates/<int:id>', methods=['DELETE'])
@token_required
def delete_candidate(id):
    """
    Delete a candidate
    ---
    tags: [Candidates]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
    responses:
      200: {description: Candidate deleted}
      403: {description: No update access to this service}
    """
    candidate = Candidate.query.get_or_404(id)

    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    db.session.delete(candidate)
    db.session.commit()
    return jsonify({'message': 'Candidat supprimé'})

# ---------------------------------------------------------------------------
# PDFs
# ---------------------------------------------------------------------------
@app.route('/api/candidates/<int:candidate_id>/pdfs', methods=['POST'])
@token_required
def upload_pdf(candidate_id):
    """
    Upload a PDF for a candidate
    ---
    tags: [PDFs]
    security: [{Bearer: []}]
    consumes: [multipart/form-data]
    parameters:
      - in: path
        name: candidate_id
        type: integer
        required: true
      - in: formData
        name: file
        type: file
        required: true
    responses:
      201: {description: PDF uploaded}
      400: {description: Invalid file}
      403: {description: No update access to this service}
    """
    candidate = Candidate.query.get_or_404(candidate_id)
    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400

    if file and file.filename.lower().endswith('.pdf'):
        original_filename = secure_filename(file.filename)
        filename = f"{uuid.uuid4().hex}_{original_filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        pdf = CandidatePDF(
            filename=filename,
            original_filename=original_filename,
            candidate_id=candidate_id
        )
        db.session.add(pdf)
        db.session.commit()

        return jsonify({
            'id': pdf.id,
            'filename': pdf.filename,
            'original_filename': pdf.original_filename,
            'upload_date': pdf.upload_date.isoformat() if pdf.upload_date else None
        }), 201
    else:
        return jsonify({'error': 'Seuls les fichiers PDF sont autorisés'}), 400

@app.route('/api/pdfs/<int:pdf_id>', methods=['DELETE'])
@token_required
def delete_pdf(pdf_id):
    """
    Delete a PDF
    ---
    tags: [PDFs]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: pdf_id
        type: integer
        required: true
    responses:
      200: {description: PDF deleted}
      403: {description: No update access to this service}
    """
    pdf = CandidatePDF.query.get_or_404(pdf_id)
    candidate = Candidate.query.get_or_404(pdf.candidate_id)
    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.session.delete(pdf)
    db.session.commit()

    return jsonify({'message': 'PDF supprimé'})

@app.route('/api/pdfs/<int:pdf_id>/download', methods=['GET'])
@token_required
def download_pdf(pdf_id):
    """
    Download a PDF
    ---
    tags: [PDFs]
    security: [{Bearer: []}]
    produces: [application/pdf]
    parameters:
      - in: path
        name: pdf_id
        type: integer
        required: true
    responses:
      200: {description: The PDF file}
      403: {description: No access to this service}
      404: {description: File not found}
    """
    pdf = CandidatePDF.query.get_or_404(pdf_id)
    candidate = Candidate.query.get_or_404(pdf.candidate_id)
    if not user_can_access(g.current_user, candidate.service_id, 'view'):
        return jsonify({'message': 'No access to this service'}), 403

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf.filename)

    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True, download_name=pdf.original_filename)
    else:
        return jsonify({'error': 'Fichier non trouvé'}), 404

# ---------------------------------------------------------------------------
# Revenus
# ---------------------------------------------------------------------------
@app.route('/api/candidates/<int:candidate_id>/revenues', methods=['POST'])
@token_required
def add_revenue(candidate_id):
    """
    Add a revenue entry to a candidate
    ---
    tags: [Revenues]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: candidate_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            description: {type: string}
            amount: {type: integer}
            amountHT: {type: number}
            amountTTC: {type: number}
            tva: {type: number}
            date: {type: string}
    responses:
      201: {description: Revenue created}
      403: {description: No update access to this service}
    """
    candidate = Candidate.query.get_or_404(candidate_id)
    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    data = request.json or {}
    revenue = Revenue(
        description=data.get('description', ''),
        amount=normalize_required_int(data.get('amount'), 0),
        amountHT=normalize_optional_float(data.get('amountHT')),
        amountTTC=normalize_optional_float(data.get('amountTTC')),
        tva=normalize_optional_float(data.get('tva')),
        date=data.get('date', ''),
        candidate_id=candidate_id
    )
    db.session.add(revenue)
    db.session.commit()
    return jsonify({'id': revenue.id}), 201

@app.route('/api/revenues/<int:id>', methods=['PUT'])
@token_required
def update_revenue(id):
    """
    Update a revenue entry
    ---
    tags: [Revenues]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200: {description: Revenue updated}
      403: {description: No update access to this service}
    """
    revenue = Revenue.query.get_or_404(id)
    candidate = Candidate.query.get_or_404(revenue.candidate_id)
    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    data = request.json or {}
    revenue.description = data.get('description', '')
    revenue.amount = normalize_required_int(data.get('amount'), 0)
    revenue.amountHT = normalize_optional_float(data.get('amountHT'))
    revenue.amountTTC = normalize_optional_float(data.get('amountTTC'))
    revenue.tva = normalize_optional_float(data.get('tva'))
    revenue.date = data.get('date', '')
    db.session.commit()
    return jsonify({'message': 'Revenu mis à jour'})

@app.route('/api/revenues/<int:id>', methods=['DELETE'])
@token_required
def delete_revenue(id):
    """
    Delete a revenue entry
    ---
    tags: [Revenues]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
    responses:
      200: {description: Revenue deleted}
      403: {description: No update access to this service}
    """
    revenue = Revenue.query.get_or_404(id)
    candidate = Candidate.query.get_or_404(revenue.candidate_id)
    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    db.session.delete(revenue)
    db.session.commit()
    return jsonify({'message': 'Revenu supprimé'})

# ---------------------------------------------------------------------------
# Dépenses
# ---------------------------------------------------------------------------
@app.route('/api/candidates/<int:candidate_id>/expenses', methods=['POST'])
@token_required
def add_expense(candidate_id):
    """
    Add an expense entry to a candidate
    ---
    tags: [Expenses]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: candidate_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      201: {description: Expense created}
      403: {description: No update access to this service}
    """
    candidate = Candidate.query.get_or_404(candidate_id)
    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    data = request.json or {}
    expense = Expense(
        description=data.get('description', ''),
        amount=normalize_required_int(data.get('amount'), 0),
        amountHT=normalize_optional_float(data.get('amountHT')),
        amountTTC=normalize_optional_float(data.get('amountTTC')),
        tva=normalize_optional_float(data.get('tva')),
        date=data.get('date', ''),
        candidate_id=candidate_id
    )
    db.session.add(expense)
    db.session.commit()
    return jsonify({'id': expense.id}), 201

@app.route('/api/expenses/<int:id>', methods=['PUT'])
@token_required
def update_expense(id):
    """
    Update an expense entry
    ---
    tags: [Expenses]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200: {description: Expense updated}
      403: {description: No update access to this service}
    """
    expense = Expense.query.get_or_404(id)
    candidate = Candidate.query.get_or_404(expense.candidate_id)
    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    data = request.json or {}
    expense.description = data.get('description', '')
    expense.amount = normalize_required_int(data.get('amount'), 0)
    expense.amountHT = normalize_optional_float(data.get('amountHT'))
    expense.amountTTC = normalize_optional_float(data.get('amountTTC'))
    expense.tva = normalize_optional_float(data.get('tva'))
    expense.date = data.get('date', '')
    db.session.commit()
    return jsonify({'message': 'Dépense mise à jour'})

@app.route('/api/expenses/<int:id>', methods=['DELETE'])
@token_required
def delete_expense(id):
    """
    Delete an expense entry
    ---
    tags: [Expenses]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
    responses:
      200: {description: Expense deleted}
      403: {description: No update access to this service}
    """
    expense = Expense.query.get_or_404(id)
    candidate = Candidate.query.get_or_404(expense.candidate_id)
    if not user_can_access(g.current_user, candidate.service_id, 'update'):
        return jsonify({'message': 'No update access to this service'}), 403

    db.session.delete(expense)
    db.session.commit()
    return jsonify({'message': 'Dépense supprimée'})

# ---------------------------------------------------------------------------
# Dépenses générales (hors services) — admin only
# ---------------------------------------------------------------------------
@app.route('/api/general-expenses', methods=['GET'])
@app.route('/api/general-expenses/', methods=['GET'])
@app.route('/api/general_expenses', methods=['GET'])
@token_required
@admin_required
def get_general_expenses():
    """
    List general (company-wide) expenses (admin only)
    ---
    tags: [General Expenses]
    security: [{Bearer: []}]
    responses:
      200: {description: List of general expenses}
    """
    general_expenses = GeneralExpense.query.order_by(GeneralExpense.date.desc(), GeneralExpense.id.desc()).all()
    return jsonify([{
        'id': item.id,
        'description': item.description,
        'amount': item.amount,
        'amountHT': item.amountHT,
        'amountTTC': item.amountTTC,
        'tva': item.tva,
        'date': item.date,
        'createdAt': item.created_at.isoformat() if item.created_at else None,
    } for item in general_expenses])

@app.route('/api/general-expenses', methods=['POST'])
@app.route('/api/general-expenses/', methods=['POST'])
@app.route('/api/general_expenses', methods=['POST'])
@token_required
@admin_required
def add_general_expense():
    """
    Add a general expense (admin only)
    ---
    tags: [General Expenses]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      201: {description: General expense created}
    """
    data = request.json or {}
    item = GeneralExpense(
        description=data.get('description', ''),
        amount=normalize_required_int(data.get('amount'), 0),
        amountHT=normalize_optional_float(data.get('amountHT')),
        amountTTC=normalize_optional_float(data.get('amountTTC')),
        tva=normalize_optional_float(data.get('tva')),
        date=data.get('date', ''),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'id': item.id}), 201

@app.route('/api/general-expenses/<int:id>', methods=['PUT'])
@app.route('/api/general-expenses/<int:id>/', methods=['PUT'])
@app.route('/api/general_expenses/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_general_expense(id):
    """
    Update a general expense (admin only)
    ---
    tags: [General Expenses]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200: {description: General expense updated}
    """
    item = GeneralExpense.query.get_or_404(id)
    data = request.json or {}
    item.description = data.get('description', '')
    item.amount = normalize_required_int(data.get('amount'), 0)
    item.amountHT = normalize_optional_float(data.get('amountHT'))
    item.amountTTC = normalize_optional_float(data.get('amountTTC'))
    item.tva = normalize_optional_float(data.get('tva'))
    item.date = data.get('date', '')
    db.session.commit()
    return jsonify({'message': 'Dépense générale mise à jour'})

@app.route('/api/general-expenses/<int:id>', methods=['DELETE'])
@app.route('/api/general-expenses/<int:id>/', methods=['DELETE'])
@app.route('/api/general_expenses/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_general_expense(id):
    """
    Delete a general expense (admin only)
    ---
    tags: [General Expenses]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: id
        type: integer
        required: true
    responses:
      200: {description: General expense deleted}
    """
    item = GeneralExpense.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Dépense générale supprimée'})

# ---------------------------------------------------------------------------
# Dashboard — admin only
# ---------------------------------------------------------------------------
@app.route('/api/dashboard', methods=['GET'])
@token_required
@admin_required
def get_dashboard_stats():
    """
    Get aggregated dashboard statistics (admin only)
    ---
    tags: [Dashboard]
    security: [{Bearer: []}]
    responses:
      200: {description: Dashboard statistics}
      403: {description: Admin access required}
    """
    selected_year = request.args.get('year', type=int)
    selected_month = request.args.get('month', type=int)

    services = Service.query.all()
    candidates = Candidate.query.all()
    general_expenses = GeneralExpense.query.all()

    def matches_period(date_value):
        if selected_year is None and selected_month is None:
            return True
        if date_value in (None, ""):
            return False

        try:
            if hasattr(date_value, 'year'):
                dt = date_value
            else:
                dt = datetime.fromisoformat(str(date_value).replace('Z', '+00:00'))
        except ValueError:
            try:
                dt = datetime.strptime(str(date_value), '%Y-%m-%d')
            except ValueError:
                return False

        if selected_year is not None and dt.year != selected_year:
            return False
        if selected_month is not None and dt.month != selected_month:
            return False
        return True

    if selected_year is not None or selected_month is not None:
        candidates = [
            candidate for candidate in candidates
            if candidate.created_at and matches_period(candidate.created_at)
        ]
        general_expenses = [
            item for item in general_expenses
            if matches_period(item.date)
        ]

    def calculate_ht_value(item):
        if item.amountHT is not None:
            return float(item.amountHT)
        elif item.amountTTC is not None:
            tva = float(item.tva or 0)
            amountTTC = float(item.amountTTC)
            if tva > 0:
                return amountTTC / (1 + tva / 100)
            else:
                return amountTTC
        else:
            return float(item.amount or 0)

    def calculate_ttc_value(item):
        if item.amountTTC is not None:
            return float(item.amountTTC)
        elif item.amountHT is not None:
            tva = float(item.tva or 0)
            amountHT = float(item.amountHT)
            return amountHT * (1 + tva / 100)
        else:
            return float(item.amount or 0)

    service_stats = []
    for service in services:
        service_candidates = [candidate for candidate in candidates if candidate.service_id == service.id]

        def date_matches_item(item):
            if selected_year is None and selected_month is None:
                return True
            return matches_period(item.date if hasattr(item, 'date') else item.created_at)

        revenueHT = sum(
            sum(calculate_ht_value(revenue) for revenue in candidate.revenues if date_matches_item(revenue))
            for candidate in service_candidates
        )
        revenueTTC = sum(
            sum(calculate_ttc_value(revenue) for revenue in candidate.revenues if date_matches_item(revenue))
            for candidate in service_candidates
        )
        expensesHT = sum(
            sum(calculate_ht_value(expense) for expense in candidate.expenses if date_matches_item(expense))
            for candidate in service_candidates
        )
        expensesTTC = sum(
            sum(calculate_ttc_value(expense) for expense in candidate.expenses if date_matches_item(expense))
            for candidate in service_candidates
        )

        service_stats.append({
            'serviceName': service.name,
            'candidateCount': len(service_candidates),
            'revenueHT': revenueHT,
            'revenueTTC': revenueTTC,
            'expensesHT': expensesHT,
            'expensesTTC': expensesTTC,
        })

    total_revenue_ht = sum(stat['revenueHT'] for stat in service_stats)
    total_revenue_ttc = sum(stat['revenueTTC'] for stat in service_stats)

    general_expenses_ht = sum(calculate_ht_value(item) for item in general_expenses)
    general_expenses_ttc = sum(calculate_ttc_value(item) for item in general_expenses)

    total_expenses_ht = sum(stat['expensesHT'] for stat in service_stats) + general_expenses_ht
    total_expenses_ttc = sum(stat['expensesTTC'] for stat in service_stats) + general_expenses_ttc

    return jsonify({
        'totalCandidates': len(candidates),
        'totalServices': len(services),
        'totalRevenueHT': total_revenue_ht,
        'totalRevenue': total_revenue_ttc,
        'totalExpensesHT': total_expenses_ht,
        'totalExpenses': total_expenses_ttc,
        'serviceStats': service_stats,
    })

@app.route("/api/data", methods=["GET"])
def get_data():
    """
    Sample data endpoint
    ---
    tags: [Misc]
    responses:
      200: {description: Sample data}
    """
    return {"data": [1, 2, 3]}

@app.route("/")
def home():
    """
    Health check
    ---
    tags: [Misc]
    responses:
      200: {description: Backend is alive}
    """
    return {"message": "Backend is live!"}

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.route('/api/login', methods=['OPTIONS'])
def login_options():
    return make_cors_preflight_response()


@app.route('/api/login', methods=['POST'])
@cross_origin(origins=local_origins, supports_credentials=True)
def login():
    """
    Log in and receive a JWT
    ---
    tags: [Auth]
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
    responses:
      200:
        description: Login successful, returns token/role/permissions
      401:
        description: Invalid username or password
    """
    data = request.json
    username = data.get('username')
    password = data.get('password')
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        token = generate_token(user)
        return jsonify({
            'token': token,
            'username': user.username,
            'role': user.role,
            'permissions': get_permissions(user),
        }), 200
    return jsonify({'message': 'Invalid username or password'}), 401

@app.route('/api/change-password', methods=['OPTIONS'])
def change_password_options():
    return make_cors_preflight_response()


@app.route('/api/change-password', methods=['POST'])
@cross_origin(origins=local_origins, supports_credentials=True)
@token_required
def change_password():
    """
    Change your own password
    ---
    tags: [Auth]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [current_password, new_password]
          properties:
            current_password: {type: string}
            new_password: {type: string}
    responses:
      200: {description: Password changed}
      401: {description: Current password is incorrect}
    """
    data = request.json or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    if not current_password or not new_password:
        return jsonify({'message': 'Missing fields'}), 400

    user = g.current_user
    if not check_password_hash(user.password_hash, current_password):
        return jsonify({'message': 'Current password is incorrect'}), 401

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({'message': 'Password changed successfully'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug, port=port, host='0.0.0.0')
