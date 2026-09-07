import React from 'react';
import { ChevronDown, Upload } from 'lucide-react';
import './Header.css';

export function Header({ onUpload }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand">
          <span className="brand-logo">Lingocare</span>
        </div>
        <div className="divider"></div>
        <div className="breadcrumbs">
          <span className="breadcrumb-item">Programs</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">Program 1</span>
        </div>
      </div>
      
      <div className="header-right">
        <div className="save-status">
          <div className="status-dot"></div>
          <span>Saved 2m ago</span>
        </div>
        
        <button className="btn-upload" onClick={onUpload}>
          <Upload size={16} />
          Upload Curriculum
        </button>
        
        <div className="user-avatar">
          KN
        </div>
        <ChevronDown size={16} className="profile-chevron" />
      </div>
    </header>
  );
}
