
import React from 'react';

interface DataSourceIconProps {
  type: string;
  className?: string;
}

export const DataSourceIcon: React.FC<DataSourceIconProps> = ({ type, className = "h-5 w-5" }) => {
  switch (type?.toLowerCase()) {
    case 'postgresql':
    case 'postgres':
      return (
        <img 
          src="/images/postgres-logo.png" 
          alt="PostgreSQL" 
          className={className}
        />
      );
    case 'mysql':
      return (
        <div className={`${className} bg-orange-600 rounded flex items-center justify-center`}>
          <span className="text-white font-bold text-xs">My</span>
        </div>
      );
    case 'minio':
      return (
        <img 
          src="/images/minio-logo.png" 
          alt="MinIO" 
          className={className}
        />
      );
    case 'sqlserver':
      return (
        <div className={`${className} bg-purple-600 rounded flex items-center justify-center`}>
          <span className="text-white font-bold text-xs">SQL</span>
        </div>
      );
    case 'oracle':
      return (
        <div className={`${className} bg-red-600 rounded flex items-center justify-center`}>
          <span className="text-white font-bold text-xs">OR</span>
        </div>
      );
    default:
      return (
        <div className={`${className} bg-gray-600 rounded flex items-center justify-center`}>
          <span className="text-white font-bold text-xs">DB</span>
        </div>
      );
  }
};
