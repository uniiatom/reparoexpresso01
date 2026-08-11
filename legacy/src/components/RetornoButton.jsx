import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RetornoButton({ step, needsRegister, onPrevStep }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (step > (needsRegister ? 0 : 1)) {
      onPrevStep();
    } else {
      navigate('/');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="p-2 hover:bg-accent rounded-xl"
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
}