import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';
import { HomeIcon } from '@heroicons/react/24/outline';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full">
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={
          <Button 
            type="primary" 
            icon={<HomeIcon className="w-4 h-4" />}
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </Button>
        }
      />
    </div>
  );
}
