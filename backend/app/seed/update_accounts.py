from app.db.session import SessionLocal
from app.db.models import User, BrandAsset, ContentSubmission, ApprovalDecision, Comment
from app.core.security import hash_password

def update_accounts():
    db = SessionLocal()
    try:
        DEMO_USERS = [{'id': 'usr-admin-01', 'email': 'alfred@apexdynamics.example', 'full_name': 'Alfred Biju', 'role': 'ADMIN', 'password': 'Password123!'}, {'id': 'usr-manager-01', 'email': 'sebin@apexdynamics.example', 'full_name': 'Sebin Sabu', 'role': 'BRAND_MANAGER', 'password': 'Password123!'}, {'id': 'usr-reviewer-01', 'email': 'albert@apexdynamics.example', 'full_name': 'Albert Biju', 'role': 'AUTHORISED_REVIEWER', 'password': 'Password123!'}, {'id': 'usr-creator-01', 'email': 'adhithya@apexdynamics.example', 'full_name': 'Adhithya Biju', 'role': 'CREATOR', 'password': 'Password123!'}, {'id': 'usr-approver-01', 'email': 'biju@apexdynamics.example', 'full_name': 'Biju', 'role': 'APPROVER', 'password': 'Password123!'}]
        allowed_ids = [u['id'] for u in DEMO_USERS]
        workspace_id = 'ws-apexdynamics-001'
        for u in DEMO_USERS:
            user = db.query(User).filter(User.id == u['id']).first()
            if not user:
                user = User(id=u['id'], workspace_id=workspace_id, email=u['email'], full_name=u['full_name'], role=u['role'], hashed_password=hash_password(u['password']), is_active=True)
                db.add(user)
            else:
                user.email = u['email']
                user.full_name = u['full_name']
                user.role = u['role']
                user.hashed_password = hash_password(u['password'])
                user.is_active = True
        db.flush()
        db.query(BrandAsset).filter(~BrandAsset.uploader_id.in_(allowed_ids)).update({'uploader_id': 'usr-admin-01'}, synchronize_session=False)
        db.query(BrandAsset).filter(BrandAsset.approved_by_id.isnot(None), ~BrandAsset.approved_by_id.in_(allowed_ids)).update({'approved_by_id': 'usr-approver-01'}, synchronize_session=False)
        db.query(ContentSubmission).filter(~ContentSubmission.creator_id.in_(allowed_ids)).update({'creator_id': 'usr-creator-01'}, synchronize_session=False)
        db.query(ApprovalDecision).filter(~ApprovalDecision.approver_id.in_(allowed_ids)).update({'approver_id': 'usr-approver-01'}, synchronize_session=False)
        db.query(Comment).filter(~Comment.author_id.in_(allowed_ids)).update({'author_id': 'usr-creator-01'}, synchronize_session=False)
        db.flush()
        deleted_count = db.query(User).filter(~User.id.in_(allowed_ids)).delete(synchronize_session=False)
        db.commit()
        remaining = db.query(User).all()
        print(f'Successfully deleted {deleted_count} other accounts.')
        print('Remaining accounts in database:')
        for r in remaining:
            print(f' - {r.id}: {r.full_name} | Role: {r.role} | Email: {r.email}')
    except Exception as e:
        db.rollback()
        print(f'Error updating accounts: {e}')
        raise e
    finally:
        db.close()
if __name__ == '__main__':
    update_accounts()
