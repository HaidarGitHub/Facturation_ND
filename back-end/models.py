# backend/models.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    candidates = db.relationship('Candidate', backref='service', lazy=True)

class Candidate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    country = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="En cours")
    service_id = db.Column(db.Integer, db.ForeignKey('service.id'), nullable=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    creator = db.relationship('User', foreign_keys=[created_by_user_id], backref='created_candidates')
    type_equivalence = db.Column(db.String(120), nullable=True)
    revenues = db.relationship('Revenue', backref='candidate', lazy=True, cascade="all, delete-orphan")
    expenses = db.relationship('Expense', backref='candidate', lazy=True, cascade="all, delete-orphan")
    pdfs = db.relationship('CandidatePDF', backref='candidate', lazy=True, cascade="all, delete-orphan")
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    note = db.Column(db.Text, nullable=True)
    terminated_at = db.Column(db.DateTime, nullable=True)

class CandidatePDF(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.DateTime, nullable=False, default=db.func.now())
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)

class Revenue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    amountHT = db.Column(db.Float, nullable=True)
    amountTTC = db.Column(db.Float, nullable=True)
    tva = db.Column(db.Float, nullable=True)
    date = db.Column(db.String(10), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    amountHT = db.Column(db.Float, nullable=True)
    amountTTC = db.Column(db.Float, nullable=True)
    tva = db.Column(db.Float, nullable=True)
    date = db.Column(db.String(10), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)

class GeneralExpense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    amountHT = db.Column(db.Float, nullable=True)
    amountTTC = db.Column(db.Float, nullable=True)
    tva = db.Column(db.Float, nullable=True)
    date = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # 'admin' or 'user'
    # JSON string, e.g. {"1": {"view": true, "update": false}, "3": {"view": true, "update": true}}
    # Keys are Service.id. Ignored entirely for admins (they get full access).
    allowed_service_ids = db.Column(db.Text, nullable=False, default='{}')


