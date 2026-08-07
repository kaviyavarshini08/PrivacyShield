import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)

def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """
    Dispatches a password reset email via SMTP (e.g. Gmail SMTP) if credentials are provided in .env.
    Otherwise prints simulation details to logs.
    """
    subject = "PrivacyShield - Password Reset Request"
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px;">
        <div style="max-width: 500px; margin: auto; background-color: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
          <h2 style="color: #38bdf8;">PrivacyShield Password Reset</h2>
          <p>You requested a password reset for your PrivacyShield Enterprise account (<strong>{to_email}</strong>).</p>
          <p>Click the link below to set your new database password (valid for 15 minutes):</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="{reset_url}" style="background-color: #0f766e; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">If you did not request this, please ignore this email.</p>
        </div>
      </body>
    </html>
    """

    # Check if SMTP credentials are configured
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(msg["From"], [to_email], msg.as_string())
            
            logger.info(f"Password reset email sent to {to_email} via SMTP ({settings.SMTP_SERVER})")
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {str(e)}")
            return False
    else:
        logger.info(f"[EMAIL SIMULATION MODE] Password reset link for {to_email}: {reset_url}")
        print(f"\n==========================================")
        print(f"[SMTP SIMULATOR] To: {to_email}")
        print(f"[SMTP SIMULATOR] Subject: {subject}")
        print(f"[SMTP SIMULATOR] Link: {reset_url}")
        print(f"==========================================\n")
        return True
