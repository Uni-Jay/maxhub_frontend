import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/auth/forgot-password', { replace: true });
  }, [navigate]);
  return null;
}
